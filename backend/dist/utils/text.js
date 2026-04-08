"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripHtml = stripHtml;
exports.normalizeWhitespace = normalizeWhitespace;
exports.chunkText = chunkText;
function stripHtml(input) {
    return input.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
}
function normalizeWhitespace(input) {
    return input.replace(/\s+/g, ' ').trim();
}
function chunkText(text, chunkSize = 900) {
    if (!text.trim()) {
        return [];
    }
    const chunks = [];
    let cursor = 0;
    while (cursor < text.length) {
        chunks.push(text.slice(cursor, cursor + chunkSize));
        cursor += chunkSize;
    }
    return chunks;
}
