import { supabase } from '../config/supabase';
import type { ArticleRecord, NewsStats, Stance } from '../types/news';
import { toFixedPercent } from '../utils/math';
import { chunkText, normalizeWhitespace } from '../utils/text';
import { analyzeArticle, createEmbedding, summarizeSentimentReasons, summarizeStats } from './aiService';
import { collectArticles, collectNewsLinks, fetchArticleContentByUrl } from './crawlingService';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

interface AnalyzeResult {
  keyword: string;
  total: number;
  articles: ArticleRecord[];
}

interface RecentNewsResult {
  total: number;
  limit: number;
  has_more: boolean;
  next_cursor_created_at: string | null;
  next_cursor_id: string | null;
  articles: ArticleRecord[];
}

interface AnalyzeNewsOptions {
  targetCount?: number;
  publishedAfter?: Date;
}

interface ManualAnalyzeInput {
  userId: string;
  input: string;
}

interface SimilarArticleRecord extends ArticleRecord {
  match_percent: number;
}

interface ManualAnalyzeResult {
  keyword: string;
  article: ArticleRecord;
  similar_articles: SimilarArticleRecord[];
  stats: NewsStats;
}

interface UserAnalysisHistoryRow {
  id: string;
  user_id: string;
  keyword: string;
  title: string;
  content: string;
  url: string;
  source: string;
  stance: Stance;
  similarity_score: number;
  evidence: string;
  summary: string;
  input_type: 'url' | 'content';
  input_text: string;
  created_at?: string;
}

const MANUAL_URL_PREFIX = 'manual://entry/';

export class LinkAccessBlockedError extends Error {
  constructor(message = '링크 본문 접근이 차단되어 분석할 수 없습니다. 본문을 직접 붙여서 다시 시도해 주세요.') {
    super(message);
    this.name = 'LinkAccessBlockedError';
  }
}

async function getExistingUrlSet(urls: string[]): Promise<Set<string>> {
  if (urls.length === 0) {
    return new Set<string>();
  }

  const { data, error } = await supabase
    .from('articles')
    .select('url')
    .in('url', urls);

  if (error) {
    throw error;
  }

  const set = new Set<string>();
  for (const row of data ?? []) {
    const value = String((row as { url?: string }).url ?? '').trim();
    if (value) {
      set.add(value);
    }
  }

  return set;
}

function parseSource(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '출처 미상';
  }
}

export async function analyzeNewsByKeyword(keyword: string, options?: AnalyzeNewsOptions): Promise<AnalyzeResult> {
  const targetCount = Math.max(1, Math.min(500, options?.targetCount ?? 100));
  const linkTargetCount = Math.max(targetCount, Math.min(500, targetCount * 4));
  const links = await collectNewsLinks(keyword, {
    targetCount: linkTargetCount,
    publishedAfter: options?.publishedAfter,
  });

  const existingUrls = await getExistingUrlSet(links.map((item) => item.url));

  const crawled = await collectArticles(keyword, {
    targetCount,
    publishedAfter: options?.publishedAfter,
    existingUrls,
    prefetchedLinks: links,
  });

  const analyzed: ArticleRecord[] = [];

  for (const item of crawled) {
    const result = await analyzeArticle(keyword, item.title, item.content);

    analyzed.push({
      id: generateId(),
      keyword,
      title: item.title,
      content: item.content,
      url: item.url,
      stance: result.stance,
      similarity_score: result.aggroIndex,
      evidence: result.evidence,
      summary: result.summary,
      source: item.source ?? parseSource(item.url),
      aggro_reason: result.evidence,
      published_at: item.publishedAt,
    });
  }

  const persisted = await upsertArticles(analyzed);
  await saveArticleEmbeddings(persisted);

  return {
    keyword,
    total: persisted.length,
    articles: persisted,
  };
}

