"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startAutoCollectScheduler = startAutoCollectScheduler;
exports.runExternalCollectOnce = runExternalCollectOnce;
exports.getSchedulerStatus = getSchedulerStatus;
exports.runManualCollectTicks = runManualCollectTicks;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const env_1 = require("../config/env");
const supabase_1 = require("../config/supabase");
const collectLogService_1 = require("./collectLogService");
const newsService_1 = require("./newsService");
let timer = null;
let running = false;
let cursor = 0;
let lastRunAtIso = null;
let lastSuccessAtIso = null;
let lastErrorMessage = null;
let nextRunAtEpochMs = null;
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
async function collectOnce(source = 'scheduler') {
    if (running) {
        return {
            source,
            selectedKeywords: [],
            totalAdded: 0,
            success: false,
            error: '이미 수집 작업이 실행 중입니다.',
        };
    }
    running = true;
    const startedAt = new Date();
    lastRunAtIso = startedAt.toISOString();
    let totalAdded = 0;
    let selectedKeywords = [];
    try {
        const allKeywords = loadKeywordCatalog();
        const counts = await getRecentKeywordCounts(env_1.env.autoCollectRecentWindowHours);
        selectedKeywords = pickPrioritizedKeywords(allKeywords, counts, env_1.env.autoCollectKeywordsPerTick, env_1.env.autoCollectMaxPerKeywordPerWindow);
        console.log(`[scheduler] tick: selected=${selectedKeywords.join(', ')} (window=${env_1.env.autoCollectRecentWindowHours}h, cap=${env_1.env.autoCollectMaxPerKeywordPerWindow})`);
        if (selectedKeywords.length === 0) {
            (0, collectLogService_1.addCollectLog)({
                timestamp: new Date().toISOString(),
                source,
                keyword: '-',
                requestedCount: env_1.env.autoCollectTargetPerRun,
                addedCount: 0,
                status: 'skipped',
                message: '수집 대상 키워드가 없어 이번 tick은 건너뜀',
            });
        }
        for (const keyword of selectedKeywords) {
            try {
                const result = await (0, newsService_1.analyzeNewsByKeyword)(keyword, {
                    targetCount: env_1.env.autoCollectTargetPerRun,
                    publishedAfter: new Date('2026-01-01T00:00:00.000Z'),
                });
                totalAdded += result.total;
                (0, collectLogService_1.addCollectLog)({
                    timestamp: new Date().toISOString(),
                    source,
                    keyword,
                    requestedCount: env_1.env.autoCollectTargetPerRun,
                    addedCount: result.total,
                    status: 'success',
                    message: `${result.total}건 수집 완료`,
                });
            }
            catch (error) {
                (0, collectLogService_1.addCollectLog)({
                    timestamp: new Date().toISOString(),
                    source,
                    keyword,
                    requestedCount: env_1.env.autoCollectTargetPerRun,
                    addedCount: 0,
                    status: 'failed',
                    message: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
        }
        lastSuccessAtIso = new Date().toISOString();
        lastErrorMessage = null;
        return {
            source,
            selectedKeywords,
            totalAdded,
            success: true,
        };
    }
    catch (error) {
        console.error('[scheduler] auto collect failed:', error);
        const message = error instanceof Error ? error.message : String(error);
        lastErrorMessage = message;
        return {
            source,
            selectedKeywords,
            totalAdded,
            success: false,
            error: message,
        };
    }
    finally {
        running = false;
        if (timer) {
            nextRunAtEpochMs = Date.now() + env_1.env.autoCollectIntervalMinutes * 60 * 1000;
        }
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
    nextRunAtEpochMs = Date.now() + intervalMs;
    timer = setInterval(() => {
        void collectOnce();
        nextRunAtEpochMs = Date.now() + intervalMs;
    }, intervalMs);
}
async function runExternalCollectOnce() {
    return collectOnce('external-cron');
}
function getSchedulerStatus() {
    return {
        enabled: env_1.env.autoCollectEnabled,
        started: timer !== null,
        running,
        intervalMinutes: env_1.env.autoCollectIntervalMinutes,
        lastRunAt: lastRunAtIso,
        lastSuccessAt: lastSuccessAtIso,
        lastError: lastErrorMessage,
        nextRunAt: nextRunAtEpochMs ? new Date(nextRunAtEpochMs).toISOString() : null,
    };
}
async function runManualCollectTicks(tickCount, targetPerRun = 1) {
    const requestedTicks = Math.max(1, Math.min(30, Math.floor(tickCount)));
    const safeTargetPerRun = Math.max(1, Math.min(20, Math.floor(targetPerRun)));
    let executedTicks = 0;
    let totalAdded = 0;
    for (let i = 0; i < requestedTicks; i += 1) {
        const allKeywords = loadKeywordCatalog();
        const counts = await getRecentKeywordCounts(env_1.env.autoCollectRecentWindowHours);
        const selectedKeywords = pickPrioritizedKeywords(allKeywords, counts, env_1.env.autoCollectKeywordsPerTick, env_1.env.autoCollectMaxPerKeywordPerWindow);
        if (selectedKeywords.length === 0) {
            (0, collectLogService_1.addCollectLog)({
                timestamp: new Date().toISOString(),
                source: 'manual-test',
                keyword: '-',
                requestedCount: safeTargetPerRun,
                addedCount: 0,
                status: 'skipped',
                message: '수집 대상 키워드가 없어 수동 수집을 건너뜀',
            });
            executedTicks += 1;
            continue;
        }
        for (const keyword of selectedKeywords) {
            try {
                const result = await (0, newsService_1.analyzeNewsByKeyword)(keyword, {
                    targetCount: safeTargetPerRun,
                    publishedAfter: new Date('2026-01-01T00:00:00.000Z'),
                });
                totalAdded += result.total;
                (0, collectLogService_1.addCollectLog)({
                    timestamp: new Date().toISOString(),
                    source: 'manual-test',
                    keyword,
                    requestedCount: safeTargetPerRun,
                    addedCount: result.total,
                    status: 'success',
                    message: `${result.total}건 수집 완료`,
                });
            }
            catch (error) {
                (0, collectLogService_1.addCollectLog)({
                    timestamp: new Date().toISOString(),
                    source: 'manual-test',
                    keyword,
                    requestedCount: safeTargetPerRun,
                    addedCount: 0,
                    status: 'failed',
                    message: error instanceof Error ? error.message : String(error),
                });
            }
        }
        executedTicks += 1;
    }
    return {
        requestedTicks,
        executedTicks,
        totalAdded,
    };
}
