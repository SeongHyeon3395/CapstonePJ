import axios from 'axios';
import { naverApi } from '../config/naver';
import type { NaverNewsItem } from '../types/news';
import { extractMainContent, normalizeWhitespace, stripHtml } from '../utils/text';

export interface CrawledArticleCandidate {
  keyword: string;
  title: string;
  url: string;
  press?: string;
  content: string;
}

function parsePressName(url: string): string | undefined {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    return host;
  } catch {
    return undefined;
  }
}

export async function fetchNaverNews(keyword: string, display = 30): Promise<NaverNewsItem[]> {
  const { data } = await naverApi.get<{ items: NaverNewsItem[] }>('/news.json', {
    params: {
      query: keyword,
      display,
      sort: 'date',
    },
  });

  return data.items ?? [];
}

async function crawlArticleContent(url: string): Promise<string> {
  const { data } = await axios.get<string>(url, {
    timeout: 12000,
    headers: {
      'User-Agent': 'Mozilla/5.0',
    },
    responseType: 'text',
  });

  return extractMainContent(data);
}

export async function collectArticles(keyword: string): Promise<CrawledArticleCandidate[]> {
  const items = await fetchNaverNews(keyword, 30);
  const unique = new Map<string, NaverNewsItem>();

  for (const item of items) {
    const url = item.originallink || item.link;
    if (!url || unique.has(url)) {
      continue;
    }
    unique.set(url, item);
  }

  const results: CrawledArticleCandidate[] = [];
  for (const [url, item] of unique.entries()) {
    try {
      const content = await crawlArticleContent(url);
      if (content.length < 60) {
        continue;
      }

      results.push({
        keyword,
        title: normalizeWhitespace(stripHtml(item.title)),
        url,
        press: parsePressName(url),
        content,
      });
    } catch {
      continue;
    }
  }

  return results;
}
