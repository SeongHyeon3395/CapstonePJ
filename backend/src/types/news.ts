export type Stance = '찬성' | '반대' | '중립';

export interface ArticleRecord {
  id: string;
  keyword: string;
  title: string;
  content: string;
  url: string;
  stance: Stance;
  similarity_score: number;
  created_at?: string;
}

export interface NaverNewsItem {
  title: string;
  link: string;
  originallink?: string;
  description?: string;
  pubDate?: string;
}

export interface NewsStats {
  total: number;
  agree_count: number;
  agree_percent: number;
  oppose_count: number;
  oppose_percent: number;
  neutral_count: number;
  neutral_percent: number;
  summary?: string;
}
