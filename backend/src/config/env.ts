import dotenv from 'dotenv';

dotenv.config();

function getEnv(name: string, optional = false): string {
  const value = process.env[name];
  if (!value && !optional) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? '';
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  supabaseUrl: getEnv('SUPABASE_URL'),
  supabaseServiceRoleKey: getEnv('SUPABASE_SERVICE_ROLE_KEY'),
  openaiApiKey: getEnv('OPENAI_API_KEY'),
  naverClientId: getEnv('NAVER_CLIENT_ID'),
  naverClientSecret: getEnv('NAVER_CLIENT_SECRET'),
  openaiChatModel: process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o',
  openaiEmbedModel: process.env.OPENAI_EMBED_MODEL ?? 'text-embedding-3-small',
};
