"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { Invoice } from "@/lib/db/schema";

interface InvoiceTotalsProps {
  invoice: Invoice;
}

function formatCurrency(value: string | number) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return num.toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " kr";
}

export function InvoiceTotals({ invoice }: InvoiceTotalsProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Summa exkl. moms</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Moms</span>
              <span>{formatCurrency(invoice.vatAmount)}</span>
            </div>
            <div className="flex justify-between font-medium text-lg pt-2 border-t">
              <span>Att betala</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
