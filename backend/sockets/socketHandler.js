import User from '../models/User.js';

export const socketHandler = (io) => {
  // Store connected user sockets for presence tracking
  const activeUsers = new Map(); // userId -> socketId

  // Store active huddles in-memory: channelId -> Map of socketId -> user details { userId, name, avatar, workspaceId }
  const activeHuddles = new Map();

  const leaveAllHuddles = (socket) => {
    activeHuddles.forEach((participants, channelId) => {
      if (participants.has(socket.id)) {
        const participant = participants.get(socket.id);
        participants.delete(socket.id);
        console.log(`User ${socket.userId} left huddle ${channelId} due to disconnect/leave`);

        // Broadcast to huddle room
        socket.to(`huddle_${channelId}`).emit('huddle_user_left', {
          socketId: socket.id,
          userId: socket.userId
        });

        // Broadcast status update to the workspace
        if (participant.workspaceId) {
          io.in(`workspace_${participant.workspaceId}`).emit('huddle_status_update', {
            channelId,
            participantsCount: participants.size,
            participants: Array.from(participants.values())
          });
        }

        if (participants.size === 0) {
          activeHuddles.delete(channelId);
        }
      }
    });
  };

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Setup user presence and private rooms
    socket.on('setup', async (userData) => {
      if (!userData || !userData._id) return;
      
      socket.join(userData._id);
      activeUsers.set(userData._id, socket.id);
      socket.userId = userData._id;

      // Update database status to online
      try {
        await User.findByIdAndUpdate(userData._id, { status: 'online' });
        // Broadcast presence update
        socket.broadcast.emit('user_presence_change', {
          userId: userData._id,
          status: 'online',
        });
      } catch (err) {
        console.error('Presence setup error:', err);
      }

      socket.emit('connected');
    });

    // Join a chat room (channel or DM channel)
    socket.on('join_channel', (channelId) => {
      socket.join(channelId);
      console.log(`User ${socket.userId} joined channel: ${channelId}`);
    });

    // Join a workspace room
    socket.on('join_workspace', (workspaceId) => {
      socket.join(`workspace_${workspaceId}`);
      console.log(`User ${socket.userId} joined workspace: ${workspaceId}`);
    });

    // Leave a chat room
    socket.on('leave_channel', (channelId) => {
      socket.leave(channelId);
      console.log(`User ${socket.userId} left channel: ${channelId}`);
    });

    // Typing Indicators
    socket.on('typing', (data) => {
      // Broadcast to all sockets in the channel except the sender
      socket.in(data.channelId).emit('typing', data);
    });

    socket.on('stop_typing', (data) => {
      socket.in(data.channelId).emit('stop_typing', data);
    });

    // Message transmission
    socket.on('new_message', (newMessageReceived) => {
      const channel = newMessageReceived.channel;

      if (!channel) return console.log('Message does not have channel ID');

      // Emit the message to all members in that channel room (including the sender, or except the sender)
      // Usually, it's safer to emit to all members in the channel so everyone receives the populated message.
      io.in(channel).emit('message_received', newMessageReceived);
    });

    // Live Notifications
    socket.on('send_notification', (notification) => {
      const recipient = notification.recipient;
      if (!recipient) return;

      // Send only to the recipient's private room
      io.to(recipient).emit('notification_received', notification);
    });

    // Collaborative Document Sockets
    socket.on('join_document', (docId) => {
      socket.join(`document_${docId}`);
      console.log(`User ${socket.userId} joined document: ${docId}`);
    });

    socket.on('leave_document', (docId) => {
      socket.leave(`document_${docId}`);
      console.log(`User ${socket.userId} left document: ${docId}`);
    });

    socket.on('edit_document', (data) => {
      socket.in(`document_${data.docId}`).emit('document_updated', data);
    });

    // Huddle Sockets & WebRTC Signaling
    socket.on('join_huddle', (data) => {
      const { channelId, workspaceId, user } = data;
      if (!channelId || !user) return;

      socket.join(`huddle_${channelId}`);

      if (!activeHuddles.has(channelId)) {
        activeHuddles.set(channelId, new Map());
      }

      const participants = activeHuddles.get(channelId);
      const participantInfo = {
        socketId: socket.id,
        userId: user._id,
        name: user.name,
        avatar: user.avatar,
        workspaceId
      };

      participants.set(socket.id, participantInfo);
      console.log(`User ${user.name} joined huddle: ${channelId}`);

      // Get list of other participants in this huddle
      const otherUsers = Array.from(participants.entries())
        .filter(([sid]) => sid !== socket.id)
        .map(([sid, info]) => info);

      // Send current participants list to the joiner
      socket.emit('huddle_users_list', otherUsers);

      // Notify others in the huddle room
      socket.to(`huddle_${channelId}`).emit('huddle_user_joined', participantInfo);

      // Broadcast workspace-wide update so everyone sees active speaking status/counters
      io.in(`workspace_${workspaceId}`).emit('huddle_status_update', {
        channelId,
        participantsCount: participants.size,
        participants: Array.from(participants.values())
      });
    });

    socket.on('send_signal', (data) => {
      const { toSocketId, signal } = data;
      // Find sender details
      let fromUser = null;
      activeHuddles.forEach((participants) => {
        if (participants.has(socket.id)) {
          fromUser = participants.get(socket.id);
        }
      });

      io.to(toSocketId).emit('signal_received', {
        signal,
        fromSocketId: socket.id,
        fromUser
      });
    });

    socket.on('return_signal', (data) => {
      const { toSocketId, signal } = data;
      io.to(toSocketId).emit('signal_returned', {
        signal,
        fromSocketId: socket.id
      });
    });

    socket.on('leave_huddle', (data) => {
      const { channelId } = data;
      leaveAllHuddles(socket);
      socket.leave(`huddle_${channelId}`);
    });

    socket.on('huddle_speaking', (data) => {
      const { channelId, isSpeaking } = data;
      socket.to(`huddle_${channelId}`).emit('huddle_user_speaking', {
        socketId: socket.id,
        userId: socket.userId,
        isSpeaking
      });
    });
    // Clean up on disconnect
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      leaveAllHuddles(socket);
      if (socket.userId) {
        activeUsers.delete(socket.userId);
        
        try {
          await User.findByIdAndUpdate(socket.userId, {
            status: 'offline',
            lastSeen: new Date(),
          });
          // Broadcast presence update
          socket.broadcast.emit('user_presence_change', {
            userId: socket.userId,
            status: 'offline',
          });
        } catch (err) {
          console.error('Presence cleanup error:', err);
        }
      }
    });
  });
};
