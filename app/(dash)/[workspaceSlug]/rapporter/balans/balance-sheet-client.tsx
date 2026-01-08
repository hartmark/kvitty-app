"use client";

import { useState } from "react";
import { useQueryState, parseAsString } from "nuqs";
import { trpc } from "@/lib/trpc/client";
import { BalanceSheetTable } from "@/components/reports/report-table";
import { PeriodSelector } from "@/components/reports/period-selector";
import { ReportExportMenu } from "@/components/reports/report-export-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle, Warning, ArrowClockwise } from "@phosphor-icons/react";
import { generateBalanceSheetCsv } from "@/lib/utils/report-csv/balance-sheet-csv";
import { toast } from "sonner";

interface Period {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isLocked: boolean;
}

interface BalanceSheetClientProps {
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

export function BalanceSheetClient({
  workspaceId,
  workspaceName,
  workspaceOrgName,
  periods,
  defaultPeriodId,
}: BalanceSheetClientProps) {
  const [selectedPeriodId, setSelectedPeriodId] = useQueryState(
    "period",
    parseAsString.withDefault(defaultPeriodId)
  );
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, isError, error, refetch } = trpc.reports.balanceSheet.useQuery(
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
      const url = `/api/reports/balance-sheet/${selectedPeriodId}/pdf`;
      const response = await fetch(url);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Okänt fel" }));
        throw new Error(error.error || "PDF-generering misslyckades");
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const newWindow = window.open(blobUrl, "_blank");

      if (!newWindow) {
        toast.error("Popup blockerades. Tillåt popups för denna sida.");
      } else {
        toast.success("PDF öppnas i nytt fönster");
      }

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
      const csv = generateBalanceSheetCsv({
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
        assets: data.assets,
        equityLiabilities: data.equityLiabilities,
        currentYearProfit: data.currentYearProfit,
        isBalanced: data.isBalanced,
      });

      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const filename = `Balansrapport_${data.period.label.replace(/\s/g, "_")}.csv`;
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
        <AlertTitle>Kunde inte ladda balansräkning</AlertTitle>
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

        <div className="flex items-center gap-4">
          {data?.period && (
            <div className="text-sm text-muted-foreground">
              Per {data.period.endDate}
            </div>
          )}
          {data?.isBalanced !== undefined && (
            data.isBalanced ? (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle className="size-3" />
                Balanserad
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <Warning className="size-3" />
                Ej balanserad
              </Badge>
            )
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tillgångar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.assets.total || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Eget kapital & Skulder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.equityLiabilities.total || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Differens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                data?.isBalanced ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(
                (data?.assets.total || 0) - (data?.equityLiabilities.total || 0)
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Balance sheet table */}
      <Card>
        <CardHeader>
          <CardTitle>Balansräkning</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.assets.groups && data?.equityLiabilities.groups ? (
            <BalanceSheetTable
              leftTitle="Tillgångar"
              leftGroups={data.assets.groups}
              leftTotal={data.assets.total}
              rightTitle="Eget kapital & Skulder"
              rightGroups={data.equityLiabilities.groups}
              rightTotal={data.equityLiabilities.total}
              showAccountNumbers={true}
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
