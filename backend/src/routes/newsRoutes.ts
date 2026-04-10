import { Router } from 'express';
import {
	analyzeNewsController,
	articleByIdController,
	collectLogsController,
	collectStatusController,
	collectTestRunController,
	collectTriggerController,
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
newsRoutes.get('/collect/status', collectStatusController);
newsRoutes.post('/collect/trigger', collectTriggerController);
newsRoutes.post('/collect/test-run', collectTestRunController);
