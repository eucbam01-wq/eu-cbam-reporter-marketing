// File: pages/app.tsx (C:\Users\redfi\eu-cbam-reporter\marketing\pages\app.tsx)

import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useMemo } from 'react';
import { hasEntitlement, lockedText, PLAN_TIER } from '../src/entitlements';

type NavItem = {
  label: string;
  href: string;
  entitlementKey?: string;
};

function LockedPill() {
  return (
    <span
      className="inline-flex items-center rounded-full border border-white/20 px-2 py-0.5 text-xs text-white/80"
      aria-label="Locked"
    >
      🔒 Locked
    </span>
  );
}

export default function AppPage() {
  const router = useRouter();

  const navItems = useMemo<NavItem[]>(
    () => [
      { label: 'Importer Dashboard', href: '/importer' },
      { label: 'Certificates', href: '/importer/certificates', entitlementKey: 'nav.certificates' },
      { label: 'Forecast', href: '/importer/certificates?view=forecast', entitlementKey: 'nav.forecast' },
      { label: 'Exposure Dashboard', href: '/importer/exposure', entitlementKey: 'nav.exposure' },
      { label: 'Scenario Planner', href: '/importer/scenarios', entitlementKey: 'nav.scenarios' },
    ],
    []
  );

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold">GrandScope</h1>
            <p className="mt-1 text-sm text-white/70">Plan tier: <span className="font-mono">{PLAN_TIER}</span></p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {navItems.map((item) => {
            const locked = item.entitlementKey ? !hasEntitlement(item.entitlementKey) : false;

            const onClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
              if (!locked) return;
              e.preventDefault();
              e.stopPropagation();
              router.replace('/importer');
            };

            return (
              <Link
                key={item.href + item.label}
                href={locked ? '/importer' : item.href}
                onClick={onClick}
                aria-disabled={locked}
                tabIndex={locked ? -1 : 0}
                className={
                  "group rounded-xl border border-white/10 bg-white/5 p-4 transition " +
                  (locked ? 'cursor-not-allowed opacity-60' : 'hover:border-white/20 hover:bg-white/10')
                }
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">{item.label}</div>
                  {locked ? <LockedPill /> : null}
                </div>
                {locked ? (
                  <div className="mt-2 text-xs text-white/60">{lockedText(item.entitlementKey || '')}</div>
                ) : (
                  <div className="mt-2 text-xs text-white/60">Open</div>
                )}
              </Link>
            );
          })}
        </div>

        <div className="mt-10 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-medium">Upgrade prompt</div>
          <div className="mt-1 text-xs text-white/60">Locked features show a disabled state and cannot be opened on this plan.</div>
        </div>
      </div>
    </main>
  );
}

// File: pages/app.tsx (C:\Users\redfi\eu-cbam-reporter\marketing\pages\app.tsx)
