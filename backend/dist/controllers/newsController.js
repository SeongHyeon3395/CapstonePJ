"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeNewsController = analyzeNewsController;
exports.newsStatsController = newsStatsController;
exports.recentNewsController = recentNewsController;
exports.articleByIdController = articleByIdController;
exports.collectLogsController = collectLogsController;
exports.collectTestRunController = collectTestRunController;
exports.collectStatusController = collectStatusController;
exports.collectTriggerController = collectTriggerController;
const env_1 = require("../config/env");
const newsService_1 = require("../services/newsService");
const collectLogService_1 = require("../services/collectLogService");
const schedulerService_1 = require("../services/schedulerService");
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
async function recentNewsController(req, res) {
    const limitRaw = Number(req.query.limit ?? 50);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(500, Math.floor(limitRaw))) : 50;
    const keyword = String(req.query.keyword ?? '').trim();
    const cursorCreatedAt = String(req.query.cursor_created_at ?? '').trim();
    const cursorId = String(req.query.cursor_id ?? '').trim();
    try {
        const result = await (0, newsService_1.getRecentAnalyzedNews)(limit, keyword, cursorCreatedAt, cursorId);
        res.json(result);
    }
    catch (error) {
        const detail = formatErrorDetail(error);
        res.status(500).json({
            message: '최근 뉴스 조회 중 오류가 발생했습니다.',
            detail,
        });
    }
}
async function articleByIdController(req, res) {
    const articleId = String(req.params.id ?? '').trim();
    if (!articleId) {
        res.status(400).json({ message: 'article id가 필요합니다.' });
        return;
    }
    try {
        const article = await (0, newsService_1.getArticleById)(articleId);
        if (!article) {
            res.status(404).json({ message: '해당 기사를 찾을 수 없습니다.' });
            return;
        }
        res.json(article);
    }
    catch (error) {
        const detail = formatErrorDetail(error);
        res.status(500).json({ message: '기사 조회 중 오류가 발생했습니다.', detail });
    }
}
async function collectLogsController(req, res) {
    const limitRaw = Number(req.query.limit ?? 7);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(50, Math.floor(limitRaw))) : 7;
    try {
        const logs = (0, collectLogService_1.getCollectLogs)(limit);
        res.json({
            total: logs.length,
            logs,
        });
    }
    catch (error) {
        const detail = formatErrorDetail(error);
        res.status(500).json({ message: '수집 로그 조회 중 오류가 발생했습니다.', detail });
    }
}
async function collectTestRunController(req, res) {
    const countRaw = Number(req.query.count ?? req.body?.count ?? 7);
    const count = Number.isFinite(countRaw) ? Math.max(1, Math.min(30, Math.floor(countRaw))) : 7;
    try {
        const result = await (0, schedulerService_1.runManualCollectTicks)(count, 1);
        const logs = (0, collectLogService_1.getCollectLogs)(count);
        res.json({
            ...result,
            logs,
        });
    }
    catch (error) {
        const detail = formatErrorDetail(error);
        res.status(500).json({ message: '수동 수집 실행 중 오류가 발생했습니다.', detail });
    }
}
async function collectStatusController(_req, res) {
    try {
        const status = (0, schedulerService_1.getSchedulerStatus)();
        res.json(status);
    }
    catch (error) {
        const detail = formatErrorDetail(error);
        res.status(500).json({ message: '스케줄러 상태 조회 중 오류가 발생했습니다.', detail });
    }
}
async function collectTriggerController(req, res) {
    const configuredToken = env_1.env.autoCollectTriggerToken.trim();
    if (!configuredToken) {
        res.status(503).json({
            message: 'AUTO_COLLECT_TRIGGER_TOKEN이 설정되지 않아 외부 트리거가 비활성화되어 있습니다.',
        });
        return;
    }
    const authHeader = String(req.headers.authorization ?? '').trim();
    const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
        ? authHeader.slice(7).trim()
        : '';
    const queryToken = String(req.query.token ?? '').trim();
    const bodyToken = String(req.body?.token ?? '').trim();
    const providedToken = bearerToken || queryToken || bodyToken;
    if (!providedToken || providedToken !== configuredToken) {
        res.status(401).json({ message: '유효한 트리거 토큰이 필요합니다.' });
        return;
    }
    try {
        const result = await (0, schedulerService_1.runExternalCollectOnce)();
        res.json(result);
    }
    catch (error) {
        const detail = formatErrorDetail(error);
        res.status(500).json({ message: '외부 수집 트리거 실행 중 오류가 발생했습니다.', detail });
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
