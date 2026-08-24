import { parseVoiceCommand } from '../Service/voiceAssistant.js';
import Groq, { toFile } from 'groq-sdk';

// @desc    Process spoken voice command text into structured system actions
// @route   POST /api/voice/command
// @access  Private
export const processVoiceCommand = async (req, res, next) => {
  try {
    const { transcript, context } = req.body;

    if (!transcript || !transcript.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Voice transcript is required',
        action: 'UNKNOWN',
        spokenResponse: 'I did not hear any command. Please try speaking again.'
      });
    }

    const enrichedContext = {
      ...context,
      userName: req.user ? req.user.name : 'User'
    };

    const parsedCommand = await parseVoiceCommand(transcript, enrichedContext);

    return res.status(200).json({
      success: true,
      data: parsedCommand
    });
  } catch (error) {
    console.error('Error processing voice command:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process voice command',
      action: 'UNKNOWN',
      spokenResponse: 'An error occurred while processing your voice instruction.'
    });
  }
};

// @desc    Process raw recorded voice audio file via Whisper and execute actions
// @route   POST /api/voice/audio
// @access  Private
export const processVoiceAudio = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Audio recording file is required',
        action: 'UNKNOWN',
        spokenResponse: 'No audio received. Please try speaking again.'
      });
    }

    let parsedContext = {};
    if (req.body.context) {
      try {
        parsedContext = typeof req.body.context === 'string' ? JSON.parse(req.body.context) : req.body.context;
      } catch (e) {
        parsedContext = {};
      }
    }

    const enrichedContext = {
      ...parsedContext,
      userName: req.user ? req.user.name : 'User'
    };

    let transcript = '';

    // 1. Transcribe audio with Groq Whisper Large v3
    if (process.env.GROQ_API_KEY) {
      try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const audioFile = await toFile(req.file.buffer, 'voice_recording.webm', {
          type: req.file.mimetype || 'audio/webm'
        });

        const transcription = await groq.audio.transcriptions.create({
          file: audioFile,
          model: 'whisper-large-v3-turbo',
          temperature: 0.0
        });

        transcript = transcription.text;
      } catch (transcribeError) {
        console.error('Groq Whisper transcription error:', transcribeError.message);
      }
    }

    if (!transcript || !transcript.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Could not transcribe speech audio',
        action: 'UNKNOWN',
        spokenResponse: 'I could not hear any clear speech in the audio. Please try again.'
      });
    }

    // 2. Parse instruction into structured system action
    const parsedCommand = await parseVoiceCommand(transcript, enrichedContext);

    return res.status(200).json({
      success: true,
      transcript,
      data: parsedCommand
    });
  } catch (error) {
    console.error('Error processing audio recording:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process audio recording',
      action: 'UNKNOWN',
      spokenResponse: 'An error occurred while processing your voice recording.'
    });
  }
};
