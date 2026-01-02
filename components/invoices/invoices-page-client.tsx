"use client";

import { useState } from "react";
import { Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc/client";
import { CreateInvoiceDialog } from "@/components/invoices/create-invoice-dialog";
import { generateInvoicePdf } from "@/lib/utils/invoice-pdf";
import { useWorkspace } from "@/components/workspace-provider";
import { InvoicesTable } from "@/components/invoices/invoices-table";

export function InvoicesPageClient() {
  const { workspace } = useWorkspace();
  const [createOpen, setCreateOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: invoices, isLoading } = trpc.invoices.list.useQuery({
    workspaceId: workspace.id,
  });

  const markAsSent = trpc.invoices.markAsSent.useMutation({
    onSuccess: () => utils.invoices.list.invalidate(),
  });

  const markAsPaid = trpc.invoices.markAsPaid.useMutation({
    onSuccess: () => utils.invoices.list.invalidate(),
  });

  const deleteInvoice = trpc.invoices.delete.useMutation({
    onSuccess: () => utils.invoices.list.invalidate(),
  });

  const handleDownloadPdf = async (invoiceId: string) => {
    const invoice = invoices?.find((i) => i.id === invoiceId);
    if (!invoice) return;

    const pdf = generateInvoicePdf({
      workspace,
      invoice,
      customer: invoice.customer,
      lines: invoice.lines,
    });

    pdf.save(`Faktura-${invoice.invoiceNumber}.pdf`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Fakturor</h1>
          <p className="text-muted-foreground">
            Skapa och hantera kundfakturor
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4 mr-2" />
          Ny faktura
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="size-8" />
        </div>
      ) : invoices?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Inga fakturor ännu</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setCreateOpen(true)}
          >
            Skapa din första faktura
          </Button>
        </div>
      ) : (
        <InvoicesTable
          invoices={invoices || []}
          onDownloadPdf={handleDownloadPdf}
          onMarkAsSent={(invoiceId) => markAsSent.mutate({ workspaceId: workspace.id, id: invoiceId })}
          onMarkAsPaid={(invoiceId) => markAsPaid.mutate({ workspaceId: workspace.id, id: invoiceId })}
          onDelete={(invoiceId) => deleteInvoice.mutate({ workspaceId: workspace.id, id: invoiceId })}
        />
      )}

      <CreateInvoiceDialog
        workspaceId={workspace.id}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}

