import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

// Ensure this file is only imported on the server
// Next.js App Router server-only context is implied for API routes
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default openai;
