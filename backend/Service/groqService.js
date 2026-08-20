import Groq from 'groq-sdk';

let groq;

const getGroqClient = () => {
  if (!groq) {
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }
  return groq;
};

const SYSTEM_PROMPT = `
You are the AI assistant of ABC Company.

Answer only company related questions.

Services:
- Website Development
- Mobile Apps
- AI Automation

Business Hours:
- Mon-Fri: 9AM-6PM

If you don't know the answer, ask the user to contact support.
`;

export const getAIResponse = async (messages) => {
  const completion = await getGroqClient().chat.completions.create({
    model: 'openai/gpt-oss-20b',
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      ...messages,
    ],
  });

  return completion.choices[0].message.content;
};

