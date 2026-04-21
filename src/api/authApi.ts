import axios from 'axios';
import { API_BASE_URL } from './baseUrl';

const authApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface AppUser {
  id: string;
  university: string;
  department: string;
  name: string;
  student_number: string;
  created_at?: string;
}

export interface SignupPayload {
  university: string;
  department: string;
  name: string;
  student_number: string;
}

export interface LoginPayload {
  university: string;
  name: string;
  student_number: string;
}

export interface UpdateProfilePayload {
  user_id: string;
  university: string;
  department: string;
  name: string;
  student_number: string;
}

function toAuthErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const serverMessage = String(error.response?.data?.message ?? '').trim();
    if (serverMessage) {
      return serverMessage;
    }

    if (error.code === 'ERR_NETWORK') {
      return `백엔드 서버에 연결할 수 없습니다. backend 서버 실행 상태와 API 주소를 확인해 주세요. (현재: ${API_BASE_URL})\nAndroid 실기기 릴리즈라면 adb reverse를 먼저 실행하세요: adb reverse tcp:3000 tcp:3000`;
    }

    if (error.code === 'ECONNABORTED') {
      return '서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.';
    }
  }

  return fallback;
}

export async function signup(payload: SignupPayload): Promise<AppUser> {
  try {
    const response = await authApi.post<{ user: AppUser }>('/auth/signup', payload);
    return response.data.user;
  } catch (error) {
    throw new Error(toAuthErrorMessage(error, '회원가입에 실패했습니다.'));
  }
}

export async function login(payload: LoginPayload): Promise<AppUser> {
  try {
    const response = await authApi.post<{ user: AppUser }>('/auth/login', payload);
    return response.data.user;
  } catch (error) {
    throw new Error(toAuthErrorMessage(error, '로그인에 실패했습니다.'));
  }
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<AppUser> {
  try {
    const response = await authApi.put<{ user: AppUser }>('/auth/profile', payload);
    return response.data.user;
  } catch (error) {
    throw new Error(toAuthErrorMessage(error, '프로필 수정에 실패했습니다.'));
  }
}
