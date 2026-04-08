"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeNewsByKeyword = analyzeNewsByKeyword;
exports.getStatsByKeyword = getStatsByKeyword;
exports.getArticleContentById = getArticleContentById;
const supabase_1 = require("../config/supabase");
const math_1 = require("../utils/math");
const text_1 = require("../utils/text");
const aiService_1 = require("./aiService");
const crawlingService_1 = require("./crawlingService");
function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
        const rand = Math.floor(Math.random() * 16);
        const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
        return value.toString(16);
    });
}
async function getExistingUrlSet(urls) {
    if (urls.length === 0) {
        return new Set();
    }
    const { data, error } = await supabase_1.supabase
        .from('articles')
        .select('url')
        .in('url', urls);
    if (error) {
        throw error;
    }
    const set = new Set();
    for (const row of data ?? []) {
        const value = String(row.url ?? '').trim();
        if (value) {
            set.add(value);
        }
    }
    return set;
}
function parseSource(url) {
    try {
        return new URL(url).hostname.replace('www.', '');
    }
    catch {
        return '출처 미상';
    }
}
async function analyzeNewsByKeyword(keyword, options) {
    const targetCount = Math.max(1, Math.min(500, options?.targetCount ?? 100));
    const linkTargetCount = Math.max(targetCount, Math.min(500, targetCount * 4));
    const links = await (0, crawlingService_1.collectNewsLinks)(keyword, {
        targetCount: linkTargetCount,
        publishedAfter: options?.publishedAfter,
    });
    const existingUrls = await getExistingUrlSet(links.map((item) => item.url));
    const crawled = await (0, crawlingService_1.collectArticles)(keyword, {
        targetCount,
        publishedAfter: options?.publishedAfter,
        existingUrls,
        prefetchedLinks: links,
    });
    const analyzed = [];
    for (const item of crawled) {
        const result = await (0, aiService_1.analyzeArticle)(keyword, item.title, item.content);
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
async function upsertArticles(rows) {
    if (rows.length === 0) {
        return [];
    }
    const urls = rows.map((row) => row.url);
    const { data: existingRows, error: existingError } = await supabase_1.supabase
        .from('articles')
        .select('id,url')
        .in('url', urls);
    if (existingError) {
        throw existingError;
    }
    const idByUrl = new Map();
    for (const row of existingRows ?? []) {
        idByUrl.set(row.url, row.id);
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
    let data = null;
    let error = null;
    ({ data, error } = await supabase_1.supabase
        .from('articles')
        .upsert(payload, { onConflict: 'id' })
        .select('id,keyword,title,content,url,stance,similarity_score,source,evidence,aggro_reason,published_at,created_at'));
    const upsertErrorText = error ? JSON.stringify(error) : '';
    if (error && (upsertErrorText.includes('source') || upsertErrorText.includes('evidence'))) {
        ({ data, error } = await supabase_1.supabase
            .from('articles')
            .upsert(payload.map(({ source: _source, evidence: _evidence, ...rest }) => rest), { onConflict: 'id' })
            .select('id,keyword,title,content,url,stance,similarity_score,aggro_reason,published_at,created_at'));
    }
    if (error) {
        throw error;
    }
    return (data ?? []).map((row) => ({
        ...row,
        evidence: row.evidence ?? row.aggro_reason,
        source: row.source ?? parseSource(row.url),
    }));
}
async function saveArticleEmbeddings(articles) {
    for (const article of articles) {
        const chunks = (0, text_1.chunkText)(article.content, 1000).slice(0, 4);
        if (chunks.length === 0) {
            continue;
        }
        const payload = [];
        for (const chunk of chunks) {
            const embedding = await (0, aiService_1.createEmbedding)(chunk);
            payload.push({
                id: generateId(),
                article_id: article.id,
                chunk,
                embedding,
            });
        }
        await supabase_1.supabase.from('article_embeddings').delete().eq('article_id', article.id);
        await supabase_1.supabase.from('article_embeddings').insert(payload);
    }
}
async function getStatsByKeyword(keyword) {
    let data = null;
    let error = null;
    ({ data, error } = await supabase_1.supabase
        .from('articles')
        .select('id,title,url,source,stance,similarity_score,evidence,aggro_reason,published_at')
        .eq('keyword', keyword.trim()));
    const errorText = error ? JSON.stringify(error) : '';
    if (error && (errorText.includes('source') || errorText.includes('evidence'))) {
        ({ data, error } = await supabase_1.supabase
            .from('articles')
            .select('id,title,url,stance,similarity_score,aggro_reason,published_at')
            .eq('keyword', keyword.trim()));
    }
    if (error) {
        throw error;
    }
    const rows = (data ?? []);
    const total = rows.length;
    const agreeCount = countStance(rows, '찬성');
    const opposeCount = countStance(rows, '반대');
    const neutralCount = countStance(rows, '중립');
    const unclassifiedCount = countStance(rows, '분류불가');
    const evidenceList = rows.map((row) => ({
        id: String(row.id),
        title: String(row.title),
        source: String(row.source ?? parseSource(String(row.url))),
        stance: String(row.stance),
        evidence: String(row.evidence ?? row.aggro_reason ?? '분류 근거 정보가 없습니다.'),
        aggro_index: Number(row.similarity_score ?? 0),
        published_at: row.published_at,
        url: String(row.url),
    }));
    const stats = {
        keyword,
        total_analyzed: total,
        total,
        agree_count: agreeCount,
        agree_percent: (0, math_1.toFixedPercent)(agreeCount, total),
        oppose_count: opposeCount,
        oppose_percent: (0, math_1.toFixedPercent)(opposeCount, total),
        neutral_count: neutralCount,
        neutral_percent: (0, math_1.toFixedPercent)(neutralCount, total),
        unclassified_count: unclassifiedCount,
        unclassified_percent: (0, math_1.toFixedPercent)(unclassifiedCount, total),
        statistics: {
            agree: { count: agreeCount, percent: (0, math_1.toFixedPercent)(agreeCount, total) },
            oppose: { count: opposeCount, percent: (0, math_1.toFixedPercent)(opposeCount, total) },
            neutral: { count: neutralCount, percent: (0, math_1.toFixedPercent)(neutralCount, total) },
            unclassified: { count: unclassifiedCount, percent: (0, math_1.toFixedPercent)(unclassifiedCount, total) },
        },
        evidence_list: evidenceList,
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
    stats.analysis_report = await (0, aiService_1.summarizeStats)(keyword, stats);
    stats.ai_final_summary = stats.analysis_report;
    stats.summary = stats.analysis_report;
    return stats;
}
function countStance(rows, target) {
    return rows.filter((row) => row.stance === target).length;
}
async function getArticleContentById(articleId) {
    const { data, error } = await supabase_1.supabase
        .from('articles')
        .select('content')
        .eq('id', articleId)
        .maybeSingle();
    if (error) {
        throw error;
    }
    return data?.content ?? null;
}
