"use client";

import { Button } from "@/components/ui/button";
import { Download } from "@phosphor-icons/react";

interface DownloadInvoiceButtonProps {
  invoiceId: string;
  token: string;
  invoiceNumber: number;
}

export function DownloadInvoiceButton({
  invoiceId,
  token,
  invoiceNumber,
}: DownloadInvoiceButtonProps) {
  const handleDownload = () => {
    const url = `/api/invoices/${invoiceId}/pdf?token=${encodeURIComponent(token)}`;
    const link = document.createElement("a");
    link.href = url;
    link.download = `Faktura_${invoiceNumber}.pdf`;
    link.click();
  };

  return (
    <Button onClick={handleDownload} variant="outline">
      <Download className="mr-2 h-4 w-4" />
      Ladda ner PDF
    </Button>
  );
}

