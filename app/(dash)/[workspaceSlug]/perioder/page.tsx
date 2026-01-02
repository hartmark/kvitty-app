import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers, fiscalPeriods, lockedPeriods } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/session";
import Link from "next/link";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Lock, Calendar } from "@phosphor-icons/react";
import { format } from "date-fns";
import { sv } from "date-fns/locale/sv";

export default async function PeriodsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { workspaceSlug } = await params;

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.slug, workspaceSlug),
  });

  if (!workspace) {
    notFound();
  }

  const membership = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspace.id),
      eq(workspaceMembers.userId, session.user.id)
    ),
  });

  if (!membership) {
    redirect("/app");
  }

  const allPeriods = await db.query.fiscalPeriods.findMany({
    where: eq(fiscalPeriods.workspaceId, workspace.id),
    orderBy: (periods, { desc }) => [desc(periods.startDate)],
  });

  const allLockedPeriods = await db.query.lockedPeriods.findMany({
    where: eq(lockedPeriods.workspaceId, workspace.id),
    with: {
      lockedByUser: {
        columns: {
          name: true,
          email: true,
        },
      },
    },
  });

  const periodsWithLockedInfo = allPeriods.map((period) => {
    const periodLockedMonths = allLockedPeriods.filter(
      (lp) => lp.fiscalPeriodId === period.id
    );
    const lockedMonthsCount = periodLockedMonths.length;
    const isPartiallyLocked = lockedMonthsCount > 0;
    const periodStart = new Date(period.startDate);
    const periodEnd = new Date(period.endDate);
    const monthsInPeriod = getMonthsBetween(periodStart, periodEnd);
    const isFullyLocked = lockedMonthsCount === monthsInPeriod.length;

    return {
      ...period,
      lockedMonths: periodLockedMonths,
      lockedMonthsCount,
      isPartiallyLocked,
      isFullyLocked,
      totalMonths: monthsInPeriod.length,
    };
  });

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
                <BreadcrumbLink href={`/${workspaceSlug}`}>
                  {workspace.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Perioder</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <div>
          <h1 className="text-2xl font-bold">Perioder</h1>
          <p className="text-muted-foreground text-sm">
            Alla räkenskapsperioder för detta arbetsområde
          </p>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Startdatum</TableHead>
                <TableHead>Slutdatum</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Låsta månader</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periodsWithLockedInfo.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Inga perioder hittades
                  </TableCell>
                </TableRow>
              ) : (
                periodsWithLockedInfo.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell>
                      <Link
                        href={`/${workspaceSlug}/${period.urlSlug}`}
                        className="font-medium hover:underline"
                      >
                        {period.label}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {format(new Date(period.startDate), "d MMM yyyy", {
                        locale: sv,
                      })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(period.endDate), "d MMM yyyy", {
                        locale: sv,
                      })}
                    </TableCell>
                    <TableCell>
                      {period.isFullyLocked ? (
                        <Badge variant="destructive" className="gap-1">
                          <Lock className="size-3" />
                          Låst
                        </Badge>
                      ) : period.isPartiallyLocked ? (
                        <Badge variant="outline" className="gap-1">
                          <Lock className="size-3" />
                          Delvis låst
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <Calendar className="size-3" />
                          Öppen
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {period.lockedMonthsCount > 0 ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-sm">
                            {period.lockedMonthsCount} av {period.totalMonths} månader
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {period.lockedMonths.map((locked) => (
                              <Badge
                                key={locked.id}
                                variant="outline"
                                className="text-xs"
                              >
                                {format(new Date(`${locked.month}-01`), "MMM yyyy", {
                                  locale: sv,
                                })}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Inga låsta månader
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}

function getMonthsBetween(startDate: Date, endDate: Date): string[] {
  const months: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    months.push(`${year}-${month}`);
    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

