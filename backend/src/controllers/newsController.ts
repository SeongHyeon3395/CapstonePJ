import type { Request, Response } from 'express';
import { analyzeNewsByKeyword, getStatsByKeyword } from '../services/newsService';

export async function analyzeNewsController(req: Request, res: Response): Promise<void> {
  const keyword = String(req.query.keyword ?? '').trim();
  if (!keyword) {
    res.status(400).json({ message: 'keyword 쿼리 파라미터가 필요합니다.' });
    return;
  }

  try {
    const result = await analyzeNewsByKeyword(keyword);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: '뉴스 분석 중 오류가 발생했습니다.',
      detail: error instanceof Error ? error.message : String(error),
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
    res.status(500).json({
      message: '뉴스 통계 집계 중 오류가 발생했습니다.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
