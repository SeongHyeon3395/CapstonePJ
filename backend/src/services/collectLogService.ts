import fs from 'fs';
import path from 'path';

export type CollectLogSource = 'scheduler' | 'manual-test' | 'external-cron';
export type CollectLogStatus = 'success' | 'failed' | 'skipped';

export interface CollectLogEntry {
  timestamp: string;
  source: CollectLogSource;
  keyword: string;
  requestedCount: number;
  addedCount: number;
  status: CollectLogStatus;
  message: string;
}

const MAX_LOGS = 200;
const logs: CollectLogEntry[] = [];
const LOG_DIR = path.resolve(process.cwd(), 'tmp');
const LOG_FILE = path.join(LOG_DIR, 'collect_logs.json');

function loadLogsFromDisk(): CollectLogEntry[] {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      return [];
    }

    const raw = fs.readFileSync(LOG_FILE, 'utf8');
    const parsed = JSON.parse(raw) as CollectLogEntry[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry) => (
      typeof entry?.timestamp === 'string'
      && typeof entry?.source === 'string'
      && typeof entry?.keyword === 'string'
      && typeof entry?.requestedCount === 'number'
      && typeof entry?.addedCount === 'number'
      && typeof entry?.status === 'string'
      && typeof entry?.message === 'string'
    ));
  } catch {
    return [];
  }
}

function persistLogsToDisk(): void {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2), 'utf8');
  } catch (error) {
    console.error('[collect-log] failed to persist logs:', error);
  }
}

const loadedLogs = loadLogsFromDisk();
if (loadedLogs.length > 0) {
  logs.push(...loadedLogs.slice(0, MAX_LOGS));
}

export function addCollectLog(entry: CollectLogEntry): void {
  logs.unshift(entry);
  if (logs.length > MAX_LOGS) {
    logs.length = MAX_LOGS;
  }
  persistLogsToDisk();
}

export function getCollectLogs(limit = 7, includeManualTest = false): CollectLogEntry[] {
  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));
  if (includeManualTest) {
    return logs.slice(0, safeLimit);
  }

  return logs
    .filter((entry) => entry.source !== 'manual-test')
    .slice(0, safeLimit);
}
