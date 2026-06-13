import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';

// Protect routes - Verify JWT token
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }

      next();
    } catch (error) {
      console.error('[AuthMiddleware] JWT verification failed:', error.message);
      console.error('[AuthMiddleware] JWT_SECRET state:', process.env.JWT_SECRET ? 'DEFINED' : 'UNDEFINED');
      console.error('[AuthMiddleware] Token string:', token);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};

// Workspace Role authorization
// Roles: 'Admin', 'Manager', 'Member'
export const authorizeWorkspaceRole = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      // Workspace ID can come from headers, params, or body
      const workspaceId =
        req.headers['x-workspace-id'] ||
        req.params.workspaceId ||
        req.body.workspaceId;

      if (!workspaceId) {
        return res.status(400).json({
          success: false,
          message: 'Workspace context (x-workspace-id header) is required',
        });
      }

      // Find workspace
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({ success: false, message: 'Workspace not found' });
      }

      // Check if user is a member of this workspace
      const memberInfo = workspace.members.find(
        (m) => m.user.toString() === req.user._id.toString()
      );

      if (!memberInfo) {
        console.log(`[AuthMiddleware] Denied: User ${req.user._id} is not a member of workspace ${workspaceId}. Members:`, workspace.members.map(m => ({ user: m.user, role: m.role })));
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not a member of this workspace',
        });
      }

      // Check if user has one of the allowed roles
      if (allowedRoles.length > 0 && !allowedRoles.includes(memberInfo.role)) {
        console.log(`[AuthMiddleware] Denied: User ${req.user._id} in workspace ${workspaceId} has role ${memberInfo.role} but allowed roles are: ${allowedRoles}`);
        return res.status(403).json({
          success: false,
          message: `Access denied: Requires one of these roles: ${allowedRoles.join(', ')}`,
        });
      }

      // Attach workspace and user role to request for controllers use
      req.workspace = workspace;
      req.userWorkspaceRole = memberInfo.role;

      next();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server authorization error' });
    }
  };
};
