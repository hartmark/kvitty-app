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
  } catch (error) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
}

