"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const env_1 = require("./config/env");
const newsController_1 = require("./controllers/newsController");
const chatRoutes_1 = require("./routes/chatRoutes");
const newsRoutes_1 = require("./routes/newsRoutes");
const schedulerService_1 = require("./services/schedulerService");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '1mb' }));
app.get('/health', (_req, res) => {
    res.json({ ok: true });
});
app.get('/api/stats', newsController_1.newsStatsController);
app.get('/api/analyze', newsController_1.analyzeNewsController);
app.use('/api/news', newsRoutes_1.newsRoutes);
app.use('/api/chat', chatRoutes_1.chatRoutes);
app.listen(env_1.env.port, () => {
    console.log(`Spectrum backend listening on port ${env_1.env.port}`);
    (0, schedulerService_1.startAutoCollectScheduler)();
});
