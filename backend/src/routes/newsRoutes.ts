import { Router } from 'express';
import { analyzeNewsController, newsStatsController } from '../controllers/newsController';

export const newsRoutes = Router();

newsRoutes.get('/analyze', analyzeNewsController);
newsRoutes.get('/stats', newsStatsController);
