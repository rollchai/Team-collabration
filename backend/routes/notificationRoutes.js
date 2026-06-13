import express from 'express';
import { getNotifications, markNotificationsRead } from '../controllers/notificationController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getNotifications);
router.put('/mark-read', protect, markNotificationsRead);

export default router;
