import { NativeModules, Platform } from 'react-native';

const ANDROID_EMULATOR_API_BASE_URL = 'http://10.0.2.2:3000/api';
// Physical Android defaults to localhost so USB port-reverse can tunnel to the PC backend.
const ANDROID_DEVICE_API_BASE_URL = 'http://127.0.0.1:3000/api';
const IOS_API_BASE_URL = 'http://127.0.0.1:3000/api';

function resolveMetroHost(): string | null {
  const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
  if (!scriptURL) {
    return null;
  }

  const match = scriptURL.match(/^https?:\/\/([^/:]+)(?::\d+)?\//i);
  return match?.[1] ?? null;
}

function isProbablyAndroidEmulator(): boolean {
  if (Platform.OS !== 'android') {
    return false;
  }

  const constants = (Platform.constants ?? {}) as {
    Brand?: string;
    Device?: string;
    Fingerprint?: string;
    Hardware?: string;
    Model?: string;
    Product?: string;
  };

  const fingerprint = String(constants.Fingerprint ?? '').toLowerCase();
  const model = String(constants.Model ?? '').toLowerCase();
  const brand = String(constants.Brand ?? '').toLowerCase();
  const device = String(constants.Device ?? '').toLowerCase();
  const product = String(constants.Product ?? '').toLowerCase();
  const hardware = String(constants.Hardware ?? '').toLowerCase();

  return (
    fingerprint.includes('generic')
    || fingerprint.includes('emulator')
    || model.includes('emulator')
    || model.includes('android sdk built for x86')
    || brand.includes('generic')
    || device.includes('generic')
    || product.includes('sdk')
    || hardware.includes('goldfish')
    || hardware.includes('ranchu')
  );
}

export function resolveApiBaseUrl(): string {
  const metroHost = resolveMetroHost();

  if (metroHost && metroHost !== 'localhost' && metroHost !== '127.0.0.1') {
    return `http://${metroHost}:3000/api`;
  }

  if (Platform.OS === 'android') {
    return isProbablyAndroidEmulator()
      ? ANDROID_EMULATOR_API_BASE_URL
      : ANDROID_DEVICE_API_BASE_URL;
  }

  return IOS_API_BASE_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();
