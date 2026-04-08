"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newsRoutes = void 0;
const express_1 = require("express");
const newsController_1 = require("../controllers/newsController");
exports.newsRoutes = (0, express_1.Router)();
exports.newsRoutes.get('/', newsController_1.analyzeNewsController);
exports.newsRoutes.get('/analyze', newsController_1.analyzeNewsController);
exports.newsRoutes.get('/stats', newsController_1.newsStatsController);
