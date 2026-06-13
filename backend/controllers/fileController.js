import File from '../models/File.js';
import Workspace from '../models/Workspace.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @desc    Upload a file
// @route   POST /api/files/upload
// @access  Private
export const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { workspaceId, channelId } = req.body;
    if (!workspaceId) {
      return res.status(400).json({ success: false, message: 'Workspace ID is required' });
    }

    // Construct server URL dynamically
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    const newFile = await File.create({
      name: req.file.originalname,
      url: fileUrl,
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy: req.user._id,
      workspace: workspaceId,
      channel: channelId || null,
    });

    const populatedFile = await File.findById(newFile._id).populate(
      'uploadedBy',
      'name avatar email'
    );

    res.status(201).json({
      success: true,
      file: populatedFile,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all files in a workspace
// @route   GET /api/files
// @access  Private
export const getFiles = async (req, res, next) => {
  const { workspaceId } = req.query;

  try {
    if (!workspaceId) {
      return res.status(400).json({ success: false, message: 'Workspace ID query parameter is required' });
    }

    const files = await File.find({ workspace: workspaceId })
      .populate('uploadedBy', 'name avatar email')
      .populate('channel', 'name isGroup')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      files,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a link attachment
// @route   POST /api/files/link
// @access  Private
export const createLink = async (req, res, next) => {
  const { name, url, workspaceId } = req.body;

  try {
    if (!name || !url || !workspaceId) {
      return res.status(400).json({ success: false, message: 'Link name, URL, and Workspace ID are required' });
    }

    const newLink = await File.create({
      name,
      url,
      type: 'link',
      mimeType: 'link',
      uploadedBy: req.user._id,
      workspace: workspaceId,
    });

    const populatedLink = await File.findById(newLink._id).populate(
      'uploadedBy',
      'name avatar email'
    );

    res.status(201).json({
      success: true,
      file: populatedLink,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a file or link attachment
// @route   DELETE /api/files/:id
// @access  Private
export const deleteFile = async (req, res, next) => {
  const { id } = req.params;

  try {
    const file = await File.findById(id);
    if (!file) {
      return res.status(404).json({ success: false, message: 'Attachment not found' });
    }

    const workspace = await Workspace.findById(file.workspace);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    const member = workspace.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );

    const isUploader = file.uploadedBy.toString() === req.user._id.toString();
    const isAdminOrManager = member && ['Admin', 'Manager'].includes(member.role);

    if (!isUploader && !isAdminOrManager) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only the uploader or a workspace Admin/Manager can delete attachments',
      });
    }

    // Delete file from uploads directory if it is a local file
    if (file.type === 'file') {
      const filename = file.url.split('/').pop();
      const filePath = path.join(__dirname, '..', 'uploads', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await File.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Attachment deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
