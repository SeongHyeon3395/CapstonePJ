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

export function addCollectLog(entry: CollectLogEntry): void {
  logs.unshift(entry);
  if (logs.length > MAX_LOGS) {
    logs.length = MAX_LOGS;
  }
}

export function getCollectLogs(limit = 7): CollectLogEntry[] {
  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));
  return logs.slice(0, safeLimit);
}
