import crypto from 'crypto';
import AIChat from '../models/AIChat.js';
import { getAIResponse } from '../Service/groqService.js';

export const getAIChatSession = async (req, res) => {
  try {
    const { sessionId, message, contactInfo } = req.body;
    
    // Generate a new sessionId if not provided
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      currentSessionId = crypto.randomUUID();
    }

    let chat = await AIChat.findOne({ sessionId: currentSessionId });
    if (!chat) {
      chat = await AIChat.create({
        sessionId: currentSessionId,
        messages: [],
      });
    }

    // Update contact info if provided
    if (contactInfo) {
      chat.contactInfo = {
        ...chat.contactInfo,
        ...contactInfo,
      };
    }

    let aiReply = null;

    // If a message was sent, process it and generate an AI response
    if (message) {
      chat.messages.push({
        role: 'user',
        content: message,
      });

      const history = chat.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      aiReply = await getAIResponse(history);
      
      chat.messages.push({
        role: 'assistant',
        content: aiReply,
      });
    }

    await chat.save();

    res.json({
      success: true,
      sessionId: currentSessionId,
      reply: aiReply,
      messages: chat.messages,
      contactInfo: chat.contactInfo,
    });
  } catch (err) {
    console.error('Error in getAIChatSession:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to process AI chat message',
    });
  }
};

