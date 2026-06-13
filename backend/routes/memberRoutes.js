import express from 'express';
import { getWorkspaceMembers, updateMemberRole } from '../controllers/memberController.js';
import { protect, authorizeWorkspaceRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getWorkspaceMembers);
router.put(
  '/role',
  protect,
  authorizeWorkspaceRole(['Admin']),
  updateMemberRole
);

export default router;
