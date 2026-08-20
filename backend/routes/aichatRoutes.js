import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { getAIChatSession } from '../controllers/aiChatController.js';

const router = express.Router();

router.post('/AImessages', getAIChatSession);


export default router;
