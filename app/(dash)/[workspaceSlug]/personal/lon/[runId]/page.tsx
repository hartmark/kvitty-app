"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Plus,
  Calculator,
  Check,
  Download,
  FileCode,
  Trash,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";
import { useWorkspace } from "@/components/workspace-provider";
import { AddPayrollEntryDialog } from "@/components/payroll/add-payroll-entry-dialog";
import { AgiPreviewDialog } from "@/components/payroll/agi-preview-dialog";

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "Utkast", color: "bg-gray-100 text-gray-700" },
  calculated: { label: "Beräknad", color: "bg-blue-100 text-blue-700" },
  approved: { label: "Godkänd", color: "bg-green-100 text-green-700" },
  paid: { label: "Utbetald", color: "bg-purple-100 text-purple-700" },
  reported: { label: "Rapporterad", color: "bg-teal-100 text-teal-700" },
};

export default function PayrollRunPage() {
  const params = useParams();
  const router = useRouter();
  const { workspace } = useWorkspace();
  const runId = params.runId as string;

  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [agiPreviewOpen, setAgiPreviewOpen] = useState(false);

  const utils = trpc.useUtils();

  const { data: run, isLoading } = trpc.payroll.getRun.useQuery({
    id: runId,
    workspaceId: workspace.id,
  });

  const { data: employees } = trpc.employees.list.useQuery({
    workspaceId: workspace.id,
  });

  const removeEntry = trpc.payroll.removeEntry.useMutation({
    onSuccess: () => {
      utils.payroll.getRun.invalidate();
    },
  });

  const calculateRun = trpc.payroll.calculateRun.useMutation({
    onSuccess: () => {
      utils.payroll.getRun.invalidate();
    },
  });

  const approveRun = trpc.payroll.approveRun.useMutation({
    onSuccess: () => {
      utils.payroll.getRun.invalidate();
    },
  });

  const generateAGI = trpc.payroll.generateAGI.useMutation({
    onSuccess: () => {
      utils.payroll.getRun.invalidate();
      setAgiPreviewOpen(true);
    },
  });

  const formatCurrency = (value: string | number | null) => {
    if (!value) return "0 kr";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return `${num.toLocaleString("sv-SE")} kr`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="container py-6">
        <p>Lönekörning hittades inte.</p>
      </div>
    );
  }

  const status = statusLabels[run.status] || statusLabels.draft;
  const isDraft = run.status === "draft";
  const canApprove = run.status === "calculated" && run.entries.length > 0;
  const canGenerateAGI = run.status === "approved";

  // Filter out employees already in this run
  const availableEmployees = employees?.filter(
    (emp) => !run.entries.some((entry) => entry.employeeId === emp.id)
  );

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4 mt-1.5"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href={`/${workspace.slug}/personal`}>
                  Personal
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/${workspace.slug}/personal/lon`}>
                  Lönekörningar
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {run.period.substring(0, 4)}-{run.period.substring(4)} • Körning {run.runNumber}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-6 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                Lönekörning {run.period.substring(0, 4)}-{run.period.substring(4)}
              </h1>
              <Badge variant="outline" className={status.color}>
                {status.label}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              Körning {run.runNumber} • Utbetalning {run.paymentDate}
            </p>
          </div>

          <div className="flex gap-2">
            {isDraft && (
              <>
                <Button
                  variant="outline"
                  onClick={() => calculateRun.mutate({ payrollRunId: run.id, workspaceId: workspace.id })}
                  disabled={calculateRun.isPending || run.entries.length === 0}
                >
                  {calculateRun.isPending ? <Spinner /> : <Calculator className="size-4 mr-2" />}
                  Beräkna
                </Button>
                <Button onClick={() => setAddEmployeeOpen(true)}>
                  <Plus className="size-4 mr-2" />
                  Lägg till anställd
                </Button>
              </>
            )}
            {canApprove && (
              <Button
                onClick={() => approveRun.mutate({ payrollRunId: run.id, workspaceId: workspace.id })}
                disabled={approveRun.isPending}
              >
                {approveRun.isPending ? <Spinner /> : <Check className="size-4 mr-2" />}
                Godkänn
              </Button>
            )}
            {canGenerateAGI && (
              <Button
                onClick={() => generateAGI.mutate({ payrollRunId: run.id, workspaceId: workspace.id })}
                disabled={generateAGI.isPending}
              >
                {generateAGI.isPending ? <Spinner /> : <FileCode className="size-4 mr-2" />}
                Generera AGI
              </Button>
            )}
            {run.agiXml && (
              <Button
                variant="outline"
                onClick={() => {
                  const blob = new Blob([run.agiXml!], { type: "application/xml" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `AGI_${run.period}_${run.runNumber}.xml`;
                  a.click();
                }}
              >
                <Download className="size-4 mr-2" />
                Ladda ner AGI
              </Button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Bruttolön</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(run.totalGrossSalary)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Skatteavdrag</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(run.totalTaxDeduction)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Arbetsgivaravgift</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(run.totalEmployerContributions)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Nettolön</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(run.totalNetSalary)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Anställda</CardTitle>
        </CardHeader>
        <CardContent>
          {run.entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Inga anställda tillagda.</p>
              {isDraft && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setAddEmployeeOpen(true)}
                >
                  <Plus className="size-4 mr-2" />
                  Lägg till anställd
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Anställd</TableHead>
                  <TableHead className="text-right">Bruttolön</TableHead>
                  <TableHead className="text-right">Skatteavdrag</TableHead>
                  <TableHead className="text-right">Arb.avg</TableHead>
                  <TableHead className="text-right">Nettolön</TableHead>
                  {isDraft && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {run.entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {entry.employee.firstName} {entry.employee.lastName}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(entry.grossSalary)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(entry.taxDeduction)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(entry.employerContributions)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(entry.netSalary)}
                    </TableCell>
                    {isDraft && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeEntry.mutate({ id: entry.id, workspaceId: workspace.id })}
                          disabled={removeEntry.isPending}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash className="size-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddPayrollEntryDialog
        payrollRunId={run.id}
        workspaceId={workspace.id}
        open={addEmployeeOpen}
        onOpenChange={setAddEmployeeOpen}
        availableEmployees={availableEmployees || []}
        onSuccess={() => utils.payroll.getRun.invalidate()}
      />

      <AgiPreviewDialog
        open={agiPreviewOpen}
        onOpenChange={setAgiPreviewOpen}
        agiXml={run.agiXml}
        period={run.period}
        runNumber={run.runNumber}
      />
      </div>
    </>
  );
}
