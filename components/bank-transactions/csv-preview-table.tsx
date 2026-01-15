"use client";

import { AlertTriangle, X, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/utils";

interface Transaction {
  rowIndex: number;
  parsed: {
    accountingDate: string | null;
    amount: number | null;
    reference: string | null;
    bookedBalance: number | null;
  };
  isDuplicate: boolean;
  firstOccurrenceRow?: number;
  validationErrors: string[];
}

interface CsvPreviewTableProps {
  transactions: Transaction[];
  selectedRows: Set<number>;
  onSelectionChange: (selectedRows: Set<number>) => void;
}

function StatusBadge({ transaction }: { transaction: Transaction }) {
  if (transaction.validationErrors.length > 0) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="destructive" className="gap-1">
            <X className="size-3" />
            Fel
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <ul className="text-xs">
            {transaction.validationErrors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (transaction.isDuplicate) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <Badge
            variant="secondary"
            className="gap-1 bg-yellow-100 text-yellow-800"
          >
            <AlertTriangle className="size-3" />
            Dubblett
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            Identisk med rad {(transaction.firstOccurrenceRow ?? 0) + 1}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800">
      <Check className="size-3" />
      OK
    </Badge>
  );
}

export function CsvPreviewTable({
  transactions,
  selectedRows,
  onSelectionChange,
}: CsvPreviewTableProps) {
  const toggleRow = (rowIndex: number) => {
    const next = new Set(selectedRows);
    if (next.has(rowIndex)) {
      next.delete(rowIndex);
    } else {
      next.add(rowIndex);
    }
    onSelectionChange(next);
  };

  const toggleAll = () => {
    if (selectedRows.size === transactions.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(transactions.map((t) => t.rowIndex)));
    }
  };

  const selectValidOnly = () => {
    const valid = transactions.filter(
      (t) => !t.isDuplicate && t.validationErrors.length === 0
    );
    onSelectionChange(new Set(valid.map((t) => t.rowIndex)));
  };

  const allSelected =
    selectedRows.size === transactions.length && transactions.length > 0;
  const someSelected =
    selectedRows.size > 0 && selectedRows.size < transactions.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-sm">
        <button
          type="button"
          onClick={toggleAll}
          className="text-primary hover:underline"
        >
          {allSelected ? "Avmarkera alla" : "Markera alla"}
        </button>
        <button
          type="button"
          onClick={selectValidOnly}
          className="text-primary hover:underline"
        >
          Markera endast giltiga
        </button>
      </div>

      <div className="border rounded-lg max-h-[400px] overflow-auto">
        <TooltipProvider>
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      allSelected || (someSelected ? "indeterminate" : false)
                    }
                    onCheckedChange={toggleAll}
                    aria-label="Välj alla"
                  />
                </TableHead>
                <TableHead>Datum</TableHead>
                <TableHead className="text-right">Belopp</TableHead>
                <TableHead>Referens</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="w-28">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => {
                const isSelected = selectedRows.has(t.rowIndex);
                const hasErrors = t.validationErrors.length > 0;

                let rowClass = "";
                if (hasErrors) rowClass = "bg-red-50";
                else if (t.isDuplicate) rowClass = "bg-yellow-50";
                else if (isSelected) rowClass = "bg-primary/5";

                return (
                  <TableRow key={t.rowIndex} className={rowClass}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleRow(t.rowIndex)}
                        aria-label={`Välj rad ${t.rowIndex + 1}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {t.parsed.accountingDate ?? "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {t.parsed.amount !== null ? (
                        <span
                          className={
                            t.parsed.amount < 0
                              ? "text-red-600"
                              : "text-green-600"
                          }
                        >
                          {formatCurrency(t.parsed.amount)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {t.parsed.reference ?? "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {t.parsed.bookedBalance !== null
                        ? formatCurrency(t.parsed.bookedBalance)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge transaction={t} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TooltipProvider>
      </div>
    </div>
  );
}
