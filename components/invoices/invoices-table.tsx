"use client";

import { FilePdf, PaperPlaneTilt, Check, DotsThree, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { InvoiceStatus } from "@/lib/db/schema";

interface Invoice {
  id: string;
  invoiceNumber: number;
  customer: {
    name: string;
  };
  invoiceDate: string;
  dueDate: string;
  total: string;
  status: InvoiceStatus;
}

interface InvoicesTableProps {
  invoices: Invoice[];
  onDownloadPdf: (invoiceId: string) => void;
  onMarkAsSent: (invoiceId: string) => void;
  onMarkAsPaid: (invoiceId: string) => void;
  onDelete: (invoiceId: string) => void;
}

const statusLabels: Record<InvoiceStatus, string> = {
  draft: "Utkast",
  sent: "Skickad",
  paid: "Betald",
};

const statusColors: Record<InvoiceStatus, "secondary" | "default" | "outline"> = {
  draft: "secondary",
  sent: "default",
  paid: "outline",
};

export function InvoicesTable({
  invoices,
  onDownloadPdf,
  onMarkAsSent,
  onMarkAsPaid,
  onDelete,
}: InvoicesTableProps) {
  const formatCurrency = (value: string) => {
    return parseFloat(value).toLocaleString("sv-SE", {
      minimumFractionDigits: 2,
    }) + " kr";
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-24">Nummer</TableHead>
          <TableHead>Kund</TableHead>
          <TableHead>Datum</TableHead>
          <TableHead>Förfaller</TableHead>
          <TableHead>Belopp</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell className="font-mono">{invoice.invoiceNumber}</TableCell>
            <TableCell>{invoice.customer.name}</TableCell>
            <TableCell>{new Date(invoice.invoiceDate).toLocaleDateString("sv-SE")}</TableCell>
            <TableCell>{new Date(invoice.dueDate).toLocaleDateString("sv-SE")}</TableCell>
            <TableCell className="font-mono">{formatCurrency(invoice.total)}</TableCell>
            <TableCell>
              <Badge variant={statusColors[invoice.status]}>
                {statusLabels[invoice.status]}
              </Badge>
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <DotsThree className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onDownloadPdf(invoice.id)}>
                    <FilePdf className="size-4 mr-2" />
                    Ladda ner PDF
                  </DropdownMenuItem>
                  {invoice.status === "draft" && (
                    <DropdownMenuItem onClick={() => onMarkAsSent(invoice.id)}>
                      <PaperPlaneTilt className="size-4 mr-2" />
                      Markera som skickad
                    </DropdownMenuItem>
                  )}
                  {invoice.status === "sent" && (
                    <DropdownMenuItem onClick={() => onMarkAsPaid(invoice.id)}>
                      <Check className="size-4 mr-2" />
                      Markera som betald
                    </DropdownMenuItem>
                  )}
                  {invoice.status === "draft" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => onDelete(invoice.id)}
                      >
                        <Trash className="size-4 mr-2" />
                        Ta bort
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

