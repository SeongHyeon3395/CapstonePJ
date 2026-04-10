"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addCollectLog = addCollectLog;
exports.getCollectLogs = getCollectLogs;
const MAX_LOGS = 200;
const logs = [];
function addCollectLog(entry) {
    logs.unshift(entry);
    if (logs.length > MAX_LOGS) {
        logs.length = MAX_LOGS;
    }
}
function getCollectLogs(limit = 7) {
    const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));
    return logs.slice(0, safeLimit);
}
