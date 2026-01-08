"use client";

import { useState } from "react";
import { useQueryState, parseAsString, parseAsInteger } from "nuqs";
import { trpc } from "@/lib/trpc/client";
import { PeriodSelector } from "@/components/reports/period-selector";
import { ReportExportMenu } from "@/components/reports/report-export-menu";
import { VatPaymentInfo } from "@/components/reports/vat-payment-info";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Warning, ArrowClockwise } from "@phosphor-icons/react";
import { generateVatReportCsv } from "@/lib/utils/report-csv/vat-report-csv";
import { toast } from "sonner";

interface Period {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isLocked: boolean;
}

interface VatReportClientProps {
  workspaceId: string;
  workspaceName: string;
  workspaceOrgName?: string | null;
  periods: Period[];
  defaultPeriodId: string;
  defaultVatPeriodIndex: number;
  vatReportingFrequency: "monthly" | "quarterly" | "yearly";
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function VatReportClient({
  workspaceId,
  workspaceName,
  workspaceOrgName,
  periods,
  defaultPeriodId,
  defaultVatPeriodIndex,
  vatReportingFrequency,
}: VatReportClientProps) {
  const [selectedPeriodId, setSelectedPeriodId] = useQueryState(
    "period",
    parseAsString.withDefault(defaultPeriodId)
  );
  const [selectedVatPeriodIndex, setSelectedVatPeriodIndex] = useQueryState(
    "vatPeriod",
    parseAsInteger.withDefault(defaultVatPeriodIndex)
  );
  const [isExporting, setIsExporting] = useState(false);

  const { data: vatPeriods, isLoading: periodsLoading, isError: periodsError, error: periodsErrorData, refetch: refetchPeriods } =
    trpc.reports.vatPeriods.useQuery(
      {
        workspaceId,
        fiscalPeriodId: selectedPeriodId,
      },
      { enabled: !!selectedPeriodId }
    );

  const { data: vatReport, isLoading: reportLoading, isError: reportError, error: reportErrorData, refetch: refetchReport } =
    trpc.reports.vatReport.useQuery(
      {
        workspaceId,
        fiscalPeriodId: selectedPeriodId,
        periodIndex: selectedVatPeriodIndex,
      },
      { enabled: !!selectedPeriodId }
    );

  const handlePeriodChange = (periodId: string) => {
    setSelectedPeriodId(periodId);
    setSelectedVatPeriodIndex(0); // Reset vat period when fiscal period changes
  };

  const handleVatPeriodChange = (index: string) => {
    setSelectedVatPeriodIndex(parseInt(index, 10));
  };

  const handleExportPDF = async () => {
    if (!vatReport) {
      toast.error("Ingen data att exportera");
      return;
    }

    setIsExporting(true);
    try {
      const url = `/api/reports/vat-report/${selectedPeriodId}/${selectedVatPeriodIndex}/pdf`;
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
    if (!vatReport) {
      toast.error("Ingen data att exportera");
      return;
    }

    setIsExporting(true);
    try {
      const csv = generateVatReportCsv({
        workspace: {
          id: workspaceId,
          name: workspaceName,
          orgName: workspaceOrgName,
          orgNumber: null,
          address: null,
          postalCode: null,
          city: null,
        },
        period: vatReport.period,
        frequency: vatReport.frequency,
        outputVat: vatReport.outputVat,
        inputVat: vatReport.inputVat,
        netVat: vatReport.netVat,
        deadline: vatReport.deadline,
        payment: vatReport.payment,
      });

      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const filename = `Momsrapport_${vatReport.period.label.replace(/\s/g, "_")}.csv`;
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

  const isLoading = periodsLoading || reportLoading;
  const isError = periodsError || reportError;
  const error = periodsErrorData || reportErrorData;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (isError) {
    const handleRetry = () => {
      if (periodsError) refetchPeriods();
      if (reportError) refetchReport();
    };

    return (
      <Alert variant="destructive">
        <Warning className="size-4" />
        <AlertTitle>Kunde inte ladda momsrapport</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>{error?.message || "Ett oväntat fel uppstod."}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            className="ml-4"
          >
            <ArrowClockwise className="mr-2 size-4" />
            Försök igen
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const frequencyLabel =
    vatReportingFrequency === "monthly"
      ? "Månadsvis"
      : vatReportingFrequency === "quarterly"
        ? "Kvartalsvis"
        : "Årsvis";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <PeriodSelector
          periods={periods}
          selectedPeriodId={selectedPeriodId}
          onPeriodChange={handlePeriodChange}
        />

        {vatPeriods && vatPeriods.length > 1 && (
          <Select
            value={selectedVatPeriodIndex.toString()}
            onValueChange={handleVatPeriodChange}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Välj momsperiod" />
            </SelectTrigger>
            <SelectContent>
              {vatPeriods.map((vp) => (
                <SelectItem key={vp.index} value={vp.index.toString()}>
                  <div className="flex items-center gap-2">
                    <span>{vp.label}</span>
                    {vp.isPast && (
                      <Badge variant="outline" className="text-xs">
                        Passerad
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Badge variant="secondary">{frequencyLabel} momsrapportering</Badge>

        <ReportExportMenu
          onExportPDF={handleExportPDF}
          onExportCSV={handleExportCSV}
          isLoading={isExporting}
          disabled={!vatReport}
        />
      </div>

      {vatReport && (
        <>
          {/* Payment info card */}
          <VatPaymentInfo
            netVat={vatReport.netVat}
            deadline={vatReport.deadline}
            bankgiro={vatReport.payment.bankgiro}
            recipient={vatReport.payment.recipient}
            isPeriodLocked={vatReport.fiscalPeriod.isLocked}
          />

          {/* VAT breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Utgående moms</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-4">Momssats</TableHead>
                      <TableHead className="px-4 text-right">Belopp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="px-4">Moms 25%</TableCell>
                      <TableCell className="px-4 text-right font-mono">
                        {formatCurrency(vatReport.outputVat.vat25)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="px-4">Moms 12%</TableCell>
                      <TableCell className="px-4 text-right font-mono">
                        {formatCurrency(vatReport.outputVat.vat12)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="px-4">Moms 6%</TableCell>
                      <TableCell className="px-4 text-right font-mono">
                        {formatCurrency(vatReport.outputVat.vat6)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="font-medium border-t-2">
                      <TableCell className="px-4">Summa utgående moms</TableCell>
                      <TableCell className="px-4 text-right font-mono">
                        {formatCurrency(vatReport.outputVat.total)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ingående moms</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-4">Beskrivning</TableHead>
                      <TableHead className="px-4 text-right">Belopp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="px-4">Ingående moms inköp</TableCell>
                      <TableCell className="px-4 text-right font-mono">
                        {formatCurrency(vatReport.inputVat)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="font-medium border-t-2">
                      <TableCell className="px-4">Summa ingående moms</TableCell>
                      <TableCell className="px-4 text-right font-mono">
                        {formatCurrency(vatReport.inputVat)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Sammanställning</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="px-4 font-medium">
                      Utgående moms
                    </TableCell>
                    <TableCell className="px-4 text-right font-mono">
                      {formatCurrency(vatReport.outputVat.total)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="px-4 font-medium">
                      Ingående moms (avdrag)
                    </TableCell>
                    <TableCell className="px-4 text-right font-mono text-green-600">
                      - {formatCurrency(vatReport.inputVat)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="text-lg font-bold border-t-2">
                    <TableCell className="px-4">
                      {vatReport.netVat >= 0
                        ? "Moms att betala"
                        : "Moms att få tillbaka"}
                    </TableCell>
                    <TableCell
                      className={`px-4 text-right font-mono ${
                        vatReport.netVat >= 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {formatCurrency(Math.abs(vatReport.netVat))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {!vatReport && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Ingen momsdata för denna period.</p>
        </div>
      )}
    </div>
  );
}
