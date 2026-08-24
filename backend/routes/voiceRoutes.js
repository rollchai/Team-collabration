import express from 'express';
import multer from 'multer';
import { protect } from '../middlewares/authMiddleware.js';
import { processVoiceCommand, processVoiceAudio } from '../controllers/voiceController.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // Max 10MB audio
});

// Process text transcript command
router.post('/command', protect, processVoiceCommand);

// Process recorded audio file (Whisper Speech-to-Text + AI Action)
router.post('/audio', protect, upload.single('audio'), processVoiceAudio);

export default router;
