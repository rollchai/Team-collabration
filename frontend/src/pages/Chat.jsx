import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Hash,
  Send,
  Paperclip,
  Plus,
  Loader2,
  Image,
  FileText,
  FileCode,
  Download,
  AlertCircle,
  Eye,
  CornerDownRight,
  MessageSquare,
  X,
  Mic,
  MicOff,
  Headphones,
  PhoneOff,
  Volume2,
  Monitor,
} from 'lucide-react';
import { fetchChannels, setCurrentChannel, createChannel, fetchOrCreateDM } from '../redux/slices/channelSlice';
import { socket } from '../layouts/DashboardLayout';
import API from '../services/api';
import { toast } from 'react-toastify';

const AudioPlayer = ({ stream, isDeafened }) => {
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <audio
      ref={audioRef}
      autoPlay
      muted={isDeafened}
      className="hidden"
    />
  );
};

const VideoPlayer = ({ stream, userName }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black shadow-lg">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-auto max-h-[360px] object-contain"
      />
      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-white text-3xs font-extrabold tracking-wide">
        📺 {userName}'s Screen
      </div>
    </div>
  );
};

const Chat = () => {
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.auth);
  const { currentWorkspace, currentRole } = useSelector((state) => state.workspace);
  const { channels, currentChannel, loading: channelsLoading } = useSelector((state) => state.channel);

  // States
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  
  // File Upload states
  const [attachingFile, setAttachingFile] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null); // holds uploaded file object
  
  // Create Channel Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');

  // Typing state
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typerName, setTyperName] = useState('');

  // Refs for scrolling and files
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // WebRTC Live Audio Huddle states & refs
  const localStreamRef = useRef(null);
  const peersRef = useRef(new Map());
  const speakingIntervalRef = useRef(null);

  const [inHuddle, setInHuddle] = useState(false);
  const [huddleChannelId, setHuddleChannelId] = useState(null);
  const [huddleParticipants, setHuddleParticipants] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [localMuted, setLocalMuted] = useState(false);
  const [localDeafened, setLocalDeafened] = useState(false);
  const [workspaceHuddles, setWorkspaceHuddles] = useState({});

  // WebRTC Screen Sharing states & refs
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const localScreenStreamRef = useRef(null);
  const screenSendersRef = useRef(new Map()); // peerSocketId -> RTCRtpSender
  const [remoteScreenShares, setRemoteScreenShares] = useState([]);

  // Fetch all workspace members for DMs list
  const [members, setMembers] = useState([]);
  useEffect(() => {
    if (currentWorkspace?._id) {
      API.get(`/members?workspaceId=${currentWorkspace._id}`)
        .then((res) => {
          // Filter out logged in user from DMs list
          const others = res.data.members.filter((m) => m.user._id !== user?._id);
          setMembers(others);
        })
        .catch((err) => console.error(err));
    }
  }, [currentWorkspace, user]);

  // ----------------------------------------------------
  // WebRTC LIVE VOICE HUDDLES INTEGRATION
  // ----------------------------------------------------

  // Sync huddle indicators across channels
  useEffect(() => {
    if (!socket) return;

    const handleHuddleStatus = (data) => {
      const { channelId, participantsCount } = data;
      setWorkspaceHuddles((prev) => ({
        ...prev,
        [channelId]: participantsCount,
      }));
    };

    socket.on('huddle_status_update', handleHuddleStatus);

    return () => {
      socket.off('huddle_status_update', handleHuddleStatus);
    };
  }, []);

  // WebRTC socket signaling handler
  useEffect(() => {
    if (!socket || !inHuddle) return;

    const handleHuddleUsersList = async (users) => {
      console.log('Received active huddle users list:', users);
      // We are the joiner, initiate PeerConnections and send SDP offers to existing users
      const newParticipants = [
        ...users,
        {
          socketId: socket.id,
          userId: user._id,
          name: user.name,
          avatar: user.avatar,
          isMuted: localMuted,
          isSpeaking: false,
        },
      ];
      setHuddleParticipants(newParticipants);

      for (const peerUser of users) {
        try {
          const peer = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
          });

          // Add our local tracks
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
              peer.addTrack(track, localStreamRef.current);
            });
          }
          if (localScreenStreamRef.current) {
            const videoTrack = localScreenStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
              const sender = peer.addTrack(videoTrack, localScreenStreamRef.current);
              screenSendersRef.current.set(peerUser.socketId, sender);
            }
          }

          // Handle candidate exchange
          peer.onicecandidate = (event) => {
            if (event.candidate) {
              socket.emit('send_signal', {
                toSocketId: peerUser.socketId,
                signal: { candidate: event.candidate },
              });
            }
          };

          // Handle incoming audio/video track
          peer.ontrack = (event) => {
            console.log('Received remote track from:', peerUser.name, 'Kind:', event.track.kind);
            const remoteStream = event.streams[0];
            if (event.track.kind === 'video') {
              setRemoteScreenShares((prev) => {
                if (prev.some((p) => p.socketId === peerUser.socketId)) return prev;
                return [...prev, { socketId: peerUser.socketId, stream: remoteStream, userName: peerUser.name }];
              });
              event.track.onended = () => {
                setRemoteScreenShares((prev) => prev.filter((p) => p.socketId !== peerUser.socketId));
              };
            } else {
              setRemoteStreams((prev) => {
                if (prev.some((p) => p.socketId === peerUser.socketId)) return prev;
                return [...prev, { socketId: peerUser.socketId, stream: remoteStream }];
              });
            }
          };

          // Create and send SDP Offer
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          socket.emit('send_signal', {
            toSocketId: peerUser.socketId,
            signal: { sdp: peer.localDescription },
          });

          peersRef.current.set(peerUser.socketId, peer);
        } catch (e) {
          console.error('Error establishing RTCPeerConnection to user:', peerUser.name, e);
        }
      }
    };

    const handleHuddleUserJoined = (participant) => {
      console.log('Another huddle user joined:', participant);
      setHuddleParticipants((prev) => {
        if (prev.some((p) => p.socketId === participant.socketId)) return prev;
        return [...prev, participant];
      });
    };

    const handleSignalReceived = async (data) => {
      const { signal, fromSocketId, fromUser } = data;

      let peer = peersRef.current.get(fromSocketId);
      if (!peer && fromUser) {
        // Create peer connection if we don't have one for this user
        peer = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => {
            peer.addTrack(track, localStreamRef.current);
          });
        }
        if (localScreenStreamRef.current) {
          const videoTrack = localScreenStreamRef.current.getVideoTracks()[0];
          if (videoTrack) {
            const sender = peer.addTrack(videoTrack, localScreenStreamRef.current);
            screenSendersRef.current.set(fromSocketId, sender);
          }
        }

        peer.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('return_signal', {
              toSocketId: fromSocketId,
              signal: { candidate: event.candidate },
            });
          }
        };

        peer.ontrack = (event) => {
          console.log('Received remote track from:', fromUser.name, 'Kind:', event.track.kind);
          const remoteStream = event.streams[0];
          if (event.track.kind === 'video') {
            setRemoteScreenShares((prev) => {
              if (prev.some((p) => p.socketId === fromSocketId)) return prev;
              return [...prev, { socketId: fromSocketId, stream: remoteStream, userName: fromUser.name }];
            });
            event.track.onended = () => {
              setRemoteScreenShares((prev) => prev.filter((p) => p.socketId !== fromSocketId));
            };
          } else {
            setRemoteStreams((prev) => {
              if (prev.some((p) => p.socketId === fromSocketId)) return prev;
              return [...prev, { socketId: fromSocketId, stream: remoteStream }];
            });
          }
        };

        peersRef.current.set(fromSocketId, peer);
        setHuddleParticipants((prev) => {
          if (prev.some((p) => p.socketId === fromSocketId)) return prev;
          return [...prev, fromUser];
        });
      }

      if (peer) {
        try {
          if (signal.sdp) {
            if (signal.sdp.type === 'offer') {
              await peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
              const answer = await peer.createAnswer();
              await peer.setLocalDescription(answer);
              socket.emit('return_signal', {
                toSocketId: fromSocketId,
                signal: { sdp: peer.localDescription },
              });
            } else if (signal.sdp.type === 'answer') {
              await peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            }
          } else if (signal.candidate) {
            await peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
        } catch (e) {
          console.error('Error handling signaling packet from:', fromSocketId, e);
        }
      }
    };

    const handleSignalReturned = async (data) => {
      const { signal, fromSocketId } = data;
      const peer = peersRef.current.get(fromSocketId);
      if (peer) {
        try {
          if (signal.sdp) {
            await peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          } else if (signal.candidate) {
            await peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
        } catch (e) {
          console.error('Error setting returned description/candidate:', e);
        }
      }
    };

    const handleHuddleUserLeft = (data) => {
      const { socketId } = data;
      console.log('Huddle user left call:', socketId);
      const peer = peersRef.current.get(socketId);
      if (peer) {
        peer.close();
        peersRef.current.delete(socketId);
      }
      setRemoteStreams((prev) => prev.filter((p) => p.socketId !== socketId));
      setRemoteScreenShares((prev) => prev.filter((p) => p.socketId !== socketId));
      setHuddleParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
    };

    const handleHuddleUserSpeaking = (data) => {
      const { socketId, isSpeaking } = data;
      setHuddleParticipants((prev) =>
        prev.map((p) => (p.socketId === socketId ? { ...p, isSpeaking } : p))
      );
    };

    socket.on('huddle_users_list', handleHuddleUsersList);
    socket.on('huddle_user_joined', handleHuddleUserJoined);
    socket.on('signal_received', handleSignalReceived);
    socket.on('signal_returned', handleSignalReturned);
    socket.on('huddle_user_left', handleHuddleUserLeft);
    socket.on('huddle_user_speaking', handleHuddleUserSpeaking);

    return () => {
      socket.off('huddle_users_list', handleHuddleUsersList);
      socket.off('huddle_user_joined', handleHuddleUserJoined);
      socket.off('signal_received', handleSignalReceived);
      socket.off('signal_returned', handleSignalReturned);
      socket.off('huddle_user_left', handleHuddleUserLeft);
      socket.off('huddle_user_speaking', handleHuddleUserSpeaking);
    };
  }, [inHuddle, localMuted]);

  // Speaking voice activity detection loop
  const startSpeakingDetection = (stream, chanId) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let wasSpeaking = false;

      speakingIntervalRef.current = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        let total = 0;
        for (let i = 0; i < bufferLength; i++) {
          total += dataArray[i];
        }
        const average = total / bufferLength;
        const isSpeakingNow = average > 12; // Speak threshold

        if (isSpeakingNow !== wasSpeaking) {
          wasSpeaking = isSpeakingNow;
          if (socket) {
            socket.emit('huddle_speaking', {
              channelId: chanId,
              isSpeaking: isSpeakingNow,
            });
          }
          setHuddleParticipants((prev) =>
            prev.map((p) => (p.socketId === socket?.id ? { ...p, isSpeaking: isSpeakingNow } : p))
          );
        }
      }, 200);
    } catch (e) {
      console.error('Audio speaking analysis error:', e);
    }
  };

  // Leave Voice Huddle Room
  const leaveVoiceHuddle = () => {
    if (speakingIntervalRef.current) {
      clearInterval(speakingIntervalRef.current);
      speakingIntervalRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach((t) => t.stop());
      localScreenStreamRef.current = null;
    }
    setIsScreenSharing(false);
    screenSendersRef.current.clear();
    setRemoteScreenShares([]);

    peersRef.current.forEach((peer) => peer.close());
    peersRef.current.clear();

    if (socket && huddleChannelId) {
      socket.emit('leave_huddle', { channelId: huddleChannelId });
    }

    setInHuddle(false);
    setHuddleChannelId(null);
    setHuddleParticipants([]);
    setRemoteStreams([]);
  };

  // Join Voice Huddle Room
  const handleJoinHuddle = async (chanId) => {
    try {
      if (inHuddle) {
        leaveVoiceHuddle();
        if (huddleChannelId === chanId) {
          // Toggled huddle off
          return;
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      stream.getAudioTracks().forEach((t) => (t.enabled = !localMuted));

      if (socket) {
        socket.emit('join_huddle', {
          channelId: chanId,
          workspaceId: currentWorkspace._id,
          user: { _id: user._id, name: user.name, avatar: user.avatar },
        });
      }

      setInHuddle(true);
      setHuddleChannelId(chanId);

      startSpeakingDetection(stream, chanId);
      toast.success('Connected to huddle voice channel!');
    } catch (err) {
      console.error('Mic access error:', err);
      toast.error('Failed to access microphone. Please check permissions.');
    }
  };

  // Local Microphone Mute Toggler
  const toggleLocalMute = () => {
    const nextMute = !localMuted;
    setLocalMuted(nextMute);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMute;
      });
    }
    setHuddleParticipants((prev) =>
      prev.map((p) => (p.socketId === socket?.id ? { ...p, isMuted: nextMute } : p))
    );
  };

  // Start Screen Sharing
  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      localScreenStreamRef.current = stream;
      setIsScreenSharing(true);

      const videoTrack = stream.getVideoTracks()[0];

      // Handle native browser "Stop Sharing" click
      videoTrack.onended = () => {
        stopScreenShare();
      };

      // Add track to all active peer connections and trigger negotiation
      for (const [peerSocketId, peer] of peersRef.current.entries()) {
        try {
          const sender = peer.addTrack(videoTrack, stream);
          screenSendersRef.current.set(peerSocketId, sender);

          // Renegotiate with this peer
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          socket.emit('send_signal', {
            toSocketId: peerSocketId,
            signal: { sdp: peer.localDescription },
            fromUser: {
              _id: user._id,
              name: user.name,
              avatar: user.avatar,
            },
          });
        } catch (err) {
          console.error('Error adding screen share track to peer:', peerSocketId, err);
        }
      }
      toast.success('Screen sharing started!');
    } catch (err) {
      console.error('Error getting display media:', err);
      toast.error('Failed to share screen');
      setIsScreenSharing(false);
    }
  };

  // Stop Screen Sharing
  const stopScreenShare = async () => {
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach((track) => track.stop());
      localScreenStreamRef.current = null;
    }
    setIsScreenSharing(false);

    // Remove video track from all peer connections and renegotiate
    for (const [peerSocketId, peer] of peersRef.current.entries()) {
      try {
        const sender = screenSendersRef.current.get(peerSocketId);
        if (sender) {
          peer.removeTrack(sender);
          screenSendersRef.current.delete(peerSocketId);

          // Renegotiate with this peer
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          socket.emit('send_signal', {
            toSocketId: peerSocketId,
            signal: { sdp: peer.localDescription },
            fromUser: {
              _id: user._id,
              name: user.name,
              avatar: user.avatar,
            },
          });
        }
      } catch (err) {
        console.error('Error removing screen share track from peer:', peerSocketId, err);
      }
    }
    toast.success('Screen sharing stopped.');
  };

  // Auto clean up huddle session on unmount
  useEffect(() => {
    return () => {
      leaveVoiceHuddle();
    };
  }, []);

  // Load chat messages when channel changes
  useEffect(() => {
    if (!currentChannel?._id) return;

    setMessagesLoading(true);
    API.get(`/chat/messages/${currentChannel._id}`)
      .then((res) => {
        setMessages(res.data.messages);
        setMessagesLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setMessagesLoading(false);
        toast.error('Failed to load chat history');
      });

    // Notify socket we are joining the channel room
    if (socket) {
      socket.emit('join_channel', currentChannel._id);
    }

    // Reset local inputs
    setMessageText('');
    setAttachedFile(null);

    return () => {
      if (socket && currentChannel?._id) {
        socket.emit('leave_channel', currentChannel._id);
      }
    };
  }, [currentChannel]);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Listen to incoming socket messages and typing indicators
  useEffect(() => {
    if (!socket) return;

    socket.on('message_received', (newMessage) => {
      // Check if message belongs to current channel
      if (currentChannel && newMessage.channel === currentChannel._id) {
        setMessages((prev) => {
          if (prev.some((msg) => msg._id === newMessage._id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
      }
    });

    socket.on('typing', (data) => {
      if (currentChannel && data.channelId === currentChannel._id) {
        setTyperName(data.userName);
        setIsTyping(true);
      }
    });

    socket.on('stop_typing', (data) => {
      if (currentChannel && data.channelId === currentChannel._id) {
        setIsTyping(false);
      }
    });

    return () => {
      socket.off('message_received');
      socket.off('typing');
      socket.off('stop_typing');
    };
  }, [currentChannel]);

  // Handle typing broadcasts
  const handleTyping = (e) => {
    setMessageText(e.target.value);

    if (!socket || !currentChannel) return;

    if (!typing) {
      setTyping(true);
      socket.emit('typing', {
        channelId: currentChannel._id,
        userName: user.name,
      });
    }

    // Debounce typing indicator timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', {
        channelId: currentChannel._id,
        userName: user.name,
      });
      setTyping(false);
    }, 1500);
  };

  // Submit Text/File Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!messageText.trim() && !attachedFile) || !currentChannel) return;

    const messageData = {
      content: messageText.trim(),
      channelId: currentChannel._id,
    };

    if (attachedFile) {
      messageData.fileUrl = attachedFile.url;
      messageData.fileName = attachedFile.name;
      messageData.fileSize = attachedFile.size;
      messageData.mimeType = attachedFile.mimeType;
      messageData.type = 'file';
    }

    try {
      const response = await API.post('/chat/message', messageData);
      if (response.data?.success) {
        // Emit newly saved message to workspace room
        if (socket) {
          socket.emit('new_message', response.data.message);
          // Stop typing indicators
          socket.emit('stop_typing', {
            channelId: currentChannel._id,
            userName: user.name,
          });
        }
        
        // Append locally
        setMessages((prev) => [...prev, response.data.message]);
        setMessageText('');
        setAttachedFile(null);
        setTyping(false);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to deliver message');
    }
  };

  // Handle file select and upload attachment
  const handleAttachClick = () => {
    fileInputRef.current.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentWorkspace) return;

    setAttachingFile(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspaceId', currentWorkspace._id);

    try {
      const res = await API.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.success) {
        setAttachedFile({
          url: res.data.file.url,
          name: res.data.file.name,
          size: res.data.file.size,
          mimeType: res.data.file.mimeType,
        });
        toast.success(`Attached ${file.name}`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to attach upload asset');
    } finally {
      setAttachingFile(false);
    }
  };

  // Create Channel Submit
  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannelName.trim() || !currentWorkspace) return;

    try {
      const resultAction = await dispatch(
        createChannel({
          name: newChannelName.toLowerCase().replace(/\s+/g, '-'),
          description: newChannelDesc,
          workspaceId: currentWorkspace._id,
        })
      );

      if (createChannel.fulfilled.match(resultAction)) {
        toast.success(`Channel #${newChannelName} created successfully!`);
        setNewChannelName('');
        setNewChannelDesc('');
        setCreateModalOpen(false);
        
        // Notify other socket users to sync channel list
        if (socket) {
          socket.emit('channel_created', resultAction.payload.channel);
        }
      } else {
        toast.error(resultAction.payload || 'Failed to create channel');
      }
    } catch (err) {
      toast.error('Error creating channel');
    }
  };

  // Fetch or launch DM channel
  const handleOpenDM = async (targetUserId) => {
    if (!currentWorkspace) return;
    try {
      const resultAction = await dispatch(
        fetchOrCreateDM({
          workspaceId: currentWorkspace._id,
          recipientId: targetUserId,
        })
      );
      if (fetchOrCreateDM.rejected.match(resultAction)) {
        toast.error(resultAction.payload || 'Failed to load conversation');
      }
    } catch (err) {
      toast.error('Error starting direct chat session');
    }
  };

  // Helper to extract DM recipient
  const getDMRecipient = (channel) => {
    if (!channel || channel.isGroup) return null;
    return channel.members.find((m) => m._id !== user?._id);
  };

  // Render file attachment card inside chat feed
  const renderAttachment = (file) => {
    if (!file) return null;

    const isImage = file.mimeType?.startsWith('image/');

    return (
      <div className="mt-2.5 rounded-xl border border-slate-200/40 dark:border-slate-800 bg-white/50 dark:bg-slate-950/40 overflow-hidden max-w-sm shadow-inner p-2.5">
        {isImage ? (
          <div className="relative group/img overflow-hidden rounded-lg border border-slate-100 dark:border-slate-900">
            <img
              src={file.url}
              alt={file.name}
              className="max-h-48 object-cover w-full cursor-pointer transition-transform duration-200 group-hover/img:scale-101"
            />
            <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/img:opacity-100 flex items-center justify-center gap-3 transition-opacity">
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-2 bg-white hover:bg-slate-50 text-slate-700 shadow flex items-center gap-1.5 text-2xs font-bold transition-all"
              >
                <Eye className="h-4 w-4" /> View Full
              </a>
              <a
                href={file.url}
                download={file.name}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow flex items-center gap-1.5 text-2xs font-bold transition-all"
              >
                <Download className="h-4 w-4" /> Get
              </a>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText className="h-8 w-8 text-emerald-500 shrink-0" />
              <div className="truncate">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate w-40">
                  {file.name}
                </p>
                <p className="text-3xs text-slate-400 dark:text-slate-500 font-bold">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <a
              href={file.url}
              download={file.name}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-400 hover:text-emerald-500 transition-colors shadow-2xs border border-slate-200/40 dark:border-slate-800 bg-white dark:bg-slate-900"
              title="Download file"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        )}
      </div>
    );
  };

  const dmRecipient = getDMRecipient(currentChannel);
  const groupChannels = channels.filter((c) => c.isGroup);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 h-[calc(100vh-8.5rem)] rounded-3xl bg-white/70 dark:bg-slate-950/45 backdrop-blur-lg shadow-lg border border-slate-200/40 dark:border-slate-850/60 overflow-hidden transition-colors">
      
      {/* INNER CHANNEL SIDEBAR */}
      <div className="border-r border-slate-200/50 dark:border-slate-800/50 bg-slate-50/20 dark:bg-slate-900/10 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between bg-white/40 dark:bg-slate-900/40">
          <span className="font-heading font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <MessageSquare className="h-4.5 w-4.5 text-emerald-500" />
            Sync Rooms
          </span>
        </div>

        {/* Group Channels List */}
        <div className="flex-1 overflow-y-auto px-2.5 py-4 space-y-4 scrollbar-premium">
          <div>
            <div className="flex items-center justify-between px-2 text-3xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              <span>Channels</span>
              {['Admin', 'Manager'].includes(currentRole) && (
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="rounded-lg p-0.5 hover:bg-slate-200/60 dark:hover:bg-slate-800/55 text-slate-500 hover:text-emerald-500 transition-colors cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="space-y-0.5">
              {groupChannels.map((c) => (
                <button
                  key={c._id}
                  onClick={() => dispatch(setCurrentChannel(c))}
                  className={`flex w-full items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-semibold transition-all duration-200 ${
                    currentChannel?._id === c._id
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/15 border border-emerald-400/20 scale-[1.01]'
                      : 'text-slate-655 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-900/20 hover:text-slate-900 dark:hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Hash className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span className="truncate">{c.name}</span>
                  </div>
                  {workspaceHuddles[c._id] > 0 && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-extrabold animate-pulse shadow-sm shrink-0">
                      <Volume2 className="h-2.5 w-2.5 text-white" />
                      {workspaceHuddles[c._id]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* DMs / Workspace members list */}
          <div>
            <div className="px-2 text-3xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Direct Messages
            </div>
            <div className="space-y-0.5">
              {members.map((member) => {
                const isSelected = dmRecipient?._id === member.user._id;
                return (
                  <button
                    key={member.user._id}
                    onClick={() => handleOpenDM(member.user._id)}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold transition-all duration-200 ${
                      isSelected
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/15 border border-emerald-400/20 scale-[1.01]'
                        : 'text-slate-655 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-900/20 hover:text-slate-900 dark:hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={member.user.avatar}
                        alt={member.user.name}
                        className="h-5.5 w-5.5 rounded-full border border-slate-100 dark:border-slate-800 object-cover"
                      />
                      <span className={`absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full border border-white dark:border-slate-950 ${
                        member.user.status === 'online' ? 'bg-emerald-500' : member.user.status === 'away' ? 'bg-amber-500' : 'bg-slate-450'
                      }`}></span>
                    </div>
                    <span className="truncate">{member.user.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Floating Huddle Controller */}
        {inHuddle && (
          <div className="p-3 border-t border-slate-205/60 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/95 animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-3xs font-extrabold text-emerald-500 uppercase tracking-wider">
                  Voice Connected
                </span>
              </div>
              <button
                onClick={leaveVoiceHuddle}
                className="text-red-500 hover:text-red-600 p-1.5 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"
                title="Disconnect"
              >
                <PhoneOff className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-850/50 shadow-inner mb-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src={user?.avatar}
                    alt={user?.name}
                    className={`h-7 w-7 rounded-full object-cover border border-slate-100 ${
                      huddleParticipants.find(p => p.socketId === socket?.id)?.isSpeaking
                        ? 'ring-2 ring-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                        : ''
                    }`}
                  />
                </div>
                <div className="truncate">
                  <h5 className="text-4xs font-bold text-slate-800 dark:text-slate-100 leading-none truncate w-24">
                    {user?.name}
                  </h5>
                  <p className="text-[9px] text-slate-400 mt-0.5 leading-none">Your Mic</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={toggleLocalMute}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                    localMuted
                      ? 'bg-red-500/10 border-red-500/25 text-red-500 hover:bg-red-500 hover:text-white'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-505 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                  title={localMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {localMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => setLocalDeafened(!localDeafened)}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                    localDeafened
                      ? 'bg-red-500/10 border-red-500/25 text-red-500 hover:bg-red-500 hover:text-white'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-550 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                  title={localDeafened ? 'Undeafen speakers' : 'Deafen speakers'}
                >
                  <Headphones className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                    isScreenSharing
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-505 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                  title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
                >
                  <Monitor className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Participants avatars grid */}
            {huddleParticipants.length > 1 && (
              <div className="space-y-1.5 border-t border-slate-200/50 dark:border-slate-850/50 pt-2">
                <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Others in call ({huddleParticipants.length - 1})
                </div>
                <div className="flex flex-wrap gap-2">
                  {huddleParticipants
                    .filter(p => p.socketId !== socket?.id)
                    .map(p => (
                      <div key={p.socketId} className="relative group/avatar" title={p.name}>
                        <img
                          src={p.avatar}
                          alt={p.name}
                          className={`h-6 w-6 rounded-full object-cover border border-slate-100 dark:border-slate-800 ${
                            p.isSpeaking
                              ? 'ring-2 ring-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                              : ''
                          }`}
                        />
                        {p.isMuted && (
                          <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 border border-white dark:border-slate-900 text-white text-[7px] font-bold flex items-center justify-center">
                            ✕
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CHAT MESSAGES WINDOW */}
      <div className="col-span-1 md:col-span-3 flex flex-col h-full overflow-hidden bg-transparent">
        {currentChannel ? (
          <>
            {/* Active chat header */}
            <div className="px-6 py-3.5 border-b border-slate-205/50 dark:border-slate-800/60 flex items-center justify-between bg-white/40 dark:bg-slate-900/40">
              <div>
                <h3 className="font-heading font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                  {currentChannel.isGroup ? (
                    <>
                      <Hash className="h-4.5 w-4.5 text-emerald-500 animate-pulse" />
                      <span>{currentChannel.name}</span>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>{dmRecipient?.name || 'Direct Message'}</span>
                    </div>
                  )}
                </h3>
                {currentChannel.isGroup && (
                  <p className="text-4xs text-slate-450 dark:text-slate-500 font-semibold mt-0.5">{currentChannel.description || 'No description set'}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleJoinHuddle(currentChannel._id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-4xs font-bold transition-all border cursor-pointer hover:-translate-y-0.5 ${
                    inHuddle && huddleChannelId === currentChannel._id
                      ? 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white'
                      : 'bg-emerald-500/5 border-emerald-500/15 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                  }`}
                >
                  <Headphones className="h-3.5 w-3.5" />
                  {inHuddle && huddleChannelId === currentChannel._id ? 'Leave Huddle' : 'Join Huddle'}
                </button>
                <span className="text-4xs font-bold bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-200/50 dark:border-slate-800 text-slate-400 dark:text-slate-500 shrink-0">
                  {currentChannel.members.length} member{currentChannel.members.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Active Screen Shares Grid */}
            {(isScreenSharing || remoteScreenShares.length > 0) && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/50 dark:border-slate-800 space-y-2">
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-505 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Active Screen Shares
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isScreenSharing && localScreenStreamRef.current && (
                    <VideoPlayer stream={localScreenStreamRef.current} userName="You" />
                  )}
                  {remoteScreenShares.map(({ socketId, stream, userName }) => (
                    <VideoPlayer key={socketId} stream={stream} userName={userName} />
                  ))}
                </div>
              </div>
            )}

            {/* Messages feed */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-premium">
              {messagesLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-slate-400 py-10">
                  <div className="h-16 w-16 bg-slate-50 dark:bg-slate-950 rounded-full flex items-center justify-center text-slate-350 dark:text-slate-850 mb-3 shadow-inner">
                    <Hash className="h-8 w-8" />
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Start of conversation</p>
                  <p className="text-xs text-slate-450 dark:text-slate-500 mt-0.5 leading-relaxed">Send a message to kick off discussion in this room.</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.sender?._id === user?._id;
                  return (
                    <div
                      key={m._id}
                      className={`flex gap-3 group items-start ${isMe ? 'flex-row-reverse' : ''}`}
                    >
                      <img
                        src={m.sender?.avatar}
                        alt={m.sender?.name}
                        className="h-8.5 w-8.5 rounded-full object-cover shadow-sm border border-slate-100 dark:border-slate-800"
                      />
                      <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-baseline gap-2 mb-1 px-1">
                          <span className="text-2xs font-extrabold text-slate-700 dark:text-slate-350">
                            {m.sender?.name}
                          </span>
                          <span className="text-4xs text-slate-400 dark:text-slate-500 font-semibold">
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs border ${
                          isMe
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-500/20 text-white rounded-tr-none'
                            : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200/40 dark:border-slate-850/65 text-slate-700 dark:text-slate-200 rounded-tl-none'
                        }`}>
                          {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
                          {m.type === 'file' && renderAttachment(m.file)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicators */}
              {isTyping && (
                <div className="flex gap-2 items-center text-3xs text-slate-400 dark:text-slate-500 font-semibold animate-pulse pl-12">
                  <CornerDownRight className="h-3 w-3 text-slate-350 dark:text-slate-700" />
                  <span>{typerName} is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat message input bar */}
            <div className="p-4 border-t border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40">
              <form onSubmit={handleSendMessage} className="space-y-2">
                {/* File Upload Preview */}
                {attachedFile && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/25 max-w-sm animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-2 min-w-0 text-3xs font-semibold text-emerald-500">
                      <span>📄</span>
                      <span className="truncate w-40">{attachedFile.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedFile(null)}
                      className="text-emerald-500 hover:text-emerald-600 rounded p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAttachClick}
                    disabled={attachingFile}
                    className="rounded-xl border border-slate-205 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-400 hover:text-emerald-500 p-2.5 transition-colors shadow-2xs cursor-pointer flex items-center justify-center shrink-0 disabled:opacity-55"
                    title="Attach asset file"
                  >
                    {attachingFile ? (
                      <Loader2 className="h-4.5 w-4.5 animate-spin text-emerald-500" />
                    ) : (
                      <Paperclip className="h-4.5 w-4.5" />
                    )}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <input
                    type="text"
                    value={messageText}
                    onChange={handleTyping}
                    placeholder={
                      currentChannel.isGroup
                        ? `Message #${currentChannel.name}...`
                        : `Message DM...`
                    }
                    className="flex-1 rounded-xl border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2.5 text-xs text-slate-850 dark:text-white outline-none focus:border-green-500 premium-input"
                  />

                  <button
                    type="submit"
                    disabled={!messageText.trim() && !attachedFile}
                    className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white p-2.5 shadow-md shadow-emerald-500/10 cursor-pointer flex items-center justify-center shrink-0 transition-all duration-200 hover:-translate-y-0.5"
                  >
                    <Send className="h-4.5 w-4.5" />
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          /* Empty Chat state (no channel selected) */
          <div className="flex flex-1 flex-col items-center justify-center text-center p-8">
            <div className="h-16 w-16 bg-slate-55/20 dark:bg-slate-955/50 rounded-full flex items-center justify-center text-slate-350 dark:text-slate-800 mb-4 shadow-inner">
              <MessageSquare className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
              Welcome to Chat Rooms
            </h3>
            <p className="text-xs text-slate-450 dark:text-slate-500 mt-1.5 max-w-xs leading-relaxed">
              Select a workspace channel room or member direct message from the sidebar to launch discussion chats.
            </p>
          </div>
        )}
      </div>

      {/* CREATE CHANNEL MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-100 dark:border-slate-800 scale-in duration-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-105 dark:border-slate-805 pb-3 mb-4">
              <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Plus className="h-5 w-5 text-emerald-500" /> Create Workspace Channel
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded p-1 cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleCreateChannel} className="space-y-4">
              <div>
                <label className="text-3xs font-semibold text-slate-400 dark:text-slate-500 uppercase block mb-1 tracking-wider">
                  Channel Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. design-assets, release-notes"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  className="w-full rounded-lg border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-955 px-3.5 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-green-500 premium-input"
                  required
                />
              </div>

              <div>
                <label className="text-3xs font-semibold text-slate-400 dark:text-slate-500 uppercase block mb-1 tracking-wider">
                  Description
                </label>
                <textarea
                  placeholder="What is this channel about?"
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  className="w-full rounded-lg border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-955 px-3.5 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-green-500 h-20 resize-none premium-input"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-xs font-bold text-slate-505 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-4 py-2 text-xs font-bold shadow-md shadow-emerald-500/10 cursor-pointer transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Hidden WebRTC Audio Players */}
      {remoteStreams.map(({ socketId, stream }) => (
        <AudioPlayer key={socketId} stream={stream} isDeafened={localDeafened} />
      ))}
    </div>
  );
};

export default Chat;
