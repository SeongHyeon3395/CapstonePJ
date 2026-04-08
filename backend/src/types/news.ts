export type Stance = '찬성' | '반대' | '중립' | '분류불가';

export interface ArticleRecord {
  id: string;
  keyword: string;
  title: string;
  content: string;
  url: string;
  stance: Stance;
  similarity_score: number;
  evidence?: string;
  summary?: string;
  source?: string;
  aggro_reason?: string;
  published_at?: string;
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
  keyword?: string;
  total_analyzed: number;
  total: number;
  agree_count: number;
  agree_percent: number;
  oppose_count: number;
  oppose_percent: number;
  neutral_count: number;
  neutral_percent: number;
  unclassified_count: number;
  unclassified_percent: number;
  statistics: {
    agree: { count: number; percent: number };
    oppose: { count: number; percent: number };
    neutral: { count: number; percent: number };
    unclassified: { count: number; percent: number };
  };
  total_count?: number;
  percentages?: {
    agree: number;
    oppose: number;
    neutral: number;
  };
  stats?: {
    agree: { count: number; percent: number };
    oppose: { count: number; percent: number };
    neutral: { count: number; percent: number };
    unclassified: { count: number; percent: number };
  };
  evidence_list: Array<{
    id: string;
    title: string;
    source: string;
    stance: Stance;
    evidence: string;
    aggro_index: number;
    published_at?: string;
    url: string;
  }>;
  top_evidences?: Array<{
    source: string;
    stance: Stance;
    reason: string;
  }>;
  analysis_report?: string;
  ai_final_summary?: string;
  summary?: string;
  sentiment?: {
    positive: { count: number; percent: number; reason: string };
    negative: { count: number; percent: number; reason: string };
  };
}
