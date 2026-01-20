// File: src/entitlements.ts (C:\Users\redfi\eu-cbam-reporter\marketing\src\entitlements.ts)

export type PlanTier = 'free' | 'starter' | 'pro' | 'enterprise' | 'unknown';

export const PLAN_TIER: PlanTier = ((process.env.NEXT_PUBLIC_PLAN_TIER || 'free') + '')
  .toLowerCase()
  .trim() as PlanTier;

const PLAN_OVERRIDE_KEY = 'gsx-plan-tier';

function normalizeTier(input: any): PlanTier {
  const raw = (input ?? '').toString().trim().toLowerCase();
  if (raw === 'free' || raw === 'starter' || raw === 'pro' || raw === 'enterprise' || raw === 'unknown') return raw as PlanTier;
  return 'unknown';
}

export function getEffectivePlanTier(): PlanTier {
  try {
    if (typeof window !== 'undefined' && window?.localStorage) {
      const v = window.localStorage.getItem(PLAN_OVERRIDE_KEY);
      if (v) {
        const t = normalizeTier(v);
        if (t !== 'unknown') return t;
      }
    }
  } catch {
    // ignore
  }
  return normalizeTier(PLAN_TIER) || 'free';
}

export function setPlanTierOverride(tier: PlanTier) {
  try {
    if (typeof window !== 'undefined' && window?.localStorage) {
      window.localStorage.setItem(PLAN_OVERRIDE_KEY, normalizeTier(tier));
    }
  } catch {
    // ignore
  }
}

export function clearPlanTierOverride() {
  try {
    if (typeof window !== 'undefined' && window?.localStorage) {
      window.localStorage.removeItem(PLAN_OVERRIDE_KEY);
    }
  } catch {
    // ignore
  }
}

const ENTITLEMENTS: Record<PlanTier, Record<string, boolean>> = {
  free: {
    'nav.exposure': false,
    'nav.scenarios': false,
    'nav.certificates': true,
    'nav.forecast': false,
    'action.create_report': true,
    'action.export': false,
    'action.upload_certificate': false,
    'action.manage_suppliers': true,
  },
  starter: {
    'nav.exposure': true,
    'nav.scenarios': false,
    'nav.certificates': true,
    'nav.forecast': true,
    'action.create_report': true,
    'action.export': true,
    'action.upload_certificate': true,
    'action.manage_suppliers': true,
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
    'nav.certificates': false,
    'nav.forecast': false,
    'action.create_report': false,
    'action.export': false,
    'action.upload_certificate': false,
    'action.manage_suppliers': false,
  },
};

export function hasEntitlement(key: string): boolean {
  const t = getEffectivePlanTier();
  const tier = t in ENTITLEMENTS ? t : 'unknown';
  const map = ENTITLEMENTS[tier];
  if (key in map) return Boolean(map[key]);
  return false;
}

export function lockedText(key: string): string {
  if (hasEntitlement(key)) return '';
  return 'Locked: upgrade required';
}

// File: src/entitlements.ts (C:\Users\redfi\eu-cbam-reporter\marketing\src\entitlements.ts)
