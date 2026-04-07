import { Router } from 'express';
import { askChatController } from '../controllers/chatController';

export const chatRoutes = Router();

chatRoutes.post('/ask', askChatController);
