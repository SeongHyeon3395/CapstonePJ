import { apiClient } from './client';
import type {
  AnalyzeNewsResponse,
  AskChatPayload,
  AskChatResponse,
  NewsStatsResponse,
} from '../types/news';

export async function analyzeNews(keyword: string) {
  const { data } = await apiClient.get<AnalyzeNewsResponse>('/api/news/analyze', {
    params: { keyword },
  });

  return data;
}

export async function fetchNewsStats(keyword: string) {
  const { data } = await apiClient.get<NewsStatsResponse>('/api/news/stats', {
    params: { keyword },
  });

  return data;
}

export async function askArticleQuestion(payload: AskChatPayload) {
  const { data } = await apiClient.post<AskChatResponse>('/api/chat/ask', payload);

  return data;
}
