export type Stance = '찬성' | '반대' | '중립';

export interface Article {
  id: string;
  keyword: string;
  title: string;
  content: string;
  url: string;
  press?: string;
  stance: Stance;
  similarity_score: number;
  created_at?: string;
}

export interface AnalyzeNewsResponse {
  keyword: string;
  total: number;
  articles: Article[];
}

export interface NewsStatsResponse {
  total: number;
  agree_count: number;
  agree_percent: number;
  oppose_count: number;
  oppose_percent: number;
  neutral_count: number;
  neutral_percent: number;
  summary?: string;
}

export interface AskChatPayload {
  article_id: string;
  question: string;
}

export interface AskChatResponse {
  answer: string;
}
