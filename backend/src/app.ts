import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { analyzeNewsController, newsStatsController } from './controllers/newsController';
import { chatRoutes } from './routes/chatRoutes';
import { newsRoutes } from './routes/newsRoutes';
import { startAutoCollectScheduler } from './services/schedulerService';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/stats', newsStatsController);
app.get('/api/analyze', analyzeNewsController);

app.use('/api/news', newsRoutes);
app.use('/api/chat', chatRoutes);

app.listen(env.port, () => {
  console.log(`Spectrum backend listening on port ${env.port}`);
  startAutoCollectScheduler();
});
