import express from 'express';
import {
  createChannel,
  getWorkspaceChannels,
  getOrCreateDMChannel,
} from '../controllers/channelController.js';
import { protect, authorizeWorkspaceRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post(
  '/create',
  protect,
  authorizeWorkspaceRole(['Admin', 'Manager']),
  createChannel
);
router.get('/workspace/:workspaceId', protect, getWorkspaceChannels);
router.post('/dm', protect, getOrCreateDMChannel);

export default router;
