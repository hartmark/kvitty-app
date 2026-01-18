"use client";

import { useMemo } from "react";
import { useWorkspace } from "@/components/workspace-provider";
import { hasFeature, hasFeatures, getEnabledFeatures } from "./utils";
import type { FeatureFlag } from "./types";

export function useFeatureFlag(flag: FeatureFlag): boolean {
  const { workspace } = useWorkspace();
  return hasFeature(workspace, flag);
}

export function useFeatureFlags<T extends FeatureFlag>(
  flags: T[]
): Record<T, boolean> {
  const { workspace } = useWorkspace();
  return useMemo(
    () => hasFeatures(workspace, flags),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspace, ...flags]
  );
}

export function useEnabledFeatures(): FeatureFlag[] {
  const { workspace } = useWorkspace();
  return useMemo(() => getEnabledFeatures(workspace), [workspace]);
}
