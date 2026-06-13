import express from 'express';
import {
  configureGitRepository,
  syncGitActivities,
  getGitActivities,
  githubWebhookHandler,
} from '../controllers/gitController.js';
import { protect, authorizeWorkspaceRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Webhook receiver endpoint (Public, called by GitHub webhook service)
router.post('/webhook/:workspaceId', githubWebhookHandler);

// Configure repository path (Admins & Managers only)
router.post(
  '/config',
  protect,
  authorizeWorkspaceRole(['Admin', 'Manager']),
  configureGitRepository
);

// Sync commits (All workspace members can trigger)
router.post(
  '/sync',
  protect,
  authorizeWorkspaceRole(['Admin', 'Manager', 'Member']),
  syncGitActivities
);

// Get synced commits stream (All workspace members)
router.get(
  '/',
  protect,
  authorizeWorkspaceRole(['Admin', 'Manager', 'Member']),
  getGitActivities
);

export default router;
