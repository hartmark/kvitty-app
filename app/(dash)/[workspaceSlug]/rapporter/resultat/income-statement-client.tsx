"use client";

import { useState } from "react";
import { useQueryState, parseAsString } from "nuqs";
import { trpc } from "@/lib/trpc/client";
import { ReportTable } from "@/components/reports/report-table";
import { PeriodSelector } from "@/components/reports/period-selector";
import { ReportExportMenu } from "@/components/reports/report-export-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Warning, ArrowClockwise } from "@phosphor-icons/react";
import { generateIncomeStatementCsv } from "@/lib/utils/report-csv/income-statement-csv";
import { toast } from "sonner";

interface Period {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isLocked: boolean;
}

interface IncomeStatementClientProps {
  workspaceId: string;
  workspaceName: string;
  workspaceOrgName?: string | null;
  periods: Period[];
  defaultPeriodId: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function IncomeStatementClient({
  workspaceId,
  workspaceName,
  workspaceOrgName,
  periods,
  defaultPeriodId,
}: IncomeStatementClientProps) {
  const [selectedPeriodId, setSelectedPeriodId] = useQueryState(
    "period",
    parseAsString.withDefault(defaultPeriodId)
  );
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, isError, error, refetch } = trpc.reports.incomeStatement.useQuery(
    {
      workspaceId,
      fiscalPeriodId: selectedPeriodId,
    },
    { enabled: !!selectedPeriodId }
  );

  const handlePeriodChange = (periodId: string) => {
    setSelectedPeriodId(periodId);
  };

  const handleExportPDF = async () => {
    if (!data) {
      toast.error("Ingen data att exportera");
      return;
    }

    setIsExporting(true);
    try {
      const url = `/api/reports/income-statement/${selectedPeriodId}/pdf`;
      const response = await fetch(url);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Okänt fel" }));
        throw new Error(error.error || "PDF-generering misslyckades");
      }

      // Create blob and open in new window
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const newWindow = window.open(blobUrl, "_blank");

      if (!newWindow) {
        toast.error("Popup blockerades. Tillåt popups för denna sida.");
      } else {
        toast.success("PDF öppnas i nytt fönster");
      }

      // Clean up blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error(error instanceof Error ? error.message : "Kunde inte exportera PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    if (!data) {
      toast.error("Ingen data att exportera");
      return;
    }

    setIsExporting(true);
    try {
      const csv = generateIncomeStatementCsv({
        workspace: {
          id: workspaceId,
          name: workspaceName,
          orgName: workspaceOrgName,
          orgNumber: null,
          address: null,
          postalCode: null,
          city: null,
        },
        period: data.period,
        groups: data.groups,
        totals: data.totals,
      });

      // Create blob and download
      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const filename = `Resultatrapport_${data.period.label.replace(/\s/g, "_")}.csv`;
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`CSV-fil nedladdad: ${filename}`);
    } catch (error) {
      console.error("CSV export error:", error);
      toast.error("Kunde inte generera CSV-fil");
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <Warning className="size-4" />
        <AlertTitle>Kunde inte ladda resultaträkning</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>{error?.message || "Ett oväntat fel uppstod."}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="ml-4"
          >
            <ArrowClockwise className="mr-2 size-4" />
            Försök igen
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PeriodSelector
            periods={periods}
            selectedPeriodId={selectedPeriodId}
            onPeriodChange={handlePeriodChange}
          />
          <ReportExportMenu
            onExportPDF={handleExportPDF}
            onExportCSV={handleExportCSV}
            isLoading={isExporting}
            disabled={!data}
          />
        </div>

        {data?.period && (
          <div className="text-sm text-muted-foreground">
            {data.period.startDate} - {data.period.endDate}
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Intäkter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data?.totals.revenue || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Kostnader
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(data?.totals.expenses || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resultat före skatt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                (data?.totals.profitBeforeTax || 0) >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {formatCurrency(data?.totals.profitBeforeTax || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Årets resultat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                (data?.totals.profit || 0) >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {formatCurrency(data?.totals.profit || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full report table */}
      <Card>
        <CardHeader>
          <CardTitle>Resultaträkning</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.groups && data.groups.length > 0 ? (
            <ReportTable
              groups={data.groups}
              showAccountNumbers={true}
              totalLabel="Årets resultat"
              total={data.totals.profit}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Inga transaktioner under denna period.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
