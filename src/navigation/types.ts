import type { Article } from '../types/news';

export type RootStackParamList = {
  Home: undefined;
  Detail: { article: Article };
};
