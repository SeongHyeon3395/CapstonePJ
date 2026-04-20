"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchNaverNews = fetchNaverNews;
exports.fetchArticleContentByUrl = fetchArticleContentByUrl;
exports.collectArticles = collectArticles;
exports.collectNewsLinks = collectNewsLinks;
const axios_1 = __importDefault(require("axios"));
const readability_1 = require("@mozilla/readability");
const jsdom_1 = require("jsdom");
const env_1 = require("../config/env");
const naver_1 = require("../config/naver");
const text_1 = require("../utils/text");
function parsePressName(url) {
    try {
        const host = new URL(url).hostname.replace('www.', '');
        return host;
    }
    catch {
        return undefined;
    }
}
async function fetchNaverNews(keyword, display = 100, start = 1) {
    if (!env_1.env.hasNaverCredentials) {
        throw new Error('NAVER_CLIENT_ID/NAVER_CLIENT_SECRET가 설정되지 않아 뉴스 수집을 실행할 수 없습니다. backend/.env를 확인해 주세요.');
    }
    const { data } = await naver_1.naverApi.get('/news.json', {
        params: {
            query: keyword,
            display,
            start,
            sort: 'date',
        },
    });
    return data.items ?? [];
}
function parsePublishedDate(raw) {
    if (!raw) {
        return undefined;
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
        return undefined;
    }
    return parsed.toISOString();
}
function isAfterThreshold(dateIso, threshold) {
    if (!threshold || !dateIso) {
        return true;
    }
    return new Date(dateIso).getTime() >= threshold.getTime();
}
async function crawlArticleContent(url) {
    const { data } = await axios_1.default.get(url, {
        timeout: 8000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
        },
        responseType: 'text',
    });
    const dom = new jsdom_1.JSDOM(data, { url });
    const article = new readability_1.Readability(dom.window.document).parse();
    if (!article?.textContent) {
        return '';
    }
    return (0, text_1.normalizeWhitespace)(article.textContent);
}
async function fetchArticleContentByUrl(url) {
    return crawlArticleContent(url);
}
async function collectArticles(keyword, options) {
    const links = options?.prefetchedLinks ?? await collectNewsLinks(keyword, options);
    const results = [];
    for (const link of links) {
        if (options?.existingUrls?.has(link.url)) {
            continue;
        }
        try {
            const content = await crawlArticleContent(link.url);
            if (content.length < 60) {
                continue;
            }
            results.push({
                keyword,
                title: link.title,
                url: link.url,
                source: link.source,
                content,
                publishedAt: link.publishedAt,
            });
            if (results.length >= Math.max(1, Math.min(500, options?.targetCount ?? 100))) {
                break;
            }
        }
        catch {
            continue;
        }
    }
    return results;
}
async function collectNewsLinks(keyword, options) {
    const targetCount = Math.max(1, Math.min(500, options?.targetCount ?? 100));
    const maxPages = Math.ceil(targetCount / 100);
    const unique = new Map();
    for (let page = 0; page < maxPages; page += 1) {
        const start = page * 100 + 1;
        const items = await fetchNaverNews(keyword, 100, start);
        for (const item of items) {
            const url = item.originallink || item.link;
            if (!url || unique.has(url)) {
                continue;
            }
            if (options?.existingUrls?.has(url)) {
                continue;
            }
            const publishedIso = parsePublishedDate(item.pubDate);
            if (!isAfterThreshold(publishedIso, options?.publishedAfter)) {
                continue;
            }
            unique.set(url, item);
        }
        if (unique.size >= targetCount) {
            break;
        }
        if (items.length < 100) {
            break;
        }
    }
    // Add contrastive query variants so the dataset includes more critical/opposing viewpoints.
    if (unique.size < targetCount) {
        const contrastQueries = [
            `${keyword} 반대`,
            `${keyword} 비판`,
            `${keyword} 우려`,
            `${keyword} 논란`,
        ];
        for (const query of contrastQueries) {
            const items = await fetchNaverNews(query, 30, 1);
            for (const item of items) {
                const url = item.originallink || item.link;
                if (!url || unique.has(url)) {
                    continue;
                }
                if (options?.existingUrls?.has(url)) {
                    continue;
                }
                const publishedIso = parsePublishedDate(item.pubDate);
                if (!isAfterThreshold(publishedIso, options?.publishedAfter)) {
                    continue;
                }
                unique.set(url, item);
            }
            if (unique.size >= targetCount) {
                break;
            }
        }
    }
    const links = [];
    for (const [url, item] of unique.entries()) {
        links.push({
            keyword,
            title: (0, text_1.normalizeWhitespace)((0, text_1.stripHtml)(item.title)),
            url,
            source: parsePressName(url) ?? '출처 미상',
            publishedAt: parsePublishedDate(item.pubDate),
        });
        if (links.length >= targetCount) {
            break;
        }
    }
    return links;
}
