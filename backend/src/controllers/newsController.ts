import type { Request, Response } from 'express';
import { env } from '../config/env';
import {
  LinkAccessBlockedError,
  analyzeManualArticle,
  analyzeNewsByKeyword,
  clearUserAnalysisHistory,
  getArticleById,
  getRecentAnalyzedNews,
  getStatsByKeyword,
  getUserAnalysisHistory,
} from '../services/newsService';
import { getCollectLogs } from '../services/collectLogService';
import { getSchedulerStatus, runExternalCollectOnce } from '../services/schedulerService';

export async function analyzeNewsController(req: Request, res: Response): Promise<void> {
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
    const result = await analyzeNewsByKeyword(keyword, { targetCount, publishedAfter });
    res.json(result);
  } catch (error) {
    const detail = formatErrorDetail(error);
    res.status(500).json({
      message: '뉴스 분석 중 오류가 발생했습니다.',
      detail,
    });
  }
}

export async function newsStatsController(req: Request, res: Response): Promise<void> {
  const keyword = String(req.query.keyword ?? '').trim();
  if (!keyword) {
    res.status(400).json({ message: 'keyword 쿼리 파라미터가 필요합니다.' });
    return;
  }

  try {
    const stats = await getStatsByKeyword(keyword);
    res.json(stats);
  } catch (error) {
    const detail = formatErrorDetail(error);
    res.status(500).json({
      message: '뉴스 통계 집계 중 오류가 발생했습니다.',
      detail,
    });
  }
}

export async function recentNewsController(req: Request, res: Response): Promise<void> {
  const limitRaw = Number(req.query.limit ?? 50);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(500, Math.floor(limitRaw))) : 50;
  const keyword = String(req.query.keyword ?? '').trim();
  const cursorCreatedAt = String(req.query.cursor_created_at ?? '').trim();
  const cursorId = String(req.query.cursor_id ?? '').trim();

  try {
    const result = await getRecentAnalyzedNews(limit, keyword, cursorCreatedAt, cursorId);
    res.json(result);
  } catch (error) {
    const detail = formatErrorDetail(error);
    res.status(500).json({
      message: '최근 뉴스 조회 중 오류가 발생했습니다.',
      detail,
    });
  }
}

export async function articleByIdController(req: Request, res: Response): Promise<void> {
  const articleId = String(req.params.id ?? '').trim();
  if (!articleId) {
    res.status(400).json({ message: 'article id가 필요합니다.' });
    return;
  }

  try {
    const article = await getArticleById(articleId);
    if (!article) {
      res.status(404).json({ message: '해당 기사를 찾을 수 없습니다.' });
      return;
    }
    res.json(article);
  } catch (error) {
    const detail = formatErrorDetail(error);
    res.status(500).json({ message: '기사 조회 중 오류가 발생했습니다.', detail });
  }
}

export async function manualAnalyzeController(req: Request, res: Response): Promise<void> {
  const userId = String(req.body?.user_id ?? req.body?.userId ?? '').trim();
  const input = String(req.body?.input ?? '').trim();

  if (!userId) {
    res.status(400).json({ message: 'user_id가 필요합니다.' });
    return;
  }

  if (!input) {
    res.status(400).json({ message: '링크 또는 본문 입력(input)이 필요합니다.' });
    return;
  }

  try {
    const result = await analyzeManualArticle({ userId, input });
    res.json(result);
  } catch (error) {
    if (error instanceof LinkAccessBlockedError) {
      res.status(422).json({
        code: 'LINK_ACCESS_BLOCKED',
        message: error.message,
      });
      return;
    }

    const detail = formatErrorDetail(error);
    res.status(500).json({
      message: '수동 기사 분석 중 오류가 발생했습니다.',
      detail,
    });
  }
}

export async function userAnalysisHistoryController(req: Request, res: Response): Promise<void> {
  const userId = String(req.query.user_id ?? '').trim();
  const limitRaw = Number(req.query.limit ?? 50);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, Math.floor(limitRaw))) : 50;

  if (!userId) {
    res.status(400).json({ message: 'user_id가 필요합니다.' });
    return;
  }

  try {
    const articles = await getUserAnalysisHistory(userId, limit);
    res.json({
      total: articles.length,
      articles,
    });
  } catch (error) {
    const detail = formatErrorDetail(error);
    res.status(500).json({
      message: '사용자 분석 기록 조회 중 오류가 발생했습니다.',
      detail,
    });
  }
}

export async function clearAnalysisHistoryController(req: Request, res: Response): Promise<void> {
  const userId = String(req.query.user_id ?? req.body?.user_id ?? '').trim();
  if (!userId) {
    res.status(400).json({ message: 'user_id가 필요합니다.' });
    return;
  }

  try {
    await clearUserAnalysisHistory(userId);
    res.json({ ok: true });
  } catch (error) {
    const detail = formatErrorDetail(error);
    res.status(500).json({
      message: '분석 기록 초기화 중 오류가 발생했습니다.',
      detail,
    });
  }
}

export async function collectLogsController(req: Request, res: Response): Promise<void> {
  const limitRaw = Number(req.query.limit ?? 7);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(50, Math.floor(limitRaw))) : 7;
  const includeManualTest = String(req.query.include_test ?? '').toLowerCase() === 'true';

  try {
    const logs = getCollectLogs(limit, includeManualTest);
    res.json({
      total: logs.length,
      logs,
    });
  } catch (error) {
    const detail = formatErrorDetail(error);
    res.status(500).json({ message: '수집 로그 조회 중 오류가 발생했습니다.', detail });
  }
}

export async function collectStatusController(_req: Request, res: Response): Promise<void> {
  try {
    const status = getSchedulerStatus();
    res.json(status);
  } catch (error) {
    const detail = formatErrorDetail(error);
    res.status(500).json({ message: '스케줄러 상태 조회 중 오류가 발생했습니다.', detail });
  }
}

export async function collectTriggerController(req: Request, res: Response): Promise<void> {
  const configuredToken = env.autoCollectTriggerToken.trim();
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
    const result = await runExternalCollectOnce();
    res.json(result);
  } catch (error) {
    const detail = formatErrorDetail(error);
    res.status(500).json({ message: '외부 수집 트리거 실행 중 오류가 발생했습니다.', detail });
  }
}

function formatErrorDetail(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
