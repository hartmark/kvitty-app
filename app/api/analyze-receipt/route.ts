import { generateObject } from "ai";
import { z } from "zod";
import { visionModel } from "@/lib/ai";
import { getSession } from "@/lib/session";

const receiptSchema = z.object({
  success: z.boolean().describe("Om analysen lyckades"),
  data: z.object({
    vendor: z.string().optional().describe("Butik/leverantör"),
    date: z.string().optional().describe("Datum i format YYYY-MM-DD"),
    totalAmount: z.number().optional().describe("Totalbelopp inkl moms"),
    vatAmount: z.number().optional().describe("Momsbelopp"),
    vatRate: z.number().optional().describe("Momssats i procent (6, 12, eller 25)"),
    description: z.string().optional().describe("Kort beskrivning av köpet"),
    items: z.array(z.object({
      name: z.string(),
      quantity: z.number().optional(),
      unitPrice: z.number().optional(),
      totalPrice: z.number().optional(),
    })).optional().describe("Produkter/tjänster på kvittot"),
    suggestedEntry: z.object({
      description: z.string().describe("Beskrivning för verifikationen"),
      lines: z.array(z.object({
        accountNumber: z.number().describe("Kontonummer från BAS-kontoplanen"),
        accountName: z.string().describe("Kontonamn"),
        debit: z.number().describe("Debetbelopp i kr, 0 om inget"),
        credit: z.number().describe("Kreditbelopp i kr, 0 om inget"),
      })).describe("Bokföringsrader som balanserar"),
    }).optional().describe("Förslag på bokföring"),
  }).optional(),
  error: z.string().optional().describe("Felmeddelande om analysen misslyckades"),
});

const RECEIPT_ANALYSIS_PROMPT = `Du är en expert på att analysera svenska kvitton och fakturor för bokföring.

Analysera bilden och extrahera följande information:
- Butik/leverantör
- Datum
- Totalbelopp (inkl moms)
- Momsbelopp och momssats
- Vad som köpts (beskrivning)
- Enskilda produkter om synliga

Skapa även ett bokföringsförslag enligt svensk BAS-kontoplan:
- För inköp: Debitera lämpligt kostnadskonto (t.ex. 5410 Förbrukningsinventarier, 6110 Kontorsmaterial)
- Kreditera 1930 Företagskonto/Bank eller 2440 Leverantörsskulder
- Om moms finns: Debitera 2640 Ingående moms

Svara ALLTID på svenska. Var noggrann med att totalbelopp = nettobelopp + moms.`;

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return Response.json({ success: false, error: "Ingen fil uppladdad" });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";

    const { object } = await generateObject({
      model: visionModel,
      schema: receiptSchema,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: RECEIPT_ANALYSIS_PROMPT },
            {
              type: "image",
              image: `data:${mimeType};base64,${base64}`,
            },
          ],
        },
      ],
    });

    return Response.json(object);
  } catch (error) {
    console.error("Receipt analysis error:", error);
    return Response.json({
      success: false,
      error: "Kunde inte analysera kvittot. Försök igen.",
    });
  }
}
