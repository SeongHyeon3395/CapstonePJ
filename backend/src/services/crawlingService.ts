import axios from 'axios';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { env } from '../config/env';
import { naverApi } from '../config/naver';
import type { NaverNewsItem } from '../types/news';
import { normalizeWhitespace, stripHtml } from '../utils/text';

export interface CrawledArticleCandidate {
  keyword: string;
  title: string;
  url: string;
  source?: string;
  content: string;
  publishedAt?: string;
}

export interface NewsLinkCandidate {
  keyword: string;
  title: string;
  url: string;
  source?: string;
  publishedAt?: string;
}

interface CollectArticleOptions {
  targetCount?: number;
  publishedAfter?: Date;
  existingUrls?: Set<string>;
  prefetchedLinks?: NewsLinkCandidate[];
}

function parsePressName(url: string): string | undefined {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    return host;
  } catch {
    return undefined;
  }
}

export async function fetchNaverNews(keyword: string, display = 100, start = 1): Promise<NaverNewsItem[]> {
  if (!env.hasNaverCredentials) {
    throw new Error('NAVER_CLIENT_ID/NAVER_CLIENT_SECRET가 설정되지 않아 뉴스 수집을 실행할 수 없습니다. backend/.env를 확인해 주세요.');
  }

  const { data } = await naverApi.get<{ items: NaverNewsItem[] }>('/news.json', {
    params: {
      query: keyword,
      display,
      start,
      sort: 'date',
    },
  });

  return data.items ?? [];
}

function parsePublishedDate(raw?: string): string | undefined {
  if (!raw) {
    return undefined;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString();
}

function isAfterThreshold(dateIso?: string, threshold?: Date): boolean {
  if (!threshold || !dateIso) {
    return true;
  }

  return new Date(dateIso).getTime() >= threshold.getTime();
}

async function crawlArticleContent(url: string): Promise<string> {
  const { data } = await axios.get<string>(url, {
    timeout: 8000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
    },
    responseType: 'text',
  });

  const dom = new JSDOM(data, { url });
  const article = new Readability(dom.window.document).parse();
  if (!article?.textContent) {
    return '';
  }

  return normalizeWhitespace(article.textContent);
}

export async function fetchArticleContentByUrl(url: string): Promise<string> {
  return crawlArticleContent(url);
}

export async function collectArticles(keyword: string, options?: CollectArticleOptions): Promise<CrawledArticleCandidate[]> {
  const links = options?.prefetchedLinks ?? await collectNewsLinks(keyword, options);

  const results: CrawledArticleCandidate[] = [];
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
    } catch {
      continue;
    }
  }

  return results;
}

export async function collectNewsLinks(keyword: string, options?: CollectArticleOptions): Promise<NewsLinkCandidate[]> {
  const targetCount = Math.max(1, Math.min(500, options?.targetCount ?? 100));
  const maxPages = Math.ceil(targetCount / 100);

  const unique = new Map<string, NaverNewsItem>();
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

  const links: NewsLinkCandidate[] = [];
  for (const [url, item] of unique.entries()) {
    links.push({
      keyword,
      title: normalizeWhitespace(stripHtml(item.title)),
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
