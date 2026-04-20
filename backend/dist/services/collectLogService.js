"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addCollectLog = addCollectLog;
exports.getCollectLogs = getCollectLogs;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const MAX_LOGS = 200;
const logs = [];
const LOG_DIR = path_1.default.resolve(process.cwd(), 'tmp');
const LOG_FILE = path_1.default.join(LOG_DIR, 'collect_logs.json');
function loadLogsFromDisk() {
    try {
        if (!fs_1.default.existsSync(LOG_FILE)) {
            return [];
        }
        const raw = fs_1.default.readFileSync(LOG_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.filter((entry) => (typeof entry?.timestamp === 'string'
            && typeof entry?.source === 'string'
            && typeof entry?.keyword === 'string'
            && typeof entry?.requestedCount === 'number'
            && typeof entry?.addedCount === 'number'
            && typeof entry?.status === 'string'
            && typeof entry?.message === 'string'));
    }
    catch {
        return [];
    }
}
function persistLogsToDisk() {
    try {
        if (!fs_1.default.existsSync(LOG_DIR)) {
            fs_1.default.mkdirSync(LOG_DIR, { recursive: true });
        }
        fs_1.default.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2), 'utf8');
    }
    catch (error) {
        console.error('[collect-log] failed to persist logs:', error);
    }
}
const loadedLogs = loadLogsFromDisk();
if (loadedLogs.length > 0) {
    logs.push(...loadedLogs.slice(0, MAX_LOGS));
}
function addCollectLog(entry) {
    logs.unshift(entry);
    if (logs.length > MAX_LOGS) {
        logs.length = MAX_LOGS;
    }
    persistLogsToDisk();
}
function getCollectLogs(limit = 7, includeManualTest = false) {
    const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));
    if (includeManualTest) {
        return logs.slice(0, safeLimit);
    }
    return logs
        .filter((entry) => entry.source !== 'manual-test')
        .slice(0, safeLimit);
}