function createManualUrl(): string {
  return `${MANUAL_URL_PREFIX}${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function looksLikeUrl(input: string): boolean {
  try {
    const url = new URL(input);
    return Boolean(url.protocol && url.hostname);
  } catch {
    return false;
  }
}

const KEYWORD_STOPWORDS = new Set([
  '그리고', '그러나', '하지만', '대한', '관련', '에서', '으로', '했다', '한다', '위해', '대한민국',
  '뉴스', '기사', '정부', '정책', '오늘', '이번', 'the', 'and', 'with', 'that', 'this', 'from', 'have',
]);

function extractKeywordFromText(text: string): string {
  const tokens = text.match(/[0-9A-Za-z가-힣]{2,}/g) ?? [];
  const counts = new Map<string, number>();

  for (const token of tokens) {
    const normalized = token.toLowerCase();
    if (KEYWORD_STOPWORDS.has(normalized)) {
      continue;
    }

    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  let best = '';
  let bestCount = 0;
  for (const [token, count] of counts.entries()) {
    if (count > bestCount) {
      best = token;
      bestCount = count;
    }
  }

  return best || '직접분석';
}

function mapHistoryRowToArticle(row: UserAnalysisHistoryRow): ArticleRecord {
  return {
    id: row.id,
    keyword: row.keyword,
    title: row.title,
    content: row.content,
    url: row.url,
    source: row.source,
    stance: row.stance,
    similarity_score: row.similarity_score,
    evidence: row.evidence,
    summary: row.summary,
    aggro_reason: row.evidence,
    created_at: row.created_at,
  };
}

function inferTitleFromContent(content: string): string {
  const plain = normalizeWhitespace(content);
  if (!plain) {
    return '사용자 입력 기사';
  }

  const sentence = plain.split(/(?<=[.!?])\s+/)[0]?.trim() ?? plain;
  return sentence.slice(0, 80);
}

function normalizeTokenSet(text: string): Set<string> {
  const tokens = text.match(/[0-9A-Za-z가-힣]{2,}/g) ?? [];
  return new Set(tokens.map((token) => token.toLowerCase()));
}

function computeSimilarityPercent(baseText: string, candidateText: string): number {
  const a = normalizeTokenSet(baseText);
  const b = normalizeTokenSet(candidateText);

  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of a) {
    if (b.has(token)) {
      overlap += 1;
    }
  }

  const precision = overlap / a.size;
  const recall = overlap / b.size;
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return Math.round(Math.max(0, Math.min(100, f1 * 100)));
}

async function findSimilarArticles(
  keyword: string,
  title: string,
  content: string,
  userId: string,
  excludeHistoryId: string,
): Promise<SimilarArticleRecord[]> {
  let articleRows: ArticleRecord[] = [];

  let data: unknown[] | null = null;
  let error: unknown = null;

  ({ data, error } = await supabase
    .from('articles')
    .select('id,keyword,title,content,url,stance,similarity_score,source,evidence,aggro_reason,published_at,created_at')
    .ilike('keyword', `%${keyword}%`)
    .order('created_at', { ascending: false })
    .limit(350));

  const errorText = error ? JSON.stringify(error) : '';
  if (error && (errorText.includes('source') || errorText.includes('evidence'))) {
    ({ data, error } = await supabase
      .from('articles')
      .select('id,keyword,title,content,url,stance,similarity_score,aggro_reason,published_at,created_at')
      .ilike('keyword', `%${keyword}%`)
      .order('created_at', { ascending: false })
      .limit(350));
  }

  if (!error) {
    articleRows = ((data ?? []) as ArticleRecord[]).map((row) => ({
      ...row,
      evidence: row.evidence ?? row.aggro_reason,
      source: row.source ?? parseSource(row.url),
    }));
  }

  const { data: historyData, error: historyError } = await supabase
    .from('user_analysis_records')
    .select('id,user_id,keyword,title,content,url,source,stance,similarity_score,evidence,summary,input_type,input_text,created_at')
    .eq('user_id', userId)
    .neq('id', excludeHistoryId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (historyError) {
    throw historyError;
  }

  const historyRows = ((historyData ?? []) as UserAnalysisHistoryRow[]).map(mapHistoryRowToArticle);

  const baseText = `${title} ${content}`;
  const candidatesMap = new Map<string, ArticleRecord>();

  for (const row of articleRows) {
    candidatesMap.set(`article:${row.id}`, row);
  }

  for (const row of historyRows) {
    candidatesMap.set(`history:${row.id}`, row);
  }

  const candidates = Array.from(candidatesMap.values());

  const scored = candidates
    .map((row) => {
      const candidateText = `${row.title} ${row.content ?? ''}`;
      const matchPercent = computeSimilarityPercent(baseText, candidateText);
      return {
        ...row,
        evidence: row.evidence ?? row.aggro_reason,
        source: row.source ?? parseSource(row.url),
        match_percent: matchPercent,
      };
    })
    .filter((row) => row.match_percent >= 12)
    .sort((a, b) => b.match_percent - a.match_percent);

  return scored;
}

export async function analyzeManualArticle(input: ManualAnalyzeInput): Promise<ManualAnalyzeResult> {
  const userId = normalizeWhitespace(String(input.userId ?? ''));
  const rawInput = normalizeWhitespace(String(input.input ?? ''));

  if (!userId) {
    throw new Error('user_id는 필수입니다.');
  }

  if (!rawInput) {
    throw new Error('분석할 링크 또는 본문을 입력해 주세요.');
  }

  const isUrlInput = looksLikeUrl(rawInput);
  const urlRaw = isUrlInput ? rawInput : '';
  const contentRaw = isUrlInput ? '' : rawInput;

  let resolvedContent = contentRaw;
  let resolvedUrl = urlRaw || createManualUrl();

  if (!resolvedContent && urlRaw) {
    try {
      resolvedContent = normalizeWhitespace(await fetchArticleContentByUrl(urlRaw));
    } catch {
      throw new LinkAccessBlockedError(
        '링크가 AI 접근을 막아 본문을 가져오지 못했습니다. 기사 본문을 직접 붙여서 분석해 주세요.',
      );
    }
  }

  if (resolvedContent.length < 60) {
    if (urlRaw) {
      throw new LinkAccessBlockedError(
        '링크에서 본문 추출이 충분하지 않아 분석할 수 없습니다. 링크가 AI 접근을 막고 있을 수 있습니다. 기사 본문을 붙여 주세요.',
      );
    }
    throw new Error('본문 길이가 너무 짧아 분석할 수 없습니다. 최소 60자 이상 입력해 주세요.');
  }

  const resolvedTitle = urlRaw ? `사용자 링크 기사 (${parseSource(resolvedUrl)})` : inferTitleFromContent(resolvedContent);
  const source = urlRaw ? parseSource(resolvedUrl) : 'manual-input';
  const keyword = extractKeywordFromText(`${resolvedTitle} ${resolvedContent.slice(0, 1800)}`);

  const analyzed = await analyzeArticle(keyword, resolvedTitle, resolvedContent);

  const historyPayload = {
    id: generateId(),
    user_id: userId,
    keyword,
    title: resolvedTitle,
    content: resolvedContent,
    url: resolvedUrl,
    source,
    stance: analyzed.stance,
    similarity_score: analyzed.aggroIndex,
    evidence: analyzed.evidence,
    summary: analyzed.summary,
    input_type: urlRaw ? 'url' : 'content',
    input_text: rawInput,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('user_analysis_records')
    .insert(historyPayload)
    .select('id,user_id,keyword,title,content,url,source,stance,similarity_score,evidence,summary,input_type,input_text,created_at')
    .single();

  if (insertError) {
    throw insertError;
  }

  const article = mapHistoryRowToArticle(inserted as UserAnalysisHistoryRow);
  const similarArticles = await findSimilarArticles(keyword, article.title, article.content, userId, article.id);
  const stats = await getStatsByKeyword(keyword);

  return {
    keyword,
    article,
    similar_articles: similarArticles,
    stats,
  };
}

export async function getUserAnalysisHistory(userId: string, limit = 50): Promise<ArticleRecord[]> {
  const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)));

  const { data, error } = await supabase
    .from('user_analysis_records')
    .select('id,user_id,keyword,title,content,url,source,stance,similarity_score,evidence,summary,input_type,input_text,created_at')
    .eq('user_id', userId.trim())
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw error;
  }

  return ((data ?? []) as UserAnalysisHistoryRow[]).map(mapHistoryRowToArticle);
}

export async function clearUserAnalysisHistory(userId: string): Promise<void> {
  const value = userId.trim();
  if (!value) {
    throw new Error('user_id가 필요합니다.');
  }

  await supabase.from('user_analysis_records').delete().eq('user_id', value);
}

export async function getRecentAnalyzedNews(
  limit = 50,
  keyword?: string,
  cursorCreatedAt?: string,
  cursorId?: string,
): Promise<RecentNewsResult> {
  const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));
  const keywordValue = String(keyword ?? '').trim();
  const cursorCreatedAtValue = String(cursorCreatedAt ?? '').trim();
  const cursorIdValue = String(cursorId ?? '').trim();

  let data: unknown[] | null = null;
  let error: unknown = null;

  let query = supabase
    .from('articles')
    .select('id,keyword,title,url,stance,similarity_score,source,evidence,aggro_reason,published_at,created_at')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(safeLimit + 1);

  if (keywordValue) {
    query = query.or(`keyword.ilike.%${keywordValue}%,title.ilike.%${keywordValue}%`);
  }

  if (cursorCreatedAtValue && cursorIdValue) {
    // Keep keyset pagination stable while allowing keyword/title OR search in one request.
    query = query.lt('created_at', cursorCreatedAtValue);
  }

  ({ data, error } = await query);

  const errorText = error ? JSON.stringify(error) : '';
  if (error && (errorText.includes('source') || errorText.includes('evidence'))) {
    let fallbackQuery = supabase
      .from('articles')
      .select('id,keyword,title,url,stance,similarity_score,aggro_reason,published_at,created_at')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(safeLimit + 1);

    if (keywordValue) {
      fallbackQuery = fallbackQuery.or(`keyword.ilike.%${keywordValue}%,title.ilike.%${keywordValue}%`);
    }

    if (cursorCreatedAtValue && cursorIdValue) {
      fallbackQuery = fallbackQuery.lt('created_at', cursorCreatedAtValue);
    }

    ({ data, error } = await fallbackQuery);
  }

  if (error) {
    throw error;
  }

  const fetchedRows = (data ?? []) as ArticleRecord[];
  const hasMore = fetchedRows.length > safeLimit;
  const pageRows = hasMore ? fetchedRows.slice(0, safeLimit) : fetchedRows;

  const articles = pageRows.map((row) => ({
    ...row,
    content: row.content ?? '',
    evidence: row.evidence ?? row.aggro_reason,
    source: row.source ?? parseSource(row.url),
  }));

  const last = articles.length > 0 ? articles[articles.length - 1] : null;

  return {
    total: articles.length,
    limit: safeLimit,
    has_more: hasMore,
    next_cursor_created_at: hasMore ? (last?.created_at ?? null) : null,
    next_cursor_id: hasMore ? (last?.id ?? null) : null,
    articles,
  };
}

export async function getArticleById(articleId: string): Promise<ArticleRecord | null> {
  let data: unknown = null;
  let error: unknown = null;

  ({ data, error } = await supabase
    .from('articles')
    .select('id,keyword,title,content,url,stance,similarity_score,source,evidence,aggro_reason,published_at,created_at')
    .eq('id', articleId)
    .maybeSingle());

  const errorText = error ? JSON.stringify(error) : '';
  if (error && (errorText.includes('source') || errorText.includes('evidence'))) {
    ({ data, error } = await supabase
      .from('articles')
      .select('id,keyword,title,content,url,stance,similarity_score,aggro_reason,published_at,created_at')
      .eq('id', articleId)
      .maybeSingle());
  }

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const row = data as ArticleRecord;
  let content = String(row.content ?? '').trim();

  if (content.length < 60 && row.url) {
    try {
      const crawled = (await fetchArticleContentByUrl(row.url)).trim();
      if (crawled.length >= 60) {
        content = crawled;
        await supabase
          .from('articles')
          .update({ content: crawled })
          .eq('id', row.id);
      }
    } catch {
      // Keep existing content when recrawling fails.
    }
  }

  return {
    ...row,
    content,
    evidence: row.evidence ?? row.aggro_reason,
    source: row.source ?? parseSource(row.url),
  };
}

async function upsertArticles(rows: ArticleRecord[]): Promise<ArticleRecord[]> {
  if (rows.length === 0) {
    return [];
  }

  const urls = rows.map((row) => row.url);
  const { data: existingRows, error: existingError } = await supabase
    .from('articles')
    .select('id,url')
    .in('url', urls);

  if (existingError) {
    throw existingError;
  }

  const idByUrl = new Map<string, string>();
  for (const row of existingRows ?? []) {
    idByUrl.set(row.url as string, row.id as string);
  }

  const payload = rows.map((row) => ({
    id: idByUrl.get(row.url) ?? row.id,
    keyword: row.keyword,
    title: row.title,
    content: row.content,
    url: row.url,
    stance: row.stance,
    similarity_score: row.similarity_score,
    source: row.source ?? parseSource(row.url),
    evidence: row.evidence,
    aggro_reason: row.evidence ?? row.aggro_reason,
    published_at: row.published_at,
  }));

  let data: unknown[] | null = null;
  let error: unknown = null;

  ({ data, error } = await supabase
    .from('articles')
    .upsert(payload, { onConflict: 'id' })
    .select('id,keyword,title,content,url,stance,similarity_score,source,evidence,aggro_reason,published_at,created_at'));

  const upsertErrorText = error ? JSON.stringify(error) : '';
  if (error && (upsertErrorText.includes('source') || upsertErrorText.includes('evidence'))) {
    ({ data, error } = await supabase
      .from('articles')
      .upsert(
        payload.map(({ source: _source, evidence: _evidence, ...rest }) => rest),
        { onConflict: 'id' },
      )
      .select('id,keyword,title,content,url,stance,similarity_score,aggro_reason,published_at,created_at'));
  }

  if (error) {
    throw error;
  }

  return ((data ?? []) as ArticleRecord[]).map((row) => ({
    ...row,
    evidence: row.evidence ?? row.aggro_reason,
    source: row.source ?? parseSource(row.url),
  }));
}

async function saveArticleEmbeddings(articles: ArticleRecord[]): Promise<void> {
  for (const article of articles) {
    const chunks = chunkText(article.content, 1000).slice(0, 4);
    if (chunks.length === 0) {
      continue;
    }

    const payload: Array<{ id: string; article_id: string; chunk: string; embedding: number[] }> = [];
    for (const chunk of chunks) {
      const embedding = await createEmbedding(chunk);
      payload.push({
        id: generateId(),
        article_id: article.id,
        chunk,
        embedding,
      });
    }

    await supabase.from('article_embeddings').delete().eq('article_id', article.id);
    await supabase.from('article_embeddings').insert(payload);
  }
}

export async function getStatsByKeyword(keyword: string): Promise<NewsStats> {
  let data: unknown[] | null = null;
  let error: unknown = null;

  ({ data, error } = await supabase
    .from('articles')
    .select('id,title,url,source,stance,similarity_score,evidence,aggro_reason,published_at')
    .eq('keyword', keyword.trim()));

  const errorText = error ? JSON.stringify(error) : '';
  if (error && (errorText.includes('source') || errorText.includes('evidence'))) {
    ({ data, error } = await supabase
      .from('articles')
      .select('id,title,url,stance,similarity_score,aggro_reason,published_at')
      .eq('keyword', keyword.trim()));
  }

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Array<{
    id: string;
    title: string;
    url: string;
    source?: string;
    stance: string;
    similarity_score?: number;
    evidence?: string;
    aggro_reason?: string;
    published_at?: string;
  }>;

  const total = rows.length;
  const agreeCount = countStance(rows, '찬성');
  const opposeCount = countStance(rows, '반대');
  const neutralCount = countStance(rows, '중립');
  const unclassifiedCount = countStance(rows, '분류불가');

  const evidenceList = rows.map((row) => ({
    id: String((row as { id: string }).id),
    title: String((row as { title: string }).title),
    source: String((row as { source?: string }).source ?? parseSource(String((row as { url: string }).url))),
    stance: String((row as { stance: string }).stance) as Stance,
    evidence: String((row as { evidence?: string; aggro_reason?: string }).evidence ?? (row as { aggro_reason?: string }).aggro_reason ?? '분류 근거 정보가 없습니다.'),
    aggro_index: Number((row as { similarity_score?: number }).similarity_score ?? 0),
    published_at: (row as { published_at?: string }).published_at,
    url: String((row as { url: string }).url),
  }));

  const stats: NewsStats = {
    keyword,
    total_analyzed: total,
    total,
    agree_count: agreeCount,
    agree_percent: toFixedPercent(agreeCount, total),
    oppose_count: opposeCount,
    oppose_percent: toFixedPercent(opposeCount, total),
    neutral_count: neutralCount,
    neutral_percent: toFixedPercent(neutralCount, total),
    unclassified_count: unclassifiedCount,
    unclassified_percent: toFixedPercent(unclassifiedCount, total),
    statistics: {
      agree: { count: agreeCount, percent: toFixedPercent(agreeCount, total) },
      oppose: { count: opposeCount, percent: toFixedPercent(opposeCount, total) },
      neutral: { count: neutralCount, percent: toFixedPercent(neutralCount, total) },
      unclassified: { count: unclassifiedCount, percent: toFixedPercent(unclassifiedCount, total) },
    },
    evidence_list: evidenceList,
  };

  const binary = toBinarySentimentCounts(agreeCount, opposeCount, neutralCount, unclassifiedCount);
  const sentimentReasons = await summarizeSentimentReasons(keyword, evidenceList.map((item) => ({
    title: item.title,
    stance: item.stance,
    evidence: item.evidence,
  })));

  stats.sentiment = {
    positive: {
      count: binary.positive,
      percent: toFixedPercent(binary.positive, total),
      reason: sentimentReasons.positive,
    },
    negative: {
      count: binary.negative,
      percent: toFixedPercent(binary.negative, total),
      reason: sentimentReasons.negative,
    },
  };

  stats.stats = stats.statistics;
  stats.total_count = total;
  stats.percentages = {
    agree: stats.statistics.agree.percent,
    oppose: stats.statistics.oppose.percent,
    neutral: stats.statistics.neutral.percent,
  };
  stats.top_evidences = evidenceList.slice(0, 5).map((item) => ({
    source: item.source,
    stance: item.stance,
    reason: item.evidence,
  }));

  stats.analysis_report = await summarizeStats(keyword, stats);
  stats.ai_final_summary = stats.analysis_report;
  stats.summary = stats.analysis_report;
  return stats;
}

function countStance(rows: Array<{ stance: string }>, target: Stance): number {
  return rows.filter((row) => row.stance === target).length;
}

function toBinarySentimentCounts(
  agree: number,
  oppose: number,
  neutral: number,
  unclassified: number,
): { positive: number; negative: number } {
  const extra = neutral + unclassified;
  const total = agree + oppose + extra;

  if (total === 0) {
    return { positive: 0, negative: 0 };
  }

  // Keep stance counts (agree/oppose) as-is, and split uncertain rows evenly.
  const positive = agree + Math.round(extra / 2);
  return {
    positive,
    negative: Math.max(0, total - positive),
  };
}

export async function getArticleContentById(articleId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('articles')
    .select('content')
    .eq('id', articleId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data?.content as string | undefined) ?? null;
}
