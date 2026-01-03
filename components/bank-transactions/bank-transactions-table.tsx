"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createColumns, type BankTransaction } from "./bank-transaction-columns";
import { BankTransactionDetailSheet } from "./bank-transaction-detail-sheet";

interface BankTransactionsTableProps {
  data: BankTransaction[];
  workspaceId: string;
  hasFilters: boolean;
}

export function BankTransactionsTable({
  data,
  workspaceId,
  hasFilters,
}: BankTransactionsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedTransaction, setSelectedTransaction] =
    useState<BankTransaction | null>(null);

  const columns = useMemo(
    () => createColumns(setSelectedTransaction),
    []
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  return (
    <>
      <div className="bg-background rounded-xl border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => setSelectedTransaction(row.original)}
                  className="cursor-pointer"
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {hasFilters
                    ? "Inga transaktioner matchar din sökning."
                    : "Inga transaktioner hittades."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <BankTransactionDetailSheet
        transaction={selectedTransaction}
        workspaceId={workspaceId}
        open={!!selectedTransaction}
        onOpenChange={(open) => !open && setSelectedTransaction(null)}
      />
    </>
  );
}

