import Channel from '../models/Channel.js';
import Workspace from '../models/Workspace.js';
import User from '../models/User.js';

// @desc    Create a new channel
// @route   POST /api/channel/create
// @access  Private (Admin or Manager)
export const createChannel = async (req, res, next) => {
  const { name, description, workspaceId } = req.body;

  try {
    if (!name || !workspaceId) {
      return res.status(400).json({ success: false, message: 'Channel name and Workspace ID are required' });
    }

    // Find workspace
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    // Add all current workspace members to the new channel by default
    const channelMembers = workspace.members.map((m) => m.user);

    const channel = await Channel.create({
      name: name.toLowerCase().replace(/\s+/g, '-'),
      description,
      workspace: workspaceId,
      isGroup: true,
      members: channelMembers,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      channel,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get workspace channels for logged in user
// @route   GET /api/channel/workspace/:workspaceId
// @access  Private
export const getWorkspaceChannels = async (req, res, next) => {
  const { workspaceId } = req.params;

  try {
    const channels = await Channel.find({
      workspace: workspaceId,
      isGroup: true,
      members: req.user._id,
    });

    res.json({
      success: true,
      channels,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get or Create a DM channel between two users
// @route   POST /api/channel/dm
// @access  Private
export const getOrCreateDMChannel = async (req, res, next) => {
  const { workspaceId, recipientId } = req.body;

  try {
    if (!workspaceId || !recipientId) {
      return res.status(400).json({ success: false, message: 'Workspace ID and Recipient ID are required' });
    }

    // Find if a 1-to-1 DM channel already exists between these users in this workspace
    let channel = await Channel.findOne({
      workspace: workspaceId,
      isGroup: false,
      members: { $all: [req.user._id, recipientId], $size: 2 },
    }).populate('members', 'name email avatar status');

    if (!channel) {
      // Create new DM channel
      channel = new Channel({
        workspace: workspaceId,
        isGroup: false,
        members: [req.user._id, recipientId],
        createdBy: req.user._id,
      });
      await channel.save();
      channel = await Channel.findById(channel._id).populate('members', 'name email avatar status');
    }

    res.json({
      success: true,
      channel,
    });
  } catch (error) {
    next(error);
  }
};
