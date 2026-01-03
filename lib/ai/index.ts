import { createGroq } from "@ai-sdk/groq";

export const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

// Model for bank transaction content extraction
export const bankTransactionModel = groq("openai/gpt-oss-120b");

// Model for bookkeeping AI assistant (Kimi-K2)
export const bookkeepingModel = groq("moonshotai/Kimi-K2-Instruct-0905");

// Model for receipt/invoice image analysis (vision)
export const visionModel = groq("meta-llama/llama-4-maverick-17b-128e-instruct");
