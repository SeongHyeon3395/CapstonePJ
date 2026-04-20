import { NativeModules, Platform } from 'react-native';

function resolveMetroHost(): string | null {
  const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
  if (!scriptURL) {
    return null;
  }

  const match = scriptURL.match(/^https?:\/\/([^/:]+)(?::\d+)?\//i);
  return match?.[1] ?? null;
}

export function resolveApiBaseUrl(): string {
  const metroHost = resolveMetroHost();

  if (metroHost && metroHost !== 'localhost' && metroHost !== '127.0.0.1') {
    return `http://${metroHost}:3000/api`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api';
  }

  return 'http://127.0.0.1:3000/api';
}

export const API_BASE_URL = resolveApiBaseUrl();
