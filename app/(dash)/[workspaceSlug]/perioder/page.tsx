import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers, fiscalPeriods, lockedPeriods } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/session";
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
import { PeriodsTable } from "@/components/periods/periods-table";

export const metadata: Metadata = {
  title: "Perioder — Kvitty",
};

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
          <PeriodsTable
            periods={periodsWithLockedInfo.map((period) => ({
              id: period.id,
              label: period.label,
              urlSlug: period.urlSlug,
              startDate: period.startDate,
              endDate: period.endDate,
              lockedMonths: period.lockedMonths.map((locked) => ({
                id: locked.id,
                month: locked.month,
                lockedByUser: {
                  name: locked.lockedByUser.name,
                  email: locked.lockedByUser.email,
                },
              })),
              lockedMonthsCount: period.lockedMonthsCount,
              isPartiallyLocked: period.isPartiallyLocked,
              isFullyLocked: period.isFullyLocked,
              totalMonths: period.totalMonths,
            }))}
            workspaceSlug={workspaceSlug}
          />
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

