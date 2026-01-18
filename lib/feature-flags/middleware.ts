import { TRPCError } from "@trpc/server";
import { workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hasFeature } from "./utils";
import type { FeatureFlag } from "./types";

type MiddlewareContext = {
  db: {
    query: {
      workspaces: {
        findFirst: (opts: {
          where: ReturnType<typeof eq>;
          columns: { id: true; featureFlags: true };
        }) => Promise<{ id: string; featureFlags: Record<string, boolean> } | undefined>;
      };
    };
  };
  workspaceId: string;
};

type MiddlewareParams = {
  ctx: MiddlewareContext;
  next: (opts?: { ctx: unknown }) => Promise<unknown>;
};

async function getWorkspaceFlags(ctx: MiddlewareContext) {
  const workspace = await ctx.db.query.workspaces.findFirst({
    where: eq(workspaces.id, ctx.workspaceId),
    columns: { id: true, featureFlags: true },
  });

  if (!workspace) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
  }

  return workspace.featureFlags ?? {};
}

export function requireFeature(flag: FeatureFlag) {
  return async ({ ctx, next }: MiddlewareParams) => {
    const featureFlags = await getWorkspaceFlags(ctx);

    if (!hasFeature({ featureFlags }, flag)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Feature '${flag}' is not enabled for this workspace`,
      });
    }

    return next({ ctx: { ...ctx, featureFlags } });
  };
}

export function requireAnyFeature(flags: FeatureFlag[]) {
  return async ({ ctx, next }: MiddlewareParams) => {
    const featureFlags = await getWorkspaceFlags(ctx);
    const hasAny = flags.some((flag) => hasFeature({ featureFlags }, flag));

    if (!hasAny) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `At least one of these features must be enabled: ${flags.join(", ")}`,
      });
    }

    return next({ ctx: { ...ctx, featureFlags } });
  };
}

export function requireAllFeatures(flags: FeatureFlag[]) {
  return async ({ ctx, next }: MiddlewareParams) => {
    const featureFlags = await getWorkspaceFlags(ctx);
    const missing = flags.filter((flag) => !hasFeature({ featureFlags }, flag));

    if (missing.length > 0) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Missing required features: ${missing.join(", ")}`,
      });
    }

    return next({ ctx: { ...ctx, featureFlags } });
  };
}
