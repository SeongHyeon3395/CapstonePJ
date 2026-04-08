"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.askChatController = askChatController;
const aiService_1 = require("../services/aiService");
const newsService_1 = require("../services/newsService");
async function askChatController(req, res) {
    const articleId = String(req.body?.article_id ?? '').trim();
    const question = String(req.body?.question ?? '').trim();
    if (!articleId || !question) {
        res.status(400).json({ message: 'article_id와 question이 필요합니다.' });
        return;
    }
    try {
        const content = await (0, newsService_1.getArticleContentById)(articleId);
        if (!content) {
            res.status(404).json({ message: '해당 기사를 찾을 수 없습니다.' });
            return;
        }
        const answer = await (0, aiService_1.answerFromArticle)(content, question);
        res.json({ answer });
    }
    catch (error) {
        res.status(500).json({
            message: '질문 처리 중 오류가 발생했습니다.',
            detail: error instanceof Error ? error.message : String(error),
        });
    }
}
