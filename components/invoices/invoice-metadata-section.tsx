"use client";

import { Pencil } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Invoice, Customer, Workspace } from "@/lib/db/schema";

interface InvoiceWithCustomer extends Invoice {
  customer: Customer;
}

interface InvoiceMetadataSectionProps {
  invoice: InvoiceWithCustomer;
  workspace: Workspace;
  isDraft: boolean;
  onEdit: () => void;
}

export function InvoiceMetadataSection({
  invoice,
  workspace,
  isDraft,
  onEdit,
}: InvoiceMetadataSectionProps) {
  // Calculate effective payment terms (invoice override or workspace default)
  const paymentTerms = invoice.paymentTermsDays || workspace.paymentTermsDays || 30;

  // Format payment method label
  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return null;
    const labels: Record<string, string> = {
      bankgiro: "Bankgiro",
      plusgiro: "Plusgiro",
      iban: "IBAN",
      swish: "Swish",
      paypal: "PayPal",
      custom: "Egen",
    };
    return labels[method] || method;
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Kund</p>
              <p className="font-medium">{invoice.customer.name}</p>
              {invoice.customer.orgNumber && (
                <p className="text-sm text-muted-foreground">
                  {invoice.customer.orgNumber}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fakturadatum</p>
              <p className="font-medium">{invoice.invoiceDate}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Förfallodatum</p>
              <p className="font-medium">{invoice.dueDate}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Betalningsvillkor</p>
              <p className="font-medium">{paymentTerms} dagar</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Referens</p>
              <p className="font-medium">{invoice.reference || "-"}</p>
            </div>
            {invoice.deliveryTerms && (
              <div>
                <p className="text-sm text-muted-foreground">Leveransvillkor</p>
                <p className="font-medium">{invoice.deliveryTerms}</p>
              </div>
            )}
            {invoice.latePaymentInterest && (
              <div>
                <p className="text-sm text-muted-foreground">Dröjsmålsränta</p>
                <p className="font-medium">{invoice.latePaymentInterest}%</p>
              </div>
            )}
            {invoice.ocrNumber && (
              <div>
                <p className="text-sm text-muted-foreground">OCR-nummer</p>
                <p className="font-medium font-mono">{invoice.ocrNumber}</p>
              </div>
            )}
            {invoice.paymentMethod && (
              <div>
                <p className="text-sm text-muted-foreground">Betalningsmetod</p>
                <p className="font-medium">
                  {getPaymentMethodLabel(invoice.paymentMethod)}
                  {invoice.paymentAccount && `: ${invoice.paymentAccount}`}
                </p>
              </div>
            )}
          </div>
          {isDraft && (
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Pencil className="size-4 mr-2" />
              Redigera
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
