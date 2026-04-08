"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeNewsController = analyzeNewsController;
exports.newsStatsController = newsStatsController;
const newsService_1 = require("../services/newsService");
async function analyzeNewsController(req, res) {
    const keyword = String(req.query.keyword ?? '').trim();
    const targetRaw = Number(req.query.targetCount ?? req.query.display ?? 150);
    const targetCount = Number.isFinite(targetRaw) ? Math.max(1, Math.min(500, Math.floor(targetRaw))) : 150;
    const sinceYearRaw = Number(req.query.sinceYear);
    const publishedAfter = Number.isFinite(sinceYearRaw) && sinceYearRaw >= 2000
        ? new Date(`${Math.floor(sinceYearRaw)}-01-01T00:00:00.000Z`)
        : undefined;
    if (!keyword) {
        res.status(400).json({ message: 'keyword 쿼리 파라미터가 필요합니다.' });
        return;
    }
    try {
        const result = await (0, newsService_1.analyzeNewsByKeyword)(keyword, { targetCount, publishedAfter });
        res.json(result);
    }
    catch (error) {
        const detail = formatErrorDetail(error);
        res.status(500).json({
            message: '뉴스 분석 중 오류가 발생했습니다.',
            detail,
        });
    }
}
async function newsStatsController(req, res) {
    const keyword = String(req.query.keyword ?? '').trim();
    if (!keyword) {
        res.status(400).json({ message: 'keyword 쿼리 파라미터가 필요합니다.' });
        return;
    }
    try {
        const stats = await (0, newsService_1.getStatsByKeyword)(keyword);
        res.json(stats);
    }
    catch (error) {
        const detail = formatErrorDetail(error);
        res.status(500).json({
            message: '뉴스 통계 집계 중 오류가 발생했습니다.',
            detail,
        });
    }
}
function formatErrorDetail(error) {
    if (error instanceof Error) {
        return error.message;
    }
    try {
        return JSON.stringify(error);
    }
    catch {
        return String(error);
    }
}
