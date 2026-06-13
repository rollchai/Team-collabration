import express from 'express';
import {
  createSprint,
  getSprints,
  updateSprint,
  getSprintReport,
} from '../controllers/sprintController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/create', protect, createSprint);
router.get('/', protect, getSprints);
router.put('/:id', protect, updateSprint);
router.get('/:id/report', protect, getSprintReport);

export default router;
