import { NextRequest, NextResponse } from "next/server";
import { appRouter } from "@/lib/trpc/router";
import { createTRPCContext } from "@/lib/trpc/init";
import { generateBalanceSheetPdf } from "@/lib/utils/report-pdf/balance-sheet-pdf";
import { db } from "@/lib/db";
import { fiscalPeriods, workspaces, workspaceMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fiscalPeriodId: string }> }
) {
  const { fiscalPeriodId } = await params;

  try {
    // Create context (includes session check)
    const ctx = await createTRPCContext();

    // Session check
    if (!ctx.session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get fiscal period to find workspaceId
    const period = await db.query.fiscalPeriods.findFirst({
      where: eq(fiscalPeriods.id, fiscalPeriodId),
    });

    if (!period) {
      return NextResponse.json({ error: "Period not found" }, { status: 404 });
    }

    // Verify user has access to this workspace
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, period.workspaceId),
        eq(workspaceMembers.userId, ctx.session.user.id)
      ),
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Create tRPC caller
    const caller = appRouter.createCaller(ctx);

    // Get report data (workspace membership verified by workspaceProcedure)
    const reportData = await caller.reports.balanceSheet({
      workspaceId: period.workspaceId,
      fiscalPeriodId,
    });

    // Get workspace info for PDF
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, period.workspaceId),
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Generate PDF
    try {
      const pdfDoc = generateBalanceSheetPdf({
        workspace: {
          id: workspace.id,
          name: workspace.name,
          orgName: workspace.orgName,
          orgNumber: workspace.orgNumber,
          address: workspace.address,
          postalCode: workspace.postalCode,
          city: workspace.city,
        },
        period: reportData.period,
        assets: reportData.assets,
        equityLiabilities: reportData.equityLiabilities,
        currentYearProfit: reportData.currentYearProfit,
        isBalanced: reportData.isBalanced,
      });

      const pdfBuffer = Buffer.from(pdfDoc.output("arraybuffer") as ArrayBuffer);

      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="Balansrapport_${reportData.period.label.replace(/\s/g, "_")}.pdf"`,
        },
      });
    } catch (pdfError) {
      console.error("[Balance Sheet PDF] PDF generation failed", {
        error: pdfError instanceof Error ? pdfError.message : String(pdfError),
        errorStack: pdfError instanceof Error ? pdfError.stack : undefined,
        fiscalPeriodId,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: "Kunde inte generera PDF" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[Balance Sheet PDF] Error", {
      error: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      fiscalPeriodId,
      timestamp: new Date().toISOString(),
    });

    // Check for specific errors
    if (error instanceof Error && error.message.includes("NOT_FOUND")) {
      return NextResponse.json({ error: "Period not found" }, { status: 404 });
    }

    if (error instanceof Error && error.message.includes("FORBIDDEN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Ett fel uppstod" },
      { status: 500 }
    );
  }
}
