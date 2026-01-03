import { createGroq } from "@ai-sdk/groq";

export const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

// Model for verification content extraction
export const verificationModel = groq("openai/gpt-oss-120b");

// Model for bookkeeping AI assistant (Kimi-K2)
export const bookkeepingModel = groq("moonshotai/Kimi-K2-Instruct-0905");

// Model for receipt/invoice image analysis (vision)
export const visionModel = groq("llama-3.2-90b-vision-preview");
