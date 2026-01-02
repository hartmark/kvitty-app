"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, UserCircle, ArrowRight } from "@phosphor-icons/react";
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
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";
import { useWorkspace } from "@/components/workspace-provider";
import { calculateAgeFromPersonnummer } from "@/lib/utils";
import { AddEmployeeDialog } from "@/components/employees/add-employee-dialog";

export default function PersonalPage() {
  const { workspace } = useWorkspace();
  const [addOpen, setAddOpen] = useState(false);

  const utils = trpc.useUtils();

  const { data: employees, isLoading } = trpc.employees.list.useQuery({
    workspaceId: workspace.id,
  });

  const activeEmployeeCount = employees?.filter((e) => e.isActive).length ?? 0;
  const isAtLimit = activeEmployeeCount >= 25;

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
                <BreadcrumbPage>Anställda</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-6 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Anställda</h1>
            <p className="text-muted-foreground text-sm">
              Hantera anställda för lönekörningar
            </p>
          </div>
          <Button onClick={() => !isAtLimit && setAddOpen(true)} disabled={isAtLimit}>
            <Plus className="size-4 mr-2" />
            Lägg till anställd
          </Button>
        </div>

        {employees?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <UserCircle className="size-12 mx-auto mb-4 text-muted-foreground" weight="duotone" />
              <h3 className="font-medium mb-2">Inga anställda</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Lägg till anställda för att kunna köra löner.
              </p>
              <Button onClick={() => !isAtLimit && setAddOpen(true)} disabled={isAtLimit}>
                <Plus className="size-4 mr-2" />
                Lägg till anställd
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4">Namn</TableHead>
                  <TableHead className="px-4">Personnummer</TableHead>
                  <TableHead className="px-4">E-post</TableHead>
                  <TableHead className="px-4">Telefon</TableHead>
                  <TableHead className="px-4">Status</TableHead>
                  <TableHead className="w-[100px] px-4"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees?.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="px-4 font-medium">
                      <Link
                        href={`/${workspace.slug}/personal/${employee.id}`}
                        className="hover:underline"
                      >
                        {employee.firstName} {employee.lastName}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 font-mono text-sm">
                      {employee.personalNumber}
                      {(() => {
                        const age = calculateAgeFromPersonnummer(employee.personalNumber);
                        return age !== null ? ` (${age} år)` : null;
                      })()}
                    </TableCell>
                    <TableCell className="px-4">{employee.email || "-"}</TableCell>
                    <TableCell className="px-4">{employee.phone || "-"}</TableCell>
                    <TableCell className="px-4">
                      {employee.isActive ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Aktiv
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700">
                          Arkiverad
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-4">
                      <Link href={`/${workspace.slug}/personal/${employee.id}`}>
                        <Button variant="ghost" size="icon">
                          <ArrowRight className="size-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        <AddEmployeeDialog
          workspaceId={workspace.id}
          open={addOpen}
          onOpenChange={setAddOpen}
          isAtLimit={isAtLimit}
        />
      </div>
    </>
  );
}
