import axios from 'axios';
import { env } from './env';

export const naverApi = axios.create({
  baseURL: 'https://openapi.naver.com/v1/search',
  timeout: 12000,
  headers: {
    'X-Naver-Client-Id': env.naverClientId,
    'X-Naver-Client-Secret': env.naverClientSecret,
  },
});
