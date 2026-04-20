import axios from 'axios';
import { API_BASE_URL } from './baseUrl';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Article {
  id: string;
  keyword: string;
  title: string;
  content: string;
  url: string;
  source?: string;
  stance: '찬성' | '반대' | '중립' | '분류불가';
  reason?: string;
  evidence?: string;
  keyword_points?: string[];
  similarity_score: number;
  published_at?: string;
  created_at: string;
}

export interface NewsStats {
  keyword?: string;
  total_analyzed: number;
  total: number;
  agree_count: number;
  agree_percent: number;
  oppose_count: number;
  oppose_percent: number;
  neutral_count: number;
  neutral_percent: number;
  unclassified_count?: number;
  unclassified_percent?: number;
  stats?: {
    agree: { count: number; percent: number };
    oppose: { count: number; percent: number };
    neutral: { count: number; percent: number };
    unclassified: { count: number; percent: number };
  };
  evidence_list?: Array<{
    id: string;
    title: string;
    source: string;
    stance: '찬성' | '반대' | '중립' | '분류불가';
    evidence: string;
    aggro_index: number;
    published_at?: string;
    url: string;
  }>;
  analysis_report?: string;
  ai_final_summary?: string;
  summary?: string;
  sentiment?: {
    positive: { count: number; percent: number; reason: string };
    negative: { count: number; percent: number; reason: string };
  };
}

interface AnalyzeNewsResponse {
  keyword: string;
  total: number;
  articles: Article[];
}

export interface SimilarArticle extends Article {
  match_percent: number;
}

export interface ManualAnalyzeRequest {
  user_id: string;
  input: string;
}

export interface ManualAnalyzeResponse {
  keyword: string;
  article: Article;
  similar_articles: SimilarArticle[];
  stats?: NewsStats;
}

interface RecentNewsResponse {
  total: number;
  limit: number;
  has_more: boolean;
  next_cursor_created_at: string | null;
  next_cursor_id: string | null;
  articles: Article[];
}

interface UserHistoryResponse {
  total: number;
  articles: Article[];
}

export interface RecentNewsPage {
  total: number;
  limit: number;
  has_more: boolean;
  next_cursor_created_at: string | null;
  next_cursor_id: string | null;
  articles: Article[];
}

export interface CollectLogEntry {
  timestamp: string;
  source: 'scheduler' | 'external-cron';
  keyword: string;
  requestedCount: number;
  addedCount: number;
  status: 'success' | 'failed' | 'skipped';
  message: string;
}

export interface CollectStatus {
  enabled: boolean;
  started: boolean;
  running: boolean;
  intervalMinutes: number;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  nextRunAt: string | null;
}

interface CollectLogsResponse {
  total: number;
  logs: CollectLogEntry[];
}

/**
 * [API 1] 뉴스 분석 요청
 * GET /api/news?keyword={keyword}&targetCount=500&sinceYear=2026
 */
export async function analyzeNews(keyword: string): Promise<Article[]> {
  try {
    const sinceYear = Math.max(2000, new Date().getFullYear() - 1);
    const response = await api.get<AnalyzeNewsResponse>('/news', {
      params: { keyword, targetCount: 60, sinceYear },
      timeout: 180000,
    });
    return response.data.articles;
  } catch (error) {
    console.error('analyzeNews error:', error);
    // Mock data for development
    return generateMockArticles(keyword);
  }
}

/**
 * [API 2] 뉴스 통계 조회
 * GET /api/news/stats?keyword={keyword}
 */
export async function getNewsStats(keyword: string): Promise<NewsStats> {
  try {
    const response = await api.get<NewsStats>('/news/stats', {
      params: { keyword },
    });
    return response.data;
  } catch (error) {
    console.error('getNewsStats error:', error);
    // Mock data for development
    return {
      total_analyzed: 100,
      total: 100,
      agree_count: 45,
      agree_percent: 45.0,
      oppose_count: 35,
      oppose_percent: 35.0,
      neutral_count: 20,
      neutral_percent: 20.0,
      stats: {
        agree: { count: 45, percent: 45.0 },
        oppose: { count: 35, percent: 35.0 },
        neutral: { count: 20, percent: 20.0 },
        unclassified: { count: 0, percent: 0 },
      },
      evidence_list: [],
      analysis_report: '수집된 근거 기사 기준으로 찬성 의견이 다소 우세합니다.',
      ai_final_summary: '수집된 근거 기사 기준으로 찬성 의견이 다소 우세합니다.',
      summary: '이 이슈에 대한 언론 보도는 찬성 의견이 다소 우세하나, 반대 의견도 상당수 존재합니다.',
      sentiment: {
        positive: {
          count: 55,
          percent: 55.0,
          reason: '정책 기대효과와 사회적 편익이 크다는 근거가 반복적으로 제시됩니다.',
        },
        negative: {
          count: 45,
          percent: 45.0,
          reason: '비용 부담과 부작용 가능성에 대한 우려가 핵심 반론으로 나타납니다.',
        },
      },
    };
  }
}

