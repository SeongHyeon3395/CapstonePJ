"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cosineSimilarity = cosineSimilarity;
exports.clampPercent = clampPercent;
exports.toFixedPercent = toFixedPercent;
function cosineSimilarity(a, b) {
    const length = Math.min(a.length, b.length);
    if (length === 0) {
        return 0;
    }
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < length; i += 1) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) {
        return 0;
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
function clampPercent(value) {
    const clamped = Math.max(0, Math.min(100, value));
    return Math.round(clamped);
}
function toFixedPercent(count, total) {
    if (total === 0) {
        return 0;
    }
    return Number(((count / total) * 100).toFixed(1));
}
