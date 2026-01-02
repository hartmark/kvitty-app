"use client";

import { useState } from "react";
import { Plus, Money } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
import { trpc } from "@/lib/trpc/client";
import { useWorkspace } from "@/components/workspace-provider";
import { CreatePayrollRunDialog } from "@/components/payroll/create-payroll-run-dialog";
import { PayrollRunsTable } from "@/components/payroll/payroll-runs-table";

interface PayrollPageClientProps {
  workspaceSlug: string;
}

export function PayrollPageClient({ workspaceSlug }: PayrollPageClientProps) {
  const { workspace, periods } = useWorkspace();
  const [createOpen, setCreateOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: runs, isLoading } = trpc.payroll.listRuns.useQuery({
    workspaceId: workspace.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="size-8" />
      </div>
    );
  }

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
                <BreadcrumbLink href={`/${workspaceSlug}/personal`}>
                  Personal
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Lönekörningar</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-6 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Lönekörningar</h1>
            <p className="text-muted-foreground text-sm">
              Hantera löner och generera AGI-deklarationer
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4 mr-2" />
            Ny lönekörning
          </Button>
        </div>

      {runs?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Money className="size-12 mx-auto mb-4 text-muted-foreground" weight="duotone" />
            <h3 className="font-medium mb-2">Inga lönekörningar</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Skapa en lönekörning för att börja betala ut löner.
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4 mr-2" />
              Ny lönekörning
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <PayrollRunsTable
            runs={runs || []}
            workspaceSlug={workspaceSlug}
          />
        </Card>
      )}

      <CreatePayrollRunDialog
        workspaceId={workspace.id}
        open={createOpen}
        onOpenChange={setCreateOpen}
        periods={periods}
      />
      </div>
    </>
  );
}

