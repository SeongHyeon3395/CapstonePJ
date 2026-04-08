import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { supabase } from '../config/supabase';
import { addCollectLog } from './collectLogService';
import { analyzeNewsByKeyword } from './newsService';

let timer: NodeJS.Timeout | null = null;
let running = false;
let cursor = 0;

function loadKeywordCatalog(): string[] {
  const fromEnv = env.autoCollectKeywords;
  let fromFile: string[] = [];

  if (env.autoCollectKeywordFileEnabled) {
    const absolutePath = path.resolve(process.cwd(), env.autoCollectKeywordFilePath);
    if (fs.existsSync(absolutePath)) {
      const content = fs.readFileSync(absolutePath, 'utf8');
      fromFile = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'));
    }
  }

  const merged = [...fromEnv, ...fromFile];
  return Array.from(new Set(merged));
}

function pickKeywordsRoundRobin(allKeywords: string[], size: number): string[] {
  if (allKeywords.length === 0) {
    return [];
  }

  const batchSize = Math.max(1, Math.min(size, allKeywords.length));
  const picked: string[] = [];

  for (let i = 0; i < batchSize; i += 1) {
    const index = (cursor + i) % allKeywords.length;
    picked.push(allKeywords[index]);
  }

  cursor = (cursor + batchSize) % allKeywords.length;
  return picked;
}

async function getRecentKeywordCounts(windowHours: number): Promise<Map<string, number>> {
  const sinceIso = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('articles')
    .select('keyword,created_at')
    .gte('created_at', sinceIso);

  if (error) {
    throw error;
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const keyword = String((row as { keyword?: string }).keyword ?? '').trim();
    if (!keyword) {
      continue;
    }
    counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
  }

  return counts;
}

function pickPrioritizedKeywords(
  allKeywords: string[],
  counts: Map<string, number>,
  size: number,
  maxPerWindow: number,
): string[] {
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

async function collectOnce(): Promise<void> {
  if (running) {
    return;
  }

  running = true;
  try {
    const allKeywords = loadKeywordCatalog();
    const counts = await getRecentKeywordCounts(env.autoCollectRecentWindowHours);
    const selectedKeywords = pickPrioritizedKeywords(
      allKeywords,
      counts,
      env.autoCollectKeywordsPerTick,
      env.autoCollectMaxPerKeywordPerWindow,
    );

    console.log(
      `[scheduler] tick: selected=${selectedKeywords.join(', ')} (window=${env.autoCollectRecentWindowHours}h, cap=${env.autoCollectMaxPerKeywordPerWindow})`,
    );

    if (selectedKeywords.length === 0) {
      addCollectLog({
        timestamp: new Date().toISOString(),
        source: 'scheduler',
        keyword: '-',
        requestedCount: env.autoCollectTargetPerRun,
        addedCount: 0,
        status: 'skipped',
        message: '수집 대상 키워드가 없어 이번 tick은 건너뜀',
      });
    }

    for (const keyword of selectedKeywords) {
      try {
        const result = await analyzeNewsByKeyword(keyword, {
          targetCount: env.autoCollectTargetPerRun,
          publishedAfter: new Date('2026-01-01T00:00:00.000Z'),
        });

        addCollectLog({
          timestamp: new Date().toISOString(),
          source: 'scheduler',
          keyword,
          requestedCount: env.autoCollectTargetPerRun,
          addedCount: result.total,
          status: 'success',
          message: `${result.total}건 수집 완료`,
        });
      } catch (error) {
        addCollectLog({
          timestamp: new Date().toISOString(),
          source: 'scheduler',
          keyword,
          requestedCount: env.autoCollectTargetPerRun,
          addedCount: 0,
          status: 'failed',
          message: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    }
  } catch (error) {
    console.error('[scheduler] auto collect failed:', error);
  } finally {
    running = false;
  }
}

export function startAutoCollectScheduler(): void {
  if (!env.autoCollectEnabled) {
    console.log('[scheduler] AUTO_COLLECT_ENABLED=false, scheduler skipped');
    return;
  }

  if (timer) {
    return;
  }

  const intervalMs = env.autoCollectIntervalMinutes * 60 * 1000;
  const allKeywords = loadKeywordCatalog();
  console.log(
    `[scheduler] started: every ${env.autoCollectIntervalMinutes} min, ${env.autoCollectTargetPerRun} article(s) x ${env.autoCollectKeywordsPerTick} keyword(s)/tick, catalog=${allKeywords.length}, window=${env.autoCollectRecentWindowHours}h, cap=${env.autoCollectMaxPerKeywordPerWindow}`,
  );

  void collectOnce();
  timer = setInterval(() => {
    void collectOnce();
  }, intervalMs);
}

export async function runManualCollectTicks(tickCount: number, targetPerRun = 1): Promise<{
  requestedTicks: number;
  executedTicks: number;
  totalAdded: number;
}> {
  const requestedTicks = Math.max(1, Math.min(30, Math.floor(tickCount)));
  const safeTargetPerRun = Math.max(1, Math.min(20, Math.floor(targetPerRun)));

  let executedTicks = 0;
  let totalAdded = 0;

  for (let i = 0; i < requestedTicks; i += 1) {
    const allKeywords = loadKeywordCatalog();
    const counts = await getRecentKeywordCounts(env.autoCollectRecentWindowHours);
    const selectedKeywords = pickPrioritizedKeywords(
      allKeywords,
      counts,
      env.autoCollectKeywordsPerTick,
      env.autoCollectMaxPerKeywordPerWindow,
    );

    if (selectedKeywords.length === 0) {
      addCollectLog({
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
        const result = await analyzeNewsByKeyword(keyword, {
          targetCount: safeTargetPerRun,
          publishedAfter: new Date('2026-01-01T00:00:00.000Z'),
        });

        totalAdded += result.total;
        addCollectLog({
          timestamp: new Date().toISOString(),
          source: 'manual-test',
          keyword,
          requestedCount: safeTargetPerRun,
          addedCount: result.total,
          status: 'success',
          message: `${result.total}건 수집 완료`,
        });
      } catch (error) {
        addCollectLog({
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
