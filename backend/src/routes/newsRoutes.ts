import { Router } from 'express';
import {
	analyzeNewsController,
	articleByIdController,
	collectLogsController,
	collectTestRunController,
	newsStatsController,
	recentNewsController,
} from '../controllers/newsController';

export const newsRoutes = Router();

newsRoutes.get('/', analyzeNewsController);
newsRoutes.get('/analyze', analyzeNewsController);
newsRoutes.get('/stats', newsStatsController);
newsRoutes.get('/recent', recentNewsController);
newsRoutes.get('/article/:id', articleByIdController);
newsRoutes.get('/collect/logs', collectLogsController);
newsRoutes.post('/collect/test-run', collectTestRunController);
