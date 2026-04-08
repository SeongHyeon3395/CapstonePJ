import type { Request, Response } from 'express';
import { analyzeNewsByKeyword, getArticleById, getRecentAnalyzedNews, getStatsByKeyword } from '../services/newsService';

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
