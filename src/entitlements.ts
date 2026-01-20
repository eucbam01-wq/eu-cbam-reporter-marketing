// File: src/entitlements.ts (C:\Users\redfi\eu-cbam-reporter\marketing\src\entitlements.ts)

export type PlanTier = 'free' | 'starter' | 'pro' | 'enterprise' | 'unknown';

const STORAGE_KEY = 'gsx_plan_tier';

function normalizeTier(input: any): PlanTier {
  const raw = (input ?? '').toString().trim().toLowerCase();
  if (raw === 'free') return 'free';
  if (raw === 'starter') return 'starter';
  if (raw === 'pro') return 'pro';
  if (raw === 'enterprise') return 'enterprise';
  return 'unknown';
}

function envTier(): PlanTier {
  return normalizeTier(process.env.NEXT_PUBLIC_PLAN_TIER || 'free');
}

function readStoredTier(): PlanTier | null {
  try {
    if (typeof window === 'undefined') return null;
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (!v) return null;
    const t = normalizeTier(v);
    return t === 'unknown' ? null : t;
  } catch {
    return null;
  }
}

export function getPlanTier(): PlanTier {
  return readStoredTier() || envTier() || 'free';
}

export function setPlanTier(tier: PlanTier) {
  try {
    if (typeof window === 'undefined') return;
    const t = normalizeTier(tier);
    window.localStorage.setItem(STORAGE_KEY, t);
  } catch {
    // ignore
  }
}

const ENTITLEMENTS: Record<PlanTier, Record<string, boolean>> = {
  free: {
    exposure_dashboard: false,
    scenarios: false,
    forecast: false,
    audit: false,
    import_uploads: false,
    reporting: true,
    suppliers: true,
    entities: true,
    users: true,
    settings: true,
    command_center: true,
  },
  starter: {
    exposure_dashboard: true,
    scenarios: false,
    forecast: true,
    audit: true,
    import_uploads: true,
    reporting: true,
    suppliers: true,
    entities: true,
    users: true,
    settings: true,
    command_center: true,
  },
  pro: {
    exposure_dashboard: true,
    scenarios: true,
    forecast: true,
    audit: true,
    import_uploads: true,
    reporting: true,
    suppliers: true,
    entities: true,
    users: true,
    settings: true,
    command_center: true,
  },
  enterprise: {
    exposure_dashboard: true,
    scenarios: true,
    forecast: true,
    audit: true,
    import_uploads: true,
    reporting: true,
    suppliers: true,
    entities: true,
    users: true,
    settings: true,
    command_center: true,
  },
  unknown: {
    exposure_dashboard: false,
    scenarios: false,
    forecast: false,
    audit: false,
    import_uploads: false,
    reporting: false,
    suppliers: false,
    entities: false,
    users: false,
    settings: false,
    command_center: false,
  },
};

export function hasEntitlement(planTierOrKey: any, maybeKey?: string): boolean {
  // Supports BOTH signatures:
  // 1) hasEntitlement('pro', 'exposure_dashboard')
  // 2) hasEntitlement('exposure_dashboard') -> uses current plan tier
  const planTier = maybeKey ? normalizeTier(planTierOrKey) : getPlanTier();
  const key = maybeKey ? (maybeKey || '') : (planTierOrKey || '');
  const t = planTier in ENTITLEMENTS ? planTier : 'unknown';
  const map = ENTITLEMENTS[t];
  return Boolean(map[key]);
}

export function lockedText(key: string): string {
  if (hasEntitlement(key)) return '';
  return 'Locked: upgrade required';
}

export async function refreshPlanTierFromCheckout(sessionId: string): Promise<PlanTier> {
  if (!sessionId) return getPlanTier();

  try {
    const res = await fetch(`/api/stripe/entitlement?session_id=${encodeURIComponent(sessionId)}`, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) return getPlanTier();
    const json: any = await res.json();
    const tier = normalizeTier(json?.plan_tier || json?.tier || json?.plan || 'unknown');
    if (tier !== 'unknown') setPlanTier(tier);
    return getPlanTier();
  } catch {
    return getPlanTier();
  }
}

// File: src/entitlements.ts (C:\Users\redfi\eu-cbam-reporter\marketing\src\entitlements.ts)
