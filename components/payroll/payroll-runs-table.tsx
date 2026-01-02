"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface PayrollRun {
  id: string;
  period: string;
  runNumber: number;
  paymentDate: string;
  totalGrossSalary: string | null;
  totalEmployerContributions: string | null;
  status: string;
}

interface PayrollRunsTableProps {
  runs: PayrollRun[];
  workspaceSlug: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "Utkast", color: "bg-gray-100 text-gray-700" },
  calculated: { label: "Beräknad", color: "bg-blue-100 text-blue-700" },
  approved: { label: "Godkänd", color: "bg-green-100 text-green-700" },
  paid: { label: "Utbetald", color: "bg-purple-100 text-purple-700" },
  reported: { label: "Rapporterad", color: "bg-teal-100 text-teal-700" },
};

export function PayrollRunsTable({
  runs,
  workspaceSlug,
}: PayrollRunsTableProps) {
  const formatCurrency = (value: string | null) => {
    if (!value) return "0 kr";
    return `${parseFloat(value).toLocaleString("sv-SE")} kr`;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Period</TableHead>
          <TableHead>Körning</TableHead>
          <TableHead>Utbetalningsdatum</TableHead>
          <TableHead className="text-right">Bruttolön</TableHead>
          <TableHead className="text-right">Arbetsgivaravgift</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[100px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => {
          const status = statusLabels[run.status] || statusLabels.draft;
          return (
            <TableRow key={run.id}>
              <TableCell className="font-medium">
                {run.period.substring(0, 4)}-{run.period.substring(4)}
              </TableCell>
              <TableCell>Körning {run.runNumber}</TableCell>
              <TableCell>{run.paymentDate}</TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(run.totalGrossSalary)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(run.totalEmployerContributions)}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={status.color}>
                  {status.label}
                </Badge>
              </TableCell>
              <TableCell>
                <Link href={`/${workspaceSlug}/personal/lon/${run.id}`}>
                  <Button variant="ghost" size="sm">
                    Öppna
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

