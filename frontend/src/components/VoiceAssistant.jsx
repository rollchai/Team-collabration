import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  X,
  Loader2,
  CheckCircle2,
  Send,
  Radio,
  RotateCcw
} from 'lucide-react';
import API from '../services/api';
import {
  createWorkspace,
  joinWorkspaceByCode,
  fetchWorkspaces
} from '../redux/slices/workspaceSlice';
import { createTask } from '../redux/slices/taskSlice';
import { toast } from 'react-toastify';

const VoiceAssistant = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { user } = useSelector((state) => state.auth);
  const { currentWorkspace } = useSelector((state) => state.workspace);

  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [typedInput, setTypedInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [lastAction, setLastAction] = useState(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // References for Audio Recording
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);

  // Initialize Web Speech Recognition for live transcript previews
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          if (currentTranscript) {
            setTranscript(currentTranscript);
          }
        };

        recognition.onerror = (event) => {
          // Ignore network glitch since MediaRecorder + Whisper handles the audio safely
          console.log('Interim recognition event:', event.error);
        };

        recognitionRef.current = recognition;
      } catch (err) {
        console.warn('SpeechRecognition init:', err);
      }
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try { mediaRecorderRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  // Speak aloud text using Web SpeechSynthesis
  const speakText = (text) => {
    if (!voiceEnabled || !('speechSynthesis' in window) || !text) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis failed:', e);
    }
  };

  // Start recording audio with MediaRecorder (works across all browsers)
  const startRecording = async () => {
    try {
      setIsOpen(true);
      setTranscript('');
      setResponseMessage('');
      setLastAction(null);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsListening(false);
        stream.getTracks().forEach((track) => track.stop());

        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await handleProcessAudio(audioBlob);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsListening(true);

      // Start interim recognition if available
      if (recognitionRef.current) {
        try { recognitionRef.current.start(); } catch (e) {}
      }
    } catch (micErr) {
      console.error('Microphone access error:', micErr);
      setIsListening(false);
      toast.error('Microphone access denied or unavailable. You can type commands below.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error('MediaRecorder stop error:', err);
      }
    }
    setIsListening(false);
  };

  // Toggle listening
  const toggleListening = () => {
    if (isListening) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Process recorded audio blob with Backend Whisper Large AI
  const handleProcessAudio = async (audioBlob) => {
    if (!audioBlob || processing) return;

    setProcessing(true);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice_command.webm');
      formData.append('context', JSON.stringify({
        workspaceName: currentWorkspace?.name || '',
        workspaceSlug: currentWorkspace?.slug || '',
        currentPath: location.pathname,
      }));

      const res = await API.post('/voice/audio', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success && res.data.data) {
        const { action, params, spokenResponse } = res.data.data;
        if (res.data.transcript) {
          setTranscript(res.data.transcript);
        }
        setResponseMessage(spokenResponse);
        setLastAction({ action, params });

        // Speak confirmation
        speakText(spokenResponse);

        // Execute system action
        await executeAction(action, params);
      } else {
        const fallback = 'I could not understand that instruction.';
        setResponseMessage(fallback);
        speakText(fallback);
      }
    } catch (error) {
      console.error('Audio processing failed:', error);
      const errMsg = error.response?.data?.spokenResponse || error.response?.data?.message || 'Error processing audio.';
      setResponseMessage(errMsg);
      speakText(errMsg);
    } finally {
      setProcessing(false);
    }
  };

  // Process text command (typed or suggestion chips)
  const handleProcessTextCommand = async (textToProcess) => {
    const queryText = (textToProcess || transcript || typedInput).trim();
    if (!queryText || processing) return;

    setProcessing(true);

    try {
      const context = {
        workspaceName: currentWorkspace?.name || '',
        workspaceSlug: currentWorkspace?.slug || '',
        currentPath: location.pathname,
      };

      const res = await API.post('/voice/command', {
        transcript: queryText,
        context,
      });

      if (res.data.success && res.data.data) {
        const { action, params, spokenResponse } = res.data.data;
        setResponseMessage(spokenResponse);
        setLastAction({ action, params });

        speakText(spokenResponse);
        await executeAction(action, params);
      } else {
        const fallback = 'I could not understand that instruction.';
        setResponseMessage(fallback);
        speakText(fallback);
      }
    } catch (error) {
      console.error('Text command execution failed:', error);
      const errMsg = error.response?.data?.message || 'Error processing instruction.';
      setResponseMessage(errMsg);
      speakText('Sorry, an error occurred while executing that command.');
    } finally {
      setProcessing(false);
      setTypedInput('');
    }
  };

  // Execute system actions
  const executeAction = async (action, params) => {
    switch (action) {
      case 'CREATE_WORKSPACE': {
        if (!params.name) return;
        toast.info(`Creating workspace "${params.name}"...`);
        const result = await dispatch(createWorkspace({ name: params.name }));
        if (createWorkspace.fulfilled.match(result)) {
          toast.success(`Workspace "${params.name}" created!`);
          navigate(`/workspace/${result.payload.workspace.slug}/dashboard`);
        } else {
          toast.error(result.payload || 'Failed to create workspace');
        }
        break;
      }

      case 'JOIN_WORKSPACE': {
        if (!params.inviteCode) return;
        toast.info(`Joining workspace with code ${params.inviteCode}...`);
        const result = await dispatch(joinWorkspaceByCode(params.inviteCode));
        if (joinWorkspaceByCode.fulfilled.match(result)) {
          toast.success('Workspace joined successfully!');
          dispatch(fetchWorkspaces());
          navigate(`/workspace/${result.payload.workspace.slug}/dashboard`);
        } else {
          toast.error(result.payload || 'Invalid code or already joined');
        }
        break;
      }

      case 'NAVIGATE': {
        if (params.page === 'workspaces') {
          navigate('/workspaces');
          return;
        }

        if (currentWorkspace?.slug) {
          navigate(`/workspace/${currentWorkspace.slug}/${params.page}`);
        } else {
          navigate('/workspaces');
          toast.info(`Opening ${params.page}. Please select a workspace.`);
        }
        break;
      }

      case 'CREATE_TASK': {
        if (!currentWorkspace?._id) {
          toast.warn('Please open a workspace first to create tasks.');
          speakText('Please open a workspace first before adding tasks.');
          return;
        }

        const taskData = {
          title: params.title || 'New Task',
          priority: params.priority || 'Medium',
          description: params.description || '',
          workspaceId: currentWorkspace._id,
        };

        const result = await dispatch(createTask(taskData));
        if (createTask.fulfilled.match(result)) {
          toast.success(`Task "${params.title}" added to backlog!`);
        } else {
          toast.error(result.payload || 'Failed to create task');
        }
        break;
      }

      default:
        break;
    }
  };

  // Only render if user is authenticated
  if (!user) return null;

  return (
    <>
      {/* FLOATING TRIGGER BUTTON */}
      <div className="fixed bottom-6 right-24 z-50 flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={toggleListening}
          title="SyncFlow Voice Assistant"
          className={`relative flex h-12 w-12 items-center justify-center rounded-2xl shadow-xl transition-all duration-300 cursor-pointer focus:outline-none border ${
            isListening
              ? 'bg-gradient-to-tr from-rose-500 to-pink-600 text-white border-rose-400 shadow-rose-500/30'
              : 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white border-violet-400/30 shadow-violet-600/30 hover:shadow-violet-600/50'
          }`}
        >
          {isListening && (
            <>
              <span className="absolute inset-0 rounded-2xl bg-rose-500/40 animate-ping pointer-events-none" />
              <span className="absolute -inset-1.5 rounded-2xl border-2 border-rose-500/60 animate-pulse pointer-events-none" />
            </>
          )}

          {isListening ? (
            <Radio className="h-6 w-6 animate-pulse" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </motion.button>
      </div>

      {/* VOICE ASSISTANT HUD / DIALOG */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed bottom-22 right-6 z-50 w-[390px] max-w-[calc(100vw-32px)] rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#070b14]/95 backdrop-blur-xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100"
          >
            {/* Header glow */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-violet-500 via-indigo-500 to-pink-500" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-500 to-indigo-500 text-white shadow-md shadow-violet-500/20">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-xs text-slate-900 dark:text-white">
                    SyncFlow Voice AI
                  </h3>
                  <p className="text-[10px] font-semibold text-slate-400">
                    {isListening ? 'Listening (Whisper AI)...' : processing ? 'Processing instruction...' : 'Ready for instruction'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors ${
                    voiceEnabled ? 'text-violet-500 dark:text-violet-400' : 'text-slate-300'
                  }`}
                  title={voiceEnabled ? 'Voice output enabled' : 'Voice output muted'}
                >
                  {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    if (isListening) stopRecording();
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[420px] overflow-y-auto">
              {/* Visualizer and Listening Status */}
              <div className="flex flex-col items-center justify-center py-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-900/80 relative overflow-hidden">
                <div className="flex items-center gap-1.5 h-12 mb-3">
                  {[40, 70, 30, 90, 50, 80, 45, 65].map((h, i) => (
                    <motion.div
                      key={i}
                      animate={
                        isListening
                          ? { height: [`${h * 0.3}%`, `${h}%`, `${h * 0.2}%`] }
                          : { height: '20%' }
                      }
                      transition={{
                        duration: 0.8,
                        repeat: isListening ? Infinity : 0,
                        delay: i * 0.08,
                        ease: 'easeInOut',
                      }}
                      className={`w-1.5 rounded-full ${
                        isListening
                          ? 'bg-gradient-to-t from-violet-500 to-pink-500'
                          : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    />
                  ))}
                </div>

                <p className="text-2xs font-bold text-slate-400 uppercase tracking-wider">
                  {isListening ? 'Speak now, then tap stop to execute' : processing ? 'Transcribing & Analyzing with AI...' : 'Tap the microphone or type below'}
                </p>
              </div>

              {/* Transcript Speech Bubble */}
              {transcript && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Spoken:</span>
                  <div className="p-3 bg-violet-50/60 dark:bg-violet-950/20 border border-violet-200/50 dark:border-violet-800/30 rounded-xl text-xs font-semibold text-slate-800 dark:text-violet-200">
                    "{transcript}"
                  </div>
                </div>
              )}

              {/* Processing Loader */}
              {processing && (
                <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs text-slate-500 font-semibold">
                  <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                  <span>Processing instruction with AI...</span>
                </div>
              )}

              {/* Response Message */}
              {responseMessage && !processing && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SyncFlow AI:</span>
                  <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{responseMessage}</span>
                  </div>
                </div>
              )}

              {/* Quick Suggestion Chips */}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Suggestions:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Create a workspace named Marketing Hub',
                    'Go to calendar',
                    'Create an urgent task to fix bugs',
                    'Take me to workspaces',
                  ].map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setTranscript(suggestion);
                        handleProcessTextCommand(suggestion);
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-violet-100 dark:bg-slate-900 dark:hover:bg-violet-950/50 text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-300 transition-colors border border-slate-200/60 dark:border-slate-800 cursor-pointer text-left"
                    >
                      "{suggestion}"
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Input & Voice Trigger */}
            <div className="p-3.5 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleProcessTextCommand(typedInput);
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  type="text"
                  placeholder="Speak or type a command..."
                  value={typedInput}
                  onChange={(e) => setTypedInput(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-violet-500"
                />
                {typedInput.trim() ? (
                  <button
                    type="submit"
                    className="p-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white cursor-pointer shadow-md"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`p-2 rounded-xl text-white cursor-pointer shadow-md transition-all ${
                      isListening ? 'bg-rose-500 hover:bg-rose-600' : 'bg-violet-600 hover:bg-violet-700'
                    }`}
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                )}
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VoiceAssistant;
