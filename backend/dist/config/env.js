"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function getEnv(name, optional = false) {
    const value = process.env[name];
    if (!value && !optional) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value ?? '';
}
function getPositiveInt(name, fallback) {
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
function getBoolean(name, fallback) {
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
function getStringList(name, fallback) {
    const raw = process.env[name];
    if (!raw) {
        return fallback;
    }
    return raw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}
exports.env = {
    port: Number(process.env.PORT ?? 3000),
    supabaseUrl: getEnv('SUPABASE_URL'),
    supabaseServiceRoleKey: getEnv('SUPABASE_SERVICE_ROLE_KEY'),
    openaiApiKey: getEnv('OPENAI_API_KEY', true),
    naverClientId: getEnv('NAVER_CLIENT_ID', true),
    naverClientSecret: getEnv('NAVER_CLIENT_SECRET', true),
    openaiChatModel: process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini',
    openaiEmbedModel: process.env.OPENAI_EMBED_MODEL ?? 'text-embedding-3-small',
    openaiEmbedDimensions: getPositiveInt('OPENAI_EMBED_DIMENSIONS', 1536),
    hasOpenAiKey: Boolean((process.env.OPENAI_API_KEY ?? '').trim()),
    hasNaverCredentials: Boolean((process.env.NAVER_CLIENT_ID ?? '').trim() && (process.env.NAVER_CLIENT_SECRET ?? '').trim()),
    autoCollectEnabled: getBoolean('AUTO_COLLECT_ENABLED', true),
    autoCollectIntervalMinutes: getPositiveInt('AUTO_COLLECT_INTERVAL_MINUTES', 360),
    autoCollectTargetPerRun: getPositiveInt('AUTO_COLLECT_TARGET_PER_RUN', 1),
    autoCollectKeywordsPerTick: getPositiveInt('AUTO_COLLECT_KEYWORDS_PER_TICK', 1),
    autoCollectRecentWindowHours: getPositiveInt('AUTO_COLLECT_RECENT_WINDOW_HOURS', 24),
    autoCollectMaxPerKeywordPerWindow: getPositiveInt('AUTO_COLLECT_MAX_PER_KEYWORD_PER_WINDOW', 3),
    autoCollectKeywords: getStringList('AUTO_COLLECT_KEYWORDS', ['의대증원']),
    autoCollectKeywordFileEnabled: getBoolean('AUTO_COLLECT_KEYWORD_FILE_ENABLED', true),
    autoCollectKeywordFilePath: process.env.AUTO_COLLECT_KEYWORD_FILE_PATH ?? 'keywords/master_keywords.txt',
    autoCollectTriggerToken: getEnv('AUTO_COLLECT_TRIGGER_TOKEN', true),
};
