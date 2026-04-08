import { create } from 'zustand';
import { Article } from '../api/newsApi';

interface NewsState {
  articles: Article[];
  searchHistory: string[];
  setArticles: (articles: Article[]) => void;
  addToHistory: (keyword: string) => void;
}

export const useNewsStore = create<NewsState>((set) => ({
  articles: [],
  searchHistory: [],
  
  setArticles: (articles) => {
    const keyword = articles[0]?.keyword;
    set((state) => ({
      articles,
      searchHistory: keyword && !state.searchHistory.includes(keyword)
        ? [keyword, ...state.searchHistory].slice(0, 10)
        : state.searchHistory,
    }));
  },
  
  addToHistory: (keyword) => {
    set((state) => ({
      searchHistory: !state.searchHistory.includes(keyword)
        ? [keyword, ...state.searchHistory].slice(0, 10)
        : state.searchHistory,
    }));
  },
}));
