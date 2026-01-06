"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";

interface JournalEntry {
  id: string;
  entryDate: string;
  verificationNumber: number;
  description: string | null;
  line: {
    id: string;
    description: string | null;
    debit: string | null;
    credit: string | null;
  };
}

interface AccountTransactionsTableProps {
  entries: JournalEntry[];
  isLoading: boolean;
}

export function AccountTransactionsTable({
  entries,
  isLoading,
}: AccountTransactionsTableProps) {
  const formatCurrency = (value: string | null) => {
    if (!value) return "0 kr";
    const num = parseFloat(value);
    return `${num.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("sv-SE");
  };

  return (
    <div className="bg-background rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4">Datum</TableHead>
            <TableHead className="px-4">Verifikation</TableHead>
            <TableHead className="px-4">Beskrivning</TableHead>
            <TableHead className="px-4 text-right">Summa</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={4} className="px-4 h-24 text-center">
                <Spinner className="size-6 mx-auto" />
              </TableCell>
            </TableRow>
          ) : entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="px-4 h-24 text-center text-muted-foreground">
                Inga transaktioner hittades för detta konto
              </TableCell>
            </TableRow>
          ) : (
            entries.map((item) => {
              const debit = item.line.debit ? parseFloat(item.line.debit) : 0;
              const credit = item.line.credit ? parseFloat(item.line.credit) : 0;

              let amountDisplay = "-";
              if (debit > 0) {
                amountDisplay = `+${formatCurrency(item.line.debit!)}`;
              } else if (credit > 0) {
                amountDisplay = `-${formatCurrency(item.line.credit!)}`;
              }

              return (
                <TableRow key={`${item.id}-${item.line.id}`}>
                  <TableCell className="px-4">{formatDate(item.entryDate)}</TableCell>
                  <TableCell className="px-4">
                    V{item.verificationNumber}
                  </TableCell>
                  <TableCell className="px-4">
                    {item.line.description || item.description}
                  </TableCell>
                  <TableCell className="px-4 text-right">
                    {amountDisplay}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

