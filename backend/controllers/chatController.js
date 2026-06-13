import Message from '../models/Message.js';
import Channel from '../models/Channel.js';
import User from '../models/User.js';

// @desc    Send a new message
// @route   POST /api/chat/message
// @access  Private
export const sendMessage = async (req, res, next) => {
  const { content, channelId, fileId, type } = req.body;

  try {
    if (!channelId) {
      return res.status(400).json({ success: false, message: 'Channel ID is required' });
    }

    // Check if channel exists and user is a member
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    const isMember = channel.members.some(
      (m) => m.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'You are not a member of this channel' });
    }

    const messageData = {
      sender: req.user._id,
      channel: channelId,
      content,
      type: type || 'text',
    };

    if (fileId) {
      messageData.file = fileId;
    }

    let message = await Message.create(messageData);

    // Populate sender details and file details for response
    message = await Message.findById(message._id)
      .populate('sender', 'name avatar email status')
      .populate('file');

    res.status(201).json({
      success: true,
      message,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all messages for a channel
// @route   GET /api/chat/messages/:channelId
// @access  Private
export const getMessages = async (req, res, next) => {
  const { channelId } = req.params;

  try {
    // Check if channel exists and user is member
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    const isMember = channel.members.some(
      (m) => m.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'You are not a member of this channel' });
    }

    // Fetch messages populated with sender info
    const messages = await Message.find({ channel: channelId })
      .populate('sender', 'name avatar email status')
      .populate('file')
      .sort({ createdAt: 1 }); // Oldest first for chronological order

    res.json({
      success: true,
      messages,
    });
  } catch (error) {
    next(error);
  }
};
