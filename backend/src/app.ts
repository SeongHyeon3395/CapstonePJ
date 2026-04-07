import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { chatRoutes } from './routes/chatRoutes';
import { newsRoutes } from './routes/newsRoutes';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/news', newsRoutes);
app.use('/api/chat', chatRoutes);

app.listen(env.port, () => {
  console.log(`Spectrum backend listening on port ${env.port}`);
});
