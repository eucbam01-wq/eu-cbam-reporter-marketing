// FILE: C:\Users\redfi\eu-cbam-reporter\marketing\src\entitlements.ts

export type PlanTier = "free" | "core" | "pro" | "enterprise";

export type FeatureKey =
  | "REPORTING"
  | "EXPOSURE"
  | "SUPPLIERS"
  | "IMPORT_UPLOADS"
  | "ENTITIES"
  | "AUDIT"
  | "CERTIFICATES"
  | "FORECAST"
  | "CAMPAIGNS"
  | "USERS";

export type EntitlementMatrix = Record<FeatureKey, PlanTier>;

export const PLAN_ORDER: PlanTier[] = ["free", "core", "pro", "enterprise"];

export const PLAN_LABEL: Record<PlanTier, string> = {
  free: "Free",
  core: "Core",
  pro: "Pro",
  enterprise: "Enterprise",
};

export const ENTITLEMENTS: EntitlementMatrix = {
  REPORTING: "free",
  EXPOSURE: "free",
  SUPPLIERS: "free",
  IMPORT_UPLOADS: "free",
  ENTITIES: "free",

  AUDIT: "core",
  CERTIFICATES: "core",
  FORECAST: "core",

  CAMPAIGNS: "pro",
  USERS: "enterprise",
};

export function parsePlanTier(raw: unknown): PlanTier {
  const v = String(raw || "").trim().toLowerCase();
  if (v === "free") return "free";
  if (v === "core") return "core";
  if (v === "pro") return "pro";
  if (v === "enterprise") return "enterprise";
  return "free";
}

export function getActivePlanTier(): PlanTier {
  return parsePlanTier(process.env.NEXT_PUBLIC_PLAN_TIER);
}

export function isEntitled(active: PlanTier, required: PlanTier): boolean {
  return PLAN_ORDER.indexOf(active) >= PLAN_ORDER.indexOf(required);
}

export function requiredTierForFeature(feature: FeatureKey): PlanTier {
  return ENTITLEMENTS[feature];
}

export function canAccess(feature: FeatureKey, activeTier?: PlanTier): boolean {
  const active = activeTier || getActivePlanTier();
  return isEntitled(active, requiredTierForFeature(feature));
}

export function upgradeCopy(required: PlanTier): string {
  if (required === "free") return "Available";
  return `Upgrade to ${PLAN_LABEL[required]}`;
}

// FILE: C:\Users\redfi\eu-cbam-reporter\marketing\src\entitlements.ts
