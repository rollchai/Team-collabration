import express from 'express';
import { uploadFile, getFiles, createLink, deleteFile } from '../controllers/fileController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { upload } from '../config/multer.js';

const router = express.Router();

router.post('/upload', protect, upload.single('file'), uploadFile);
router.post('/link', protect, createLink);
router.get('/', protect, getFiles);
router.delete('/:id', protect, deleteFile);

export default router;
