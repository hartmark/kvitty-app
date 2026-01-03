"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FilePdf,
  PaperPlaneTilt,
  Check,
  Trash,
  Plus,
  TextT,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { useWorkspace } from "@/components/workspace-provider";
import { generateInvoicePdf } from "@/lib/utils/invoice-pdf";
import { InvoiceMetadataSection } from "@/components/invoices/invoice-metadata-section";
import { InvoiceLinesSection } from "@/components/invoices/invoice-lines-section";
import { InvoiceTotals } from "@/components/invoices/invoice-totals";
import { AddProductDialog } from "@/components/invoices/add-product-dialog";

interface InvoiceDetailClientProps {
  invoiceId: string;
}

export function InvoiceDetailClient({ invoiceId }: InvoiceDetailClientProps) {
  const { workspace } = useWorkspace();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [addProductOpen, setAddProductOpen] = useState(false);

  const { data: invoice, isLoading } = trpc.invoices.get.useQuery({
    workspaceId: workspace.id,
    id: invoiceId,
  });

  const markAsSent = trpc.invoices.markAsSent.useMutation({
    onSuccess: () => utils.invoices.get.invalidate({ workspaceId: workspace.id, id: invoiceId }),
  });

  const markAsPaid = trpc.invoices.markAsPaid.useMutation({
    onSuccess: () => utils.invoices.get.invalidate({ workspaceId: workspace.id, id: invoiceId }),
  });

  const deleteInvoice = trpc.invoices.delete.useMutation({
    onSuccess: () => router.push(`/${workspace.slug}/fakturor`),
  });

  const addTextLine = trpc.invoices.addLine.useMutation({
    onSuccess: () => utils.invoices.get.invalidate({ workspaceId: workspace.id, id: invoiceId }),
  });

  const handleDownloadPdf = () => {
    if (!invoice) return;
    const doc = generateInvoicePdf({
      workspace,
      invoice,
      customer: invoice.customer,
      lines: invoice.lines,
    });
    doc.save(`faktura-${invoice.invoiceNumber}.pdf`);
  };

  const handleAddTextLine = () => {
    if (!invoice) return;
    addTextLine.mutate({
      workspaceId: workspace.id,
      invoiceId,
      lineType: "text",
      description: "Ny textrad",
      quantity: 1,
      unitPrice: 0,
      vatRate: 0,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Fakturan hittades inte</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href={`/${workspace.slug}/fakturor`}>Tillbaka till fakturor</Link>
        </Button>
      </div>
    );
  }

  const isDraft = invoice.status === "draft";

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/${workspace.slug}/fakturor`}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">
                Faktura #{invoice.invoiceNumber}
              </h1>
              <Badge
                variant={
                  invoice.status === "draft"
                    ? "secondary"
                    : invoice.status === "sent"
                    ? "default"
                    : "outline"
                }
              >
                {invoice.status === "draft"
                  ? "Utkast"
                  : invoice.status === "sent"
                  ? "Skickad"
                  : "Betald"}
              </Badge>
            </div>
            <p className="text-muted-foreground">{invoice.customer.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleDownloadPdf}>
            <FilePdf className="size-4 mr-2" />
            Ladda ner PDF
          </Button>
          {isDraft && (
            <>
              <Button
                onClick={() => markAsSent.mutate({ workspaceId: workspace.id, id: invoiceId })}
                disabled={markAsSent.isPending}
              >
                {markAsSent.isPending ? (
                  <Spinner className="size-4 mr-2" />
                ) : (
                  <PaperPlaneTilt className="size-4 mr-2" />
                )}
                Markera som skickad
              </Button>
            </>
          )}
          {invoice.status === "sent" && (
            <Button
              onClick={() => markAsPaid.mutate({ workspaceId: workspace.id, id: invoiceId })}
              disabled={markAsPaid.isPending}
            >
              {markAsPaid.isPending ? (
                <Spinner className="size-4 mr-2" />
              ) : (
                <Check className="size-4 mr-2" />
              )}
              Markera som betald
            </Button>
          )}
          {isDraft && (
            <Button
              variant="ghost"
              size="icon"
              className="text-red-600"
              onClick={() => {
                if (confirm("Är du säker på att du vill ta bort denna faktura?")) {
                  deleteInvoice.mutate({ workspaceId: workspace.id, id: invoiceId });
                }
              }}
            >
              <Trash className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Metadata Section */}
      <InvoiceMetadataSection invoice={invoice} isDraft={isDraft} />

      {/* Lines Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Rader</CardTitle>
          {isDraft && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddProductOpen(true)}
              >
                <Plus className="size-4 mr-2" />
                Lägg till produkt
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddTextLine}
                disabled={addTextLine.isPending}
              >
                <TextT className="size-4 mr-2" />
                Ny textrad
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <InvoiceLinesSection
            workspaceId={workspace.id}
            invoiceId={invoiceId}
            lines={invoice.lines}
            isDraft={isDraft}
          />
        </CardContent>
      </Card>

      {/* Totals */}
      <InvoiceTotals invoice={invoice} />

      {/* Add Product Dialog */}
      <AddProductDialog
        open={addProductOpen}
        onOpenChange={setAddProductOpen}
        workspaceId={workspace.id}
        invoiceId={invoiceId}
      />
    </div>
  );
}
