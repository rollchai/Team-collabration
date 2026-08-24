import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import OpenAI from 'openai';

export const parseVoiceCommand = async (transcriptText, context = {}) => {
  if (!transcriptText || !transcriptText.trim()) {
    return {
      success: false,
      action: 'UNKNOWN',
      params: {},
      spokenResponse: 'Please provide a valid voice instruction.'
    };
  }

  const systemPrompt = `
You are the intelligent voice assistant for "SyncFlow", a team collaboration and workspace management platform.
Analyze the user's spoken voice command and return a structured JSON response specifying the system action to perform.

Current Context:
- Current Workspace: ${context.workspaceName || 'None'} (Slug: ${context.workspaceSlug || 'None'})
- User Name: ${context.userName || 'User'}

Supported Actions & Schema:
1. Action: "CREATE_WORKSPACE"
   - Trigger: User wants to create/make/start a new workspace or team space.
   - Params: { "name": "<workspace name extracted from speech>" }
   - Example: "create a new workspace called Marketing Hub" -> { "action": "CREATE_WORKSPACE", "params": { "name": "Marketing Hub" }, "spokenResponse": "Creating workspace Marketing Hub." }

2. Action: "JOIN_WORKSPACE"
   - Trigger: User wants to join a workspace using an invite code.
   - Params: { "inviteCode": "<clean alphanumeric invite code>" }
   - Example: "join workspace with code a1b2c3" -> { "action": "JOIN_WORKSPACE", "params": { "inviteCode": "a1b2c3" }, "spokenResponse": "Joining workspace with code a1b2c3." }

3. Action: "NAVIGATE"
   - Trigger: User wants to switch to a specific tab, page, or view.
   - Params: { "page": "dashboard" | "tasks" | "calendar" | "timeline" | "members" | "wiki" | "git-feed" | "performance" | "files" | "chat" | "settings" | "workspaces" }
   - Example: "go to sprint calendar" -> { "action": "NAVIGATE", "params": { "page": "calendar" }, "spokenResponse": "Opening the calendar." }
   - Example: "show me all workspaces" -> { "action": "NAVIGATE", "params": { "page": "workspaces" }, "spokenResponse": "Navigating to your workspaces." }

4. Action: "CREATE_TASK"
   - Trigger: User wants to add a new task or todo.
   - Params: { "title": "<task title>", "priority": "Low" | "Medium" | "High" | "Urgent", "description": "<details if any>" }
   - Example: "create a high priority task to review pull requests" -> { "action": "CREATE_TASK", "params": { "title": "Review pull requests", "priority": "High" }, "spokenResponse": "Adding task: Review pull requests with High priority." }

5. Action: "GENERAL_QUERY"
   - Trigger: User asks a general question about SyncFlow features or assistance.
   - Params: { "answer": "<concise helpful answer>" }
   - Example: "what can you do?" -> { "action": "GENERAL_QUERY", "params": { "answer": "I can help you create workspaces, join teams, add tasks, and navigate through SyncFlow." }, "spokenResponse": "I can help you create workspaces, join teams, add tasks, and navigate through SyncFlow." }

6. Action: "UNKNOWN"
   - Trigger: Unclear or unsupported instruction.
   - Params: {}
   - spokenResponse: "I'm not sure how to do that yet. You can ask me to create a workspace, add a task, or navigate pages."

User Spoken Input: "${transcriptText}"

Output Requirement:
You MUST respond with ONLY a valid JSON object strictly adhering to this structure:
{
  "success": true,
  "action": "CREATE_WORKSPACE" | "JOIN_WORKSPACE" | "NAVIGATE" | "CREATE_TASK" | "GENERAL_QUERY" | "UNKNOWN",
  "params": { ... },
  "spokenResponse": "<Natural, concise speech confirmation to be spoken aloud>"
}
`;

  // 1. Try Google Gemini if GEMINI_API_KEY is configured
  if (process.env.GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: { responseMimeType: 'application/json' }
      });

      const result = await model.generateContent(systemPrompt);
      const responseText = result.response.text();
      return JSON.parse(responseText);
    } catch (geminiError) {
      console.warn('Gemini Voice Assistant Error, trying fallback:', geminiError.message);
    }
  }

  // 2. Fallback to Groq with available model
  if (process.env.GROQ_API_KEY) {
    try {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are an AI assistant that outputs strictly valid JSON only.' },
          { role: 'user', content: systemPrompt }
        ],
        model: 'openai/gpt-oss-120b',
        response_format: { type: 'json_object' },
        temperature: 0.1
      });

      const content = completion.choices[0]?.message?.content;
      return JSON.parse(content);
    } catch (groqError) {
      console.warn('Groq gpt-oss-120b fallback failed, trying gpt-oss-20b:', groqError.message);
      try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const completion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: 'You are an AI assistant that outputs strictly valid JSON only.' },
            { role: 'user', content: systemPrompt }
          ],
          model: 'openai/gpt-oss-20b',
          response_format: { type: 'json_object' },
          temperature: 0.1
        });
        const content = completion.choices[0]?.message?.content;
        return JSON.parse(content);
      } catch (err2) {
        console.error('Groq Secondary Fallback Error:', err2.message);
      }
    }
  }

  // 3. Fallback to OpenAI if configured
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an AI assistant that outputs strictly valid JSON only.' },
          { role: 'user', content: systemPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      });
      return JSON.parse(response.choices[0]?.message?.content);
    } catch (openaiError) {
      console.error('OpenAI Fallback Error:', openaiError.message);
    }
  }

  return {
    success: false,
    action: 'UNKNOWN',
    params: {},
    spokenResponse: 'Voice assistant service is currently unavailable. Please check your API keys.'
  };
};
