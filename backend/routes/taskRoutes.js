import express from 'express';
import {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  addTaskComment,
} from '../controllers/taskController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/create', protect, createTask);
router.get('/', protect, getTasks);
router.put('/:id', protect, updateTask);
router.delete('/:id', protect, deleteTask);
router.post('/:id/comments', protect, addTaskComment);

export default router;
