import express from 'express';
import {
  createWorkspace,
  getWorkspaces,
  inviteMember,
  joinWorkspace,
  deleteWorkspace,
} from '../controllers/workspaceController.js';
import { protect, authorizeWorkspaceRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/create', protect, createWorkspace);
router.get('/', protect, getWorkspaces);
router.post(
  '/invite',
  protect,
  authorizeWorkspaceRole(['Admin', 'Manager']),
  inviteMember
);
router.post('/join/:inviteCode', protect, joinWorkspace);
router.delete(
  '/:workspaceId',
  protect,
  authorizeWorkspaceRole(['Admin']),
  deleteWorkspace
);

export default router;
