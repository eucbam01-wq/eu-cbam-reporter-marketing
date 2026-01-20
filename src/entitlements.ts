// File: src/entitlements.ts

export type PlanTier = 'free' | 'starter' | 'pro' | 'enterprise' | 'unknown';

function normalizePlanTier(input: any): PlanTier {
  const raw = (input || '').toString().trim().toLowerCase();
  if (raw === 'free' || raw === 'starter' || raw === 'pro' || raw === 'enterprise' || raw === 'unknown') return raw;
  return 'unknown';
}

export function getPlanTier(): PlanTier {
  try {
    if (typeof window !== 'undefined') {
      const ls = (window.localStorage?.getItem('gsx-plan-tier') || '').toString().trim().toLowerCase();
      const norm = normalizePlanTier(ls);
      if (norm !== 'unknown') return norm;
    }
  } catch {
    // ignore
  }

  const env = normalizePlanTier(process.env.NEXT_PUBLIC_PLAN_TIER || 'free');
  if (env !== 'unknown') return env;
  return 'free';
}

const ENTITLEMENTS: Record<PlanTier, Record<string, boolean>> = {
  free: {
    // Dashboard
    command_center: true,
    settings: true,

    // Navigation
    reporting: false,
    exposure_dashboard: false,
    suppliers: false,
    import_uploads: false,
    entities: false,
    users: false,
    audit: false,

    // Legacy entitlement keys
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
    // Dashboard
    command_center: true,
    settings: true,

    // Navigation
    reporting: true,
    exposure_dashboard: false,
    suppliers: true,
    import_uploads: true,
    entities: true,
    users: true,
    audit: false,

    // Legacy entitlement keys
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
    // Dashboard
    command_center: true,
    settings: true,

    // Navigation
    reporting: true,
    exposure_dashboard: true,
    suppliers: true,
    import_uploads: true,
    entities: true,
    users: true,
    audit: true,

    // Legacy entitlement keys
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
    // Dashboard
    command_center: true,
    settings: true,

    // Navigation
    reporting: true,
    exposure_dashboard: true,
    suppliers: true,
    import_uploads: true,
    entities: true,
    users: true,
    audit: true,

    // Legacy entitlement keys
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
    command_center: false,
    settings: false,
    reporting: false,
    exposure_dashboard: false,
    suppliers: false,
    import_uploads: false,
    entities: false,
    users: false,
    audit: false,

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

export function canAccess(planTier: PlanTier | string, featureKey: string): boolean {
  const tier = normalizePlanTier(planTier);
  const map = ENTITLEMENTS[tier] || ENTITLEMENTS.unknown;

  if (featureKey in map) return Boolean(map[featureKey]);

  // Paying tiers default to allow for unknown keys
  if (tier === 'pro' || tier === 'starter' || tier === 'enterprise') return true;

  return false;
}

export function hasEntitlement(key: string): boolean {
  const tier = getPlanTier();
  return canAccess(tier, key);
}

export function lockedText(key: string): string {
  if (hasEntitlement(key)) return '';
  return 'Locked: upgrade required';
}
