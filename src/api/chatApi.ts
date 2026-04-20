import axios from 'axios';
import { API_BASE_URL } from './baseUrl';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface ChatResponse {
  answer: string;
  sources?: string[];
}

/**
 * [API 3] RAG 기반 질문 응답
 * POST /api/chat/ask
 */
export async function askQuestion(
  articleId: string,
  question: string
): Promise<ChatResponse> {
  try {
    const response = await api.post('/chat/ask', {
      article_id: articleId,
      question,
    });
    return response.data;
  } catch (error) {
    console.error('askQuestion error:', error);
    // Mock response for development
    return {
      answer: '죄송합니다. 현재 백엔드 서버에 연결할 수 없습니다. 백엔드를 실행해주세요.',
    };
  }
}
