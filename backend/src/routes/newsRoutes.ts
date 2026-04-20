import { Router } from 'express';
import {
	analyzeNewsController,
	articleByIdController,
	collectLogsController,
	collectStatusController,
	collectTriggerController,
	clearAnalysisHistoryController,
	manualAnalyzeController,
	newsStatsController,
	recentNewsController,
	userAnalysisHistoryController,
} from '../controllers/newsController';

export const newsRoutes = Router();

newsRoutes.get('/', analyzeNewsController);
newsRoutes.get('/analyze', analyzeNewsController);
newsRoutes.post('/manual-analyze', manualAnalyzeController);
newsRoutes.get('/manual-history', userAnalysisHistoryController);
newsRoutes.delete('/manual-history', clearAnalysisHistoryController);
newsRoutes.get('/stats', newsStatsController);
newsRoutes.get('/recent', recentNewsController);
newsRoutes.get('/article/:id', articleByIdController);
newsRoutes.get('/collect/logs', collectLogsController);
newsRoutes.get('/collect/status', collectStatusController);
newsRoutes.post('/collect/trigger', collectTriggerController);
