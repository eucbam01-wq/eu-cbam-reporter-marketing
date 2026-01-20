// File: src/entitlements.ts (C:\Users\redfi\eu-cbam-reporter\marketing\src\entitlements.ts)

export type PlanTier = 'free' | 'starter' | 'pro' | 'enterprise' | 'unknown';

const LS_KEY = 'gs_plan_tier';

export const ENV_PLAN_TIER: PlanTier = ((process.env.NEXT_PUBLIC_PLAN_TIER || 'free') + '')
  .toLowerCase()
  .trim() as PlanTier;

const ENTITLEMENTS: Record<PlanTier, Record<string, boolean>> = {
  free: {
    'nav.exposure': false,
    'nav.scenarios': false,
    'nav.certificates': true,
    'nav.forecast': false,
    'action.create_report': true,
    'action.export': false,
    'action.upload_certificate': false,
    'action.manage_suppliers': false,
  },
  starter: {
    'nav.exposure': false,
    'nav.scenarios': false,
    'nav.certificates': true,
    'nav.forecast': false,
    'action.create_report': true,
    'action.export': false,
    'action.upload_certificate': false,
    'action.manage_suppliers': false,
  },
  pro: {
    'nav.exposure': true,
    'nav.scenarios': true,
    'nav.certificates': true,
    'nav.forecast': true,
    'action.create_report': true,
    'action.export': true,
    'action.upload_certificate': true,
    'action.manage_suppliers': true,
  },
  enterprise: {
    'nav.exposure': true,
    'nav.scenarios': true,
    'nav.certificates': true,
    'nav.forecast': true,
    'action.create_report': true,
    'action.export': true,
    'action.upload_certificate': true,
    'action.manage_suppliers': true,
  },
  unknown: {
    'nav.exposure': false,
    'nav.scenarios': false,
    'nav.certificates': true,
    'nav.forecast': false,
    'action.create_report': true,
    'action.export': false,
    'action.upload_certificate': false,
    'action.manage_suppliers': false,
  },
};

export function getPlanTier(): PlanTier {
  try {
    if (typeof window !== 'undefined') {
      const v = (window.localStorage.getItem(LS_KEY) || '').toLowerCase().trim() as PlanTier;
      if (v && v in ENTITLEMENTS) return v;
    }
  } catch {
    // ignore
  }
  const tier = ENV_PLAN_TIER in ENTITLEMENTS ? ENV_PLAN_TIER : 'unknown';
  return tier;
}

export function setPlanTier(tier: PlanTier): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LS_KEY, (tier || 'free') as string);
    }
  } catch {
    // ignore
  }
}

export function clearPlanTierOverride(): void {
  try {
    if (typeof window !== 'undefined') window.localStorage.removeItem(LS_KEY);
  } catch {
    // ignore
  }
}

export function getEntitlementsForPlan(planTier: string): Record<string, boolean> {
  const tier = (planTier || '').toLowerCase().trim() as PlanTier;
  const t = tier in ENTITLEMENTS ? tier : 'unknown';
  return ENTITLEMENTS[t];
}

// Supports both signatures:
// 1) hasEntitlement("nav.exposure")
// 2) hasEntitlement("pro", "nav.exposure")
export function hasEntitlement(a: string, b?: string): boolean {
  if (typeof b === 'string') {
    const ent = getEntitlementsForPlan(a);
    if (b in ent) return Boolean(ent[b]);
    return false;
  }

  const key = a;
  const ent = getEntitlementsForPlan(getPlanTier());
  if (key in ent) return Boolean(ent[key]);
  return false;
}

export function lockedText(a: string, b?: string): string {
  const ok = typeof b === 'string' ? hasEntitlement(a, b) : hasEntitlement(a);
  if (ok) return '';
  return 'Locked: upgrade required';
}

// File: src/entitlements.ts (C:\Users\redfi\eu-cbam-reporter\marketing\src\entitlements.ts)
