import Workspace from '../models/Workspace.js';
import Channel from '../models/Channel.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Task from '../models/Task.js';
import Message from '../models/Message.js';
import Document from '../models/Document.js';
import File from '../models/File.js';
import GitActivity from '../models/GitActivity.js';

// @desc    Create a new workspace
// @route   POST /api/workspace/create
// @access  Private
export const createWorkspace = async (req, res, next) => {
  const { name } = req.body;

  try {
    if (!name) {
      return res.status(400).json({ success: false, message: 'Workspace name is required' });
    }

    // 1. Create the Workspace
    const workspace = new Workspace({
      name,
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'Admin' }],
    });
    await workspace.save();

    // 2. Create the default channel: #general
    const channel = await Channel.create({
      name: 'general',
      description: 'Default channel for general discussion',
      workspace: workspace._id,
      isGroup: true,
      members: [req.user._id],
      createdBy: req.user._id,
    });

    // 3. Add workspace to user's workspaces array
    await User.findByIdAndUpdate(req.user._id, {
      $push: { workspaces: { workspace: workspace._id, role: 'Admin' } },
    });

    res.status(201).json({
      success: true,
      workspace,
      defaultChannel: channel,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's workspaces
// @route   GET /api/workspace
// @access  Private
export const getWorkspaces = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'workspaces.workspace',
      populate: {
        path: 'members.user',
        select: 'name email avatar status',
      },
    });

    const workspaces = user.workspaces.map((w) => ({
      workspace: w.workspace,
      role: w.role,
    }));

    res.json({
      success: true,
      workspaces,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Invite a member to workspace by email
// @route   POST /api/workspace/invite
// @access  Private (Admin or Manager)
export const inviteMember = async (req, res, next) => {
  const { email, role, workspaceId } = req.body;

  try {
    if (!email || !workspaceId) {
      return res.status(400).json({ success: false, message: 'Email and Workspace ID are required' });
    }

    // 1. Find user to invite
    const invitedUser = await User.findOne({ email });
    if (!invitedUser) {
      return res.status(404).json({ success: false, message: 'User not found with this email' });
    }

    // 2. Find workspace
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    // 3. Check if user is already a member
    const alreadyMember = workspace.members.some(
      (m) => m.user.toString() === invitedUser._id.toString()
    );
    if (alreadyMember) {
      return res.status(400).json({ success: false, message: 'User is already a member of this workspace' });
    }

    const assignedRole = role || 'Member';

    // 4. Add member to workspace
    workspace.members.push({ user: invitedUser._id, role: assignedRole });
    await workspace.save();

    // 5. Add workspace to user
    invitedUser.workspaces.push({ workspace: workspace._id, role: assignedRole });
    await invitedUser.save();

    // 6. Join user to public channels in this workspace (like general)
    const publicChannels = await Channel.find({ workspace: workspace._id, isGroup: true });
    for (let channel of publicChannels) {
      channel.members.push(invitedUser._id);
      await channel.save();
    }

    // 7. Create notification for the user
    await Notification.create({
      recipient: invitedUser._id,
      sender: req.user._id,
      type: 'workspace_invite',
      title: 'New Workspace Invitation',
      message: `You have been added to the workspace: ${workspace.name} as a ${assignedRole}`,
      link: `/workspace/${workspace.slug}/chat`,
    });

    res.json({
      success: true,
      message: `Successfully added ${invitedUser.name} to the workspace as ${assignedRole}`,
      workspace,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Join workspace via invite code
// @route   POST /api/workspace/join/:inviteCode
// @access  Private
export const joinWorkspace = async (req, res, next) => {
  const { inviteCode } = req.params;

  try {
    const workspace = await Workspace.findOne({ inviteCode });
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Invalid invite code' });
    }

    // Check if user is already a member
    const alreadyMember = workspace.members.some(
      (m) => m.user.toString() === req.user._id.toString()
    );
    if (alreadyMember) {
      return res.status(400).json({ success: false, message: 'You are already a member of this workspace' });
    }

    // Add user as Member
    workspace.members.push({ user: req.user._id, role: 'Member' });
    await workspace.save();

    // Add workspace to user
    await User.findByIdAndUpdate(req.user._id, {
      $push: { workspaces: { workspace: workspace._id, role: 'Member' } },
    });

    // Add to all public channels in workspace
    const publicChannels = await Channel.find({ workspace: workspace._id, isGroup: true });
    for (let channel of publicChannels) {
      channel.members.push(req.user._id);
      await channel.save();
    }

    res.json({
      success: true,
      message: `Joined workspace ${workspace.name}`,
      workspace,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a workspace
// @route   DELETE /api/workspace/:workspaceId
// @access  Private (Admin only)
export const deleteWorkspace = async (req, res, next) => {
  const { workspaceId } = req.params;

  try {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    // Find all channel IDs in this workspace to delete their messages
    const channels = await Channel.find({ workspace: workspaceId });
    const channelIds = channels.map((c) => c._id);

    // Delete associated data
    await Message.deleteMany({ channel: { $in: channelIds } });
    await Channel.deleteMany({ workspace: workspaceId });
    await Task.deleteMany({ workspace: workspaceId });
    await Document.deleteMany({ workspace: workspaceId });
    await File.deleteMany({ workspace: workspaceId });
    await GitActivity.deleteMany({ workspace: workspaceId });

    // Pull workspace from all users' workspaces array
    await User.updateMany(
      { 'workspaces.workspace': workspaceId },
      { $pull: { workspaces: { workspace: workspaceId } } }
    );

    // Delete the workspace itself
    await Workspace.findByIdAndDelete(workspaceId);

    res.json({
      success: true,
      message: 'Workspace and all associated data deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
