import axios from 'axios';

export const apiClient = axios.create({
  baseURL: 'http://10.0.2.2:3000',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});