/**
 * [API 3] 최근 분석 뉴스 조회
 * GET /api/news/recent?limit={limit}
 */
export async function getRecentNews(
  limit = 50,
  cursorCreatedAt?: string,
  cursorId?: string,
): Promise<RecentNewsPage> {
  try {
    const response = await api.get<RecentNewsResponse>('/news/recent', {
      params: {
        limit,
        cursor_created_at: cursorCreatedAt,
        cursor_id: cursorId,
      },
    });
    return response.data;
  } catch (error) {
    console.error('getRecentNews error:', error);
    return {
      total: 0,
      limit,
      has_more: false,
      next_cursor_created_at: null,
      next_cursor_id: null,
      articles: [],
    };
  }
}

export async function searchRecentNews(
  keyword: string,
  limit = 50,
  cursorCreatedAt?: string,
  cursorId?: string,
): Promise<RecentNewsPage> {
  try {
    const response = await api.get<RecentNewsResponse>('/news/recent', {
      params: {
        keyword,
        limit,
        cursor_created_at: cursorCreatedAt,
        cursor_id: cursorId,
      },
    });
    return response.data;
  } catch (error) {
    console.error('searchRecentNews error:', error);
    return {
      total: 0,
      limit,
      has_more: false,
      next_cursor_created_at: null,
      next_cursor_id: null,
      articles: [],
    };
  }
}

export async function getArticleById(articleId: string): Promise<Article | null> {
  try {
    const response = await api.get<Article>(`/news/article/${articleId}`);
    return response.data;
  } catch (error) {
    console.error('getArticleById error:', error);
    return null;
  }
}

export async function getCollectLogs(limit = 7): Promise<CollectLogEntry[]> {
  try {
    const response = await api.get<CollectLogsResponse>('/news/collect/logs', {
      params: { limit },
    });
    return response.data.logs ?? [];
  } catch (error) {
    console.error('getCollectLogs error:', error);
    return [];
  }
}

export async function getCollectStatus(): Promise<CollectStatus | null> {
  try {
    const response = await api.get<CollectStatus>('/news/collect/status');
    return response.data;
  } catch (error) {
    console.error('getCollectStatus error:', error);
    return null;
  }
}

export async function analyzeManualNews(payload: ManualAnalyzeRequest): Promise<ManualAnalyzeResponse> {
  try {
    const response = await api.post<ManualAnalyzeResponse>('/news/manual-analyze', payload, {
      timeout: 180000,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const code = String(error.response?.data?.code ?? '');
      const message = String(error.response?.data?.message ?? '수동 기사 분석 중 오류가 발생했습니다.');
      if (code === 'LINK_ACCESS_BLOCKED') {
        throw new Error(message);
      }
      throw new Error(message);
    }
    throw error;
  }
}

export async function getUserManualHistory(userId: string, limit = 50): Promise<Article[]> {
  try {
    const response = await api.get<UserHistoryResponse>('/news/manual-history', {
      params: { user_id: userId, limit },
      timeout: 20000,
    });
    return response.data.articles ?? [];
  } catch (error) {
    console.error('getUserManualHistory error:', error);
    return [];
  }
}

export async function resetAllManualHistory(userId: string): Promise<boolean> {
  try {
    await api.delete('/news/manual-history', {
      params: { user_id: userId },
      timeout: 20000,
    });
    return true;
  } catch (error) {
    console.error('resetAllManualHistory error:', error);
    return false;
  }
}

// Mock data generator for development
function generateMockArticles(keyword: string): Article[] {
  const stances: Array<'찬성' | '반대' | '중립'> = ['찬성', '반대', '중립'];
  
  return Array.from({ length: 10 }, (_, i) => ({
    id: `article-${i}`,
    keyword,
    title: `${keyword} 관련 뉴스 제목 ${i + 1}`,
    content: `${keyword}에 대한 상세한 기사 내용입니다. 이것은 테스트용 목 데이터입니다. 실제 백엔드 연동 시 실제 뉴스 내용으로 대체됩니다.`,
    url: `https://news.naver.com/article/${i}`,
    source: 'news.naver.com',
    stance: stances[i % 3],
    reason: `${keyword} 관련 핵심 근거 문장을 기반으로 분류되었습니다.`,
    keyword_points: [keyword, '핵심쟁점', '정책반응'],
    similarity_score: Math.floor(Math.random() * 60) + 40,
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  }));
}
