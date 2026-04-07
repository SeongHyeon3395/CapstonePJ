import { supabase } from '../config/supabase';
import type { ArticleRecord, NewsStats, Stance } from '../types/news';
import { toFixedPercent } from '../utils/math';
import { chunkText } from '../utils/text';
import { calculateSimilarityScore, classifyStance, createEmbedding, summarizeStats } from './aiService';
import { collectArticles } from './crawlingService';

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

export async function analyzeNewsByKeyword(keyword: string): Promise<AnalyzeResult> {
  const crawled = await collectArticles(keyword);
  const analyzed: ArticleRecord[] = [];

  for (const item of crawled) {
    const [similarityScore, stance] = await Promise.all([
      calculateSimilarityScore(item.title, item.content),
      classifyStance(item.content, keyword),
    ]);

    analyzed.push({
      id: generateId(),
      keyword,
      title: item.title,
      content: item.content,
      url: item.url,
      stance,
      similarity_score: similarityScore,
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
  }));

  const { data, error } = await supabase
    .from('articles')
    .upsert(payload, { onConflict: 'id' })
    .select('id,keyword,title,content,url,stance,similarity_score,created_at');

  if (error) {
    throw error;
  }

  return (data ?? []) as ArticleRecord[];
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
  const { data, error } = await supabase
    .from('articles')
    .select('stance')
    .eq('keyword', keyword.trim());

  if (error) {
    throw error;
  }

  const total = data?.length ?? 0;
  const agreeCount = countStance(data ?? [], '찬성');
  const opposeCount = countStance(data ?? [], '반대');
  const neutralCount = countStance(data ?? [], '중립');

  const stats: NewsStats = {
    total,
    agree_count: agreeCount,
    agree_percent: toFixedPercent(agreeCount, total),
    oppose_count: opposeCount,
    oppose_percent: toFixedPercent(opposeCount, total),
    neutral_count: neutralCount,
    neutral_percent: toFixedPercent(neutralCount, total),
  };

  stats.summary = await summarizeStats(stats);
  return stats;
}

function countStance(rows: Array<{ stance: string }>, target: Stance): number {
  return rows.filter((row) => row.stance === target).length;
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
