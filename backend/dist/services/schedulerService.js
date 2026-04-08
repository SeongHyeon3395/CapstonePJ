"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startAutoCollectScheduler = startAutoCollectScheduler;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const env_1 = require("../config/env");
const supabase_1 = require("../config/supabase");
const newsService_1 = require("./newsService");
let timer = null;
let running = false;
let cursor = 0;
function loadKeywordCatalog() {
    const fromEnv = env_1.env.autoCollectKeywords;
    let fromFile = [];
    if (env_1.env.autoCollectKeywordFileEnabled) {
        const absolutePath = path_1.default.resolve(process.cwd(), env_1.env.autoCollectKeywordFilePath);
        if (fs_1.default.existsSync(absolutePath)) {
            const content = fs_1.default.readFileSync(absolutePath, 'utf8');
            fromFile = content
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter((line) => line.length > 0 && !line.startsWith('#'));
        }
    }
    const merged = [...fromEnv, ...fromFile];
    return Array.from(new Set(merged));
}
function pickKeywordsRoundRobin(allKeywords, size) {
    if (allKeywords.length === 0) {
        return [];
    }
    const batchSize = Math.max(1, Math.min(size, allKeywords.length));
    const picked = [];
    for (let i = 0; i < batchSize; i += 1) {
        const index = (cursor + i) % allKeywords.length;
        picked.push(allKeywords[index]);
    }
    cursor = (cursor + batchSize) % allKeywords.length;
    return picked;
}
async function getRecentKeywordCounts(windowHours) {
    const sinceIso = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase_1.supabase
        .from('articles')
        .select('keyword,created_at')
        .gte('created_at', sinceIso);
    if (error) {
        throw error;
    }
    const counts = new Map();
    for (const row of data ?? []) {
        const keyword = String(row.keyword ?? '').trim();
        if (!keyword) {
            continue;
        }
        counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
    }
    return counts;
}
function pickPrioritizedKeywords(allKeywords, counts, size, maxPerWindow) {
    if (allKeywords.length === 0) {
        return [];
    }
    const eligible = allKeywords.filter((keyword) => (counts.get(keyword) ?? 0) < maxPerWindow);
    const pool = eligible.length > 0 ? eligible : allKeywords;
    const ranked = [...pool].sort((a, b) => {
        const diff = (counts.get(a) ?? 0) - (counts.get(b) ?? 0);
        if (diff !== 0) {
            return diff;
        }
        return a.localeCompare(b);
    });
    return pickKeywordsRoundRobin(ranked, size);
}
async function collectOnce() {
    if (running) {
        return;
    }
    running = true;
    try {
        const allKeywords = loadKeywordCatalog();
        const counts = await getRecentKeywordCounts(env_1.env.autoCollectRecentWindowHours);
        const selectedKeywords = pickPrioritizedKeywords(allKeywords, counts, env_1.env.autoCollectKeywordsPerTick, env_1.env.autoCollectMaxPerKeywordPerWindow);
        console.log(`[scheduler] tick: selected=${selectedKeywords.join(', ')} (window=${env_1.env.autoCollectRecentWindowHours}h, cap=${env_1.env.autoCollectMaxPerKeywordPerWindow})`);
        for (const keyword of selectedKeywords) {
            await (0, newsService_1.analyzeNewsByKeyword)(keyword, {
                targetCount: env_1.env.autoCollectTargetPerRun,
                publishedAfter: new Date('2026-01-01T00:00:00.000Z'),
            });
        }
    }
    catch (error) {
        console.error('[scheduler] auto collect failed:', error);
    }
    finally {
        running = false;
    }
}
function startAutoCollectScheduler() {
    if (!env_1.env.autoCollectEnabled) {
        console.log('[scheduler] AUTO_COLLECT_ENABLED=false, scheduler skipped');
        return;
    }
    if (timer) {
        return;
    }
    const intervalMs = env_1.env.autoCollectIntervalMinutes * 60 * 1000;
    const allKeywords = loadKeywordCatalog();
    console.log(`[scheduler] started: every ${env_1.env.autoCollectIntervalMinutes} min, ${env_1.env.autoCollectTargetPerRun} article(s) x ${env_1.env.autoCollectKeywordsPerTick} keyword(s)/tick, catalog=${allKeywords.length}, window=${env_1.env.autoCollectRecentWindowHours}h, cap=${env_1.env.autoCollectMaxPerKeywordPerWindow}`);
    void collectOnce();
    timer = setInterval(() => {
        void collectOnce();
    }, intervalMs);
}
