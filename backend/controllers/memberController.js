import Workspace from '../models/Workspace.js';
import User from '../models/User.js';

// @desc    Get all members of a workspace
// @route   GET /api/members
// @access  Private
export const getWorkspaceMembers = async (req, res, next) => {
  const { workspaceId } = req.query;

  try {
    if (!workspaceId) {
      return res.status(400).json({ success: false, message: 'Workspace ID query parameter is required' });
    }

    const workspace = await Workspace.findById(workspaceId).populate(
      'members.user',
      'name email avatar status lastSeen'
    );

    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    res.json({
      success: true,
      members: workspace.members,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a member's role in a workspace
// @route   PUT /api/members/role
// @access  Private (Admin only)
export const updateMemberRole = async (req, res, next) => {
  const { workspaceId, userId, role } = req.body;

  try {
    if (!workspaceId || !userId || !role) {
      return res.status(400).json({ success: false, message: 'Workspace ID, User ID, and Role are required' });
    }

    if (!['Admin', 'Manager', 'Member'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    // Check if targets user exists in workspace
    const memberIndex = workspace.members.findIndex(
      (m) => m.user.toString() === userId.toString()
    );

    if (memberIndex === -1) {
      return res.status(404).json({ success: false, message: 'User is not a member of this workspace' });
    }

    // Check if target user is the workspace owner
    if (workspace.owner.toString() === userId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot change role of the workspace owner' });
    }

    // Update role in Workspace
    workspace.members[memberIndex].role = role;
    await workspace.save();

    // Update role in User workspaces list
    await User.updateOne(
      { _id: userId, 'workspaces.workspace': workspaceId },
      { $set: { 'workspaces.$.role': role } }
    );

    const updatedWorkspace = await Workspace.findById(workspaceId).populate(
      'members.user',
      'name email avatar status'
    );

    res.json({
      success: true,
      message: 'Member role updated successfully',
      members: updatedWorkspace.members,
    });
  } catch (error) {
    next(error);
  }
};
