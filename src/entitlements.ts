// File: src/entitlements.ts (C:\Users\redfi\eu-cbam-reporter\marketing\src\entitlements.ts)

export type PlanTier = 'free' | 'starter' | 'pro' | 'enterprise' | 'unknown';

export function getPlanTier(): PlanTier {
  try {
    if (typeof window !== 'undefined') {
      const ls = (window.localStorage?.getItem('gsx-plan-tier') || '').toString().trim().toLowerCase();
      if (ls === 'free' || ls === 'starter' || ls === 'pro' || ls === 'enterprise' || ls === 'unknown') return ls;
    }
  } catch {
    // ignore
  }

  const env = ((process.env.NEXT_PUBLIC_PLAN_TIER || 'free') + '').toLowerCase().trim();
  if (env === 'free' || env === 'starter' || env === 'pro' || env === 'enterprise' || env === 'unknown') return env;
  return 'free';
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
  const planTier = getPlanTier();
  const tier = planTier in ENTITLEMENTS ? planTier : 'unknown';
  const map = ENTITLEMENTS[tier];
  if (key in map) return Boolean(map[key]);
  return false;
}

export function lockedText(key: string): string {
  if (hasEntitlement(key)) return '';
  return 'Locked: upgrade required';
}

// File: src/entitlements.ts (C:\Users\redfi\eu-cbam-reporter\marketing\src\entitlements.ts)
