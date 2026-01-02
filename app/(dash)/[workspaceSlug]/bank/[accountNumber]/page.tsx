"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc/client";
import { useWorkspace } from "@/components/workspace-provider";
import Link from "next/link";

const PAGE_SIZE = 50;

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { workspace } = useWorkspace();
  const accountNumber = parseInt(params.accountNumber as string, 10);

  const [page, setPage] = useState(0);
  const offset = page * PAGE_SIZE;

  if (isNaN(accountNumber)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Ogiltigt kontonummer</p>
        <Button variant="outline" onClick={() => router.push(`/${workspace.slug}/bank`)}>
          Tillbaka till bankkonton
        </Button>
      </div>
    );
  }

  const { data: account, isLoading: accountLoading } =
    trpc.bankAccounts.getByAccountNumber.useQuery({
      accountNumber,
      workspaceId: workspace.id,
    });

  const { data, isLoading: entriesLoading } =
    trpc.journalEntries.listByAccount.useQuery({
      accountNumber,
      workspaceId: workspace.id,
      limit: PAGE_SIZE,
      offset,
    });

  const formatCurrency = (value: string | null) => {
    if (!value) return "0 kr";
    const num = parseFloat(value);
    return `${num.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("sv-SE");
  };

  if (accountLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Konto hittades inte</p>
        <Button variant="outline" onClick={() => router.push(`/${workspace.slug}/bank`)}>
          Tillbaka till bankkonton
        </Button>
      </div>
    );
  }

  const entries = data?.entries || [];
  const total = data?.total || 0;
  const hasMore = data?.hasMore || false;
  const totalPages = Math.ceil(total / PAGE_SIZE);

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
                <BreadcrumbLink asChild>
                  <Link href={`/${workspace.slug}/bank`}>Bankkonton</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {account.accountNumber} - {account.name}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-6 pt-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {account.accountNumber} - {account.name}
          </h1>
          {account.description && (
            <p className="text-muted-foreground text-sm mt-1">{account.description}</p>
          )}
        </div>

        <div className="bg-background rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Verifikation</TableHead>
                <TableHead>Beskrivning</TableHead>
                <TableHead className="text-right">Debet</TableHead>
                <TableHead className="text-right">Kredit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entriesLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Spinner className="size-6 mx-auto" />
                  </TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Inga transaktioner hittades för detta konto
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((item) => {
                  const debit = item.line.debit ? parseFloat(item.line.debit) : 0;
                  const credit = item.line.credit ? parseFloat(item.line.credit) : 0;

                  return (
                    <TableRow key={`${item.entry.id}-${item.line.id}`}>
                      <TableCell>{formatDate(item.entry.entryDate)}</TableCell>
                      <TableCell>
                        V{item.entry.verificationNumber}
                      </TableCell>
                      <TableCell>
                        {item.line.description || item.entry.description}
                      </TableCell>
                      <TableCell className="text-right">
                        {debit > 0 ? formatCurrency(item.line.debit) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {credit > 0 ? formatCurrency(item.line.credit) : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Visar {offset + 1}-{Math.min(offset + PAGE_SIZE, total)} av {total} transaktioner
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || entriesLoading}
              >
                <CaretLeftIcon className="size-4" />
                Föregående
              </Button>
              <div className="text-sm text-muted-foreground">
                Sida {page + 1} av {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore || entriesLoading}
              >
                Nästa
                <CaretRightIcon className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

