import { NextRequest, NextResponse } from "next/server";
import { appRouter } from "@/lib/trpc/router";
import { createTRPCContext } from "@/lib/trpc/init";
import { generateInvoicePdf } from "@/lib/utils/invoice-pdf";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  try {
    const ctx = await createTRPCContext();
    const caller = appRouter.createCaller(ctx);

    const invoice = await caller.invoices.getByToken({
      invoiceId,
      token,
    });

    try {
      const pdfDoc = generateInvoicePdf({
        workspace: invoice.workspace,
        invoice,
        customer: invoice.customer,
        lines: invoice.lines,
      });

      const pdfBuffer = Buffer.from(pdfDoc.output("arraybuffer") as ArrayBuffer);

      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="Faktura_${invoice.invoiceNumber}.pdf"`,
        },
      });
    } catch (pdfError) {
      console.error("[Invoice PDF Download] PDF generation failed", {
        error: pdfError instanceof Error ? pdfError.message : String(pdfError),
        errorStack: pdfError instanceof Error ? pdfError.stack : undefined,
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        token: token.substring(0, 8) + "...",
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: "Kunde inte generera PDF" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[Invoice PDF Download] Error", {
      error: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      invoiceId,
      token: token ? token.substring(0, 8) + "..." : "missing",
      timestamp: new Date().toISOString(),
    });

    // Check if it's a NOT_FOUND error
    if (error instanceof Error && error.message.includes("NOT_FOUND")) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Ett fel uppstod" },
      { status: 500 }
    );
  }
}

