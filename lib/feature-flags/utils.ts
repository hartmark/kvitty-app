import type { FeatureFlag } from "./types";

type WorkspaceWithFlags = {
  featureFlags: Record<string, boolean> | null;
};

export function hasFeature(
  workspace: WorkspaceWithFlags,
  flag: FeatureFlag
): boolean {
  return workspace.featureFlags?.[flag] === true;
}

export function hasFeatures<T extends FeatureFlag>(
  workspace: WorkspaceWithFlags,
  flags: T[]
): Record<T, boolean> {
  const result = {} as Record<T, boolean>;
  for (const flag of flags) {
    result[flag] = hasFeature(workspace, flag);
  }
  return result;
}

export function getEnabledFeatures(
  workspace: WorkspaceWithFlags
): FeatureFlag[] {
  if (!workspace.featureFlags) return [];

  return Object.entries(workspace.featureFlags)
    .filter(([, enabled]) => enabled === true)
    .map(([flag]) => flag as FeatureFlag);
}

export function getDisabledFeatures(
  workspace: WorkspaceWithFlags,
  knownFlags: FeatureFlag[]
): FeatureFlag[] {
  return knownFlags.filter((flag) => !hasFeature(workspace, flag));
}
