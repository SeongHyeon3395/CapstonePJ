import { create } from 'zustand';
import type { Article } from '../types/news';

interface NewsState {
  keyword: string;
  articles: Article[];
  selectedArticle?: Article;
  setKeyword: (keyword: string) => void;
  setArticles: (articles: Article[]) => void;
  setSelectedArticle: (article?: Article) => void;
}

export const useNewsStore = create<NewsState>((set) => ({
  keyword: '',
  articles: [],
  selectedArticle: undefined,
  setKeyword: (keyword) => set({ keyword }),
  setArticles: (articles) => set({ articles }),
  setSelectedArticle: (selectedArticle) => set({ selectedArticle }),
}));
