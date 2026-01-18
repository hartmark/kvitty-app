"use client";

import type { ReactNode } from "react";
import { useFeatureFlag, useFeatureFlags } from "@/lib/feature-flags/hooks";
import type { FeatureFlag } from "@/lib/feature-flags/types";

interface FeatureGateProps {
  flag: FeatureFlag;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGate({
  flag,
  children,
  fallback = null,
}: FeatureGateProps): ReactNode {
  const isEnabled = useFeatureFlag(flag);
  return isEnabled ? children : fallback;
}

export function FeatureGateOff({
  flag,
  children,
  fallback = null,
}: FeatureGateProps): ReactNode {
  const isEnabled = useFeatureFlag(flag);
  return isEnabled ? fallback : children;
}

interface MultiFeatureGateProps {
  flags: FeatureFlag[];
  mode?: "all" | "any";
  children: ReactNode;
  fallback?: ReactNode;
}

export function MultiFeatureGate({
  flags,
  mode = "all",
  children,
  fallback = null,
}: MultiFeatureGateProps): ReactNode {
  const flagResults = useFeatureFlags(flags);

  const passes =
    mode === "all"
      ? flags.every((flag) => flagResults[flag])
      : flags.some((flag) => flagResults[flag]);

  return passes ? children : fallback;
}
