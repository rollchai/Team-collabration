import Document from '../models/Document.js';

// @desc    Get all documents for a workspace
// @route   GET /api/documents
// @access  Private
export const getDocuments = async (req, res, next) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) {
      return res.status(400).json({ success: false, message: 'Workspace ID query is required' });
    }

    const docs = await Document.find({ workspace: workspaceId })
      .populate('createdBy', 'name avatar')
      .populate('lastEditedBy', 'name avatar')
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, documents: docs });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single document by ID
// @route   GET /api/documents/:id
// @access  Private
export const getDocumentById = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id)
      .populate('createdBy', 'name avatar')
      .populate('lastEditedBy', 'name avatar');

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    res.status(200).json({ success: true, document: doc });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new document
// @route   POST /api/documents
// @access  Private
export const createDocument = async (req, res, next) => {
  try {
    const { title, content, workspaceId } = req.body;
    if (!workspaceId) {
      return res.status(450).json({ success: false, message: 'Workspace ID is required' });
    }

    const newDoc = await Document.create({
      title: title || 'Untitled Document',
      content: content || '',
      workspace: workspaceId,
      createdBy: req.user._id,
      lastEditedBy: req.user._id,
    });

    const populatedDoc = await Document.findById(newDoc._id)
      .populate('createdBy', 'name avatar')
      .populate('lastEditedBy', 'name avatar');

    res.status(201).json({ success: true, document: populatedDoc });
  } catch (err) {
    next(err);
  }
};

// @desc    Update document content or title
// @route   PUT /api/documents/:id
// @access  Private
export const updateDocument = async (req, res, next) => {
  try {
    const { title, content } = req.body;

    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (title !== undefined) doc.title = title;
    if (content !== undefined) doc.content = content;
    doc.lastEditedBy = req.user._id;

    await doc.save();

    const populatedDoc = await Document.findById(doc._id)
      .populate('createdBy', 'name avatar')
      .populate('lastEditedBy', 'name avatar');

    res.status(200).json({ success: true, document: populatedDoc });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private
export const deleteDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    await doc.deleteOne();

    res.status(200).json({ success: true, message: 'Document deleted successfully' });
  } catch (err) {
    next(err);
  }
};
