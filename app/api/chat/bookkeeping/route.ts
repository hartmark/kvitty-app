import { generateObject } from "ai";
import { z } from "zod";
import { bookkeepingModel } from "@/lib/ai";
import { BOOKKEEPING_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { getSession } from "@/lib/session";

// Response schema - always get message + optional suggestion
const responseSchema = z.object({
  message: z.string().describe("Ditt svar till användaren på svenska"),
  suggestion: z.object({
    description: z.string().describe("Kort beskrivning av verifikationen"),
    lines: z.array(
      z.object({
        accountNumber: z.number().describe("Kontonummer från BAS-kontoplanen"),
        accountName: z.string().describe("Kontonamn"),
        debit: z.number().describe("Debetbelopp i kr, 0 om inget"),
        credit: z.number().describe("Kreditbelopp i kr, 0 om inget"),
      })
    ).describe("Bokföringsrader som balanserar"),
  }).optional().describe("Bokföringsförslag om användaren beskriver en transaktion"),
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { messages, context } = await req.json();

    let systemPrompt = BOOKKEEPING_SYSTEM_PROMPT;
    if (context?.entryType) {
      systemPrompt += `\n\nKontext: Verifikationstyp: ${context.entryType}`;
    }
    if (context?.description) {
      systemPrompt += `\nBeskrivning: ${context.description}`;
    }

    const { object } = await generateObject({
      model: bookkeepingModel,
      schema: responseSchema,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    return Response.json(object);
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
