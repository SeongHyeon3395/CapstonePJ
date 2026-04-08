import dotenv from 'dotenv';

dotenv.config();

function getEnv(name: string, optional = false): string {
  const value = process.env[name];
  if (!value && !optional) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? '';
}

function getPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid positive integer for ${name}: ${raw}`);
  }

  return value;
}

function getBoolean(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  throw new Error(`Invalid boolean for ${name}: ${raw}`);
}

function getStringList(name: string, fallback: string[]): string[] {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  supabaseUrl: getEnv('SUPABASE_URL'),
  supabaseServiceRoleKey: getEnv('SUPABASE_SERVICE_ROLE_KEY'),
  openaiApiKey: getEnv('OPENAI_API_KEY'),
  naverClientId: getEnv('NAVER_CLIENT_ID'),
  naverClientSecret: getEnv('NAVER_CLIENT_SECRET'),
  openaiChatModel: process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini',
  openaiEmbedModel: process.env.OPENAI_EMBED_MODEL ?? 'text-embedding-3-small',
  openaiEmbedDimensions: getPositiveInt('OPENAI_EMBED_DIMENSIONS', 1536),
  autoCollectEnabled: getBoolean('AUTO_COLLECT_ENABLED', true),
  autoCollectIntervalMinutes: getPositiveInt('AUTO_COLLECT_INTERVAL_MINUTES', 360),
  autoCollectTargetPerRun: getPositiveInt('AUTO_COLLECT_TARGET_PER_RUN', 1),
  autoCollectKeywordsPerTick: getPositiveInt('AUTO_COLLECT_KEYWORDS_PER_TICK', 1),
  autoCollectRecentWindowHours: getPositiveInt('AUTO_COLLECT_RECENT_WINDOW_HOURS', 24),
  autoCollectMaxPerKeywordPerWindow: getPositiveInt('AUTO_COLLECT_MAX_PER_KEYWORD_PER_WINDOW', 3),
  autoCollectKeywords: getStringList('AUTO_COLLECT_KEYWORDS', ['의대증원']),
  autoCollectKeywordFileEnabled: getBoolean('AUTO_COLLECT_KEYWORD_FILE_ENABLED', true),
  autoCollectKeywordFilePath: process.env.AUTO_COLLECT_KEYWORD_FILE_PATH ?? 'keywords/master_keywords.txt',
};
