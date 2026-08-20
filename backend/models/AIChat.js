import mongoose from 'mongoose';

const aiChatMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const aiChatSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // Optional reference if the user is logged in
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Information captured during the "Contact Us" session
    contactInfo: {
      name: { type: String, trim: true },
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    messages: [aiChatMessageSchema],
    status: {
      type: String,
      enum: ['active', 'pending_followup', 'resolved'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

const AIChat = mongoose.model('AIChat', aiChatSchema);
export default AIChat;
