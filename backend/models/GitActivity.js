import mongoose from 'mongoose';

const gitActivitySchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    sha: {
      type: String,
      required: true,
    },
    authorName: {
      type: String,
      required: true,
    },
    authorAvatar: {
      type: String,
    },
    message: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to guarantee that we do not store duplicate commits for the same workspace
gitActivitySchema.index({ workspace: 1, sha: 1 }, { unique: true });

const GitActivity = mongoose.model('GitActivity', gitActivitySchema);
export default GitActivity;
