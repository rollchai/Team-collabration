import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
    },
    size: {
      type: Number, // in bytes
    },
    mimeType: {
      type: String,
    },
    type: {
      type: String,
      enum: ['file', 'link'],
      default: 'file',
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
    },
  },
  {
    timestamps: true,
  }
);

const File = mongoose.model('File', fileSchema);
export default File;
