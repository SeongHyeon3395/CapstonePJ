"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRoutes = void 0;
const express_1 = require("express");
const chatController_1 = require("../controllers/chatController");
exports.chatRoutes = (0, express_1.Router)();
exports.chatRoutes.post('/ask', chatController_1.askChatController);
