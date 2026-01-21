"use client";

import { useQueryState, parseAsString } from "nuqs";
import { X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

interface PayrollEntry {
  id: string;
  grossSalary: string;
  taxDeduction: string;
  employerContributions: string;
  netSalary: string;
  payrollRun: {
    id: string;
    period: string;
    runNumber: number;
    paymentDate: string;
    status: string;
  };
}

interface PersonalDetailClientProps {
  entries: PayrollEntry[];
  availableYears: string[];
  selectedYear?: string;
  workspaceSlug: string;
}

export function PersonalDetailClient({
  entries,
  availableYears,
  selectedYear: initialSelectedYear,
  workspaceSlug,
}: PersonalDetailClientProps) {
  const [year, setYear] = useQueryState("year", parseAsString.withDefault(""));

  const formatCurrency = (value: string | null) => {
    if (!value) return "0 kr";
    return `${parseFloat(value).toLocaleString("sv-SE")} kr`;
  };

  const formatPeriod = (period: string) => {
    return `${period.substring(0, 4)}-${period.substring(4)}`;
  };

  const selectedYear = year || initialSelectedYear;
  const hasFilters = !!selectedYear;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Lönehistorik</CardTitle>
          <div className="flex items-center gap-2">
            <Select
              value={selectedYear || "all"}
              onValueChange={(value) => setYear(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Välj år" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla år</SelectItem>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setYear(null)}
              >
                <X className="size-4 mr-1" />
                Rensa
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>
              {selectedYear
                ? `Inga löner registrerade för ${selectedYear}`
                : "Inga löner registrerade"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4">Period</TableHead>
                <TableHead className="px-4">Körning</TableHead>
                <TableHead className="px-4">Utbetalningsdatum</TableHead>
                <TableHead className="px-4 text-right">Bruttolön</TableHead>
                <TableHead className="px-4 text-right">Skatteavdrag</TableHead>
                <TableHead className="px-4 text-right">Arb.avg</TableHead>
                <TableHead className="px-4 text-right">Nettolön</TableHead>
                <TableHead className="px-4 w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="px-4 font-medium">
                    {formatPeriod(entry.payrollRun.period)}
                  </TableCell>
                  <TableCell className="px-4">Körning {entry.payrollRun.runNumber}</TableCell>
                  <TableCell className="px-4">{entry.payrollRun.paymentDate}</TableCell>
                  <TableCell className="px-4 text-right font-mono">
                    {formatCurrency(entry.grossSalary)}
                  </TableCell>
                  <TableCell className="px-4 text-right font-mono">
                    {formatCurrency(entry.taxDeduction)}
                  </TableCell>
                  <TableCell className="px-4 text-right font-mono">
                    {formatCurrency(entry.employerContributions)}
                  </TableCell>
                  <TableCell className="px-4 text-right font-mono">
                    {formatCurrency(entry.netSalary)}
                  </TableCell>
                  <TableCell className="px-4">
                    <Link
                      href={`/${workspaceSlug}/employees/payroll/${entry.payrollRun.id}`}
                    >
                      <Button variant="ghost" size="sm">
                        Öppna
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

