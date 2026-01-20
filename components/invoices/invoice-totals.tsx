"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { Invoice, Currency } from "@/lib/db/schema";
import { formatCurrency } from "@/lib/utils";

interface InvoiceTotalsProps {
  invoice: Invoice;
}

export function InvoiceTotals({ invoice }: InvoiceTotalsProps) {
  const currency = invoice.currency as Currency;
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Summa exkl. moms</span>
              <span>{formatCurrency(parseFloat(invoice.subtotal), currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Moms</span>
              <span>{formatCurrency(parseFloat(invoice.vatAmount), currency)}</span>
            </div>
            <div className="flex justify-between font-medium text-lg pt-2 border-t">
              <span>Att betala</span>
              <span>{formatCurrency(parseFloat(invoice.total), currency)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
