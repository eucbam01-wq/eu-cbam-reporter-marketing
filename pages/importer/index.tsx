// File: pages/importer/index.tsx (C:\Users\redfi\eu-cbam-reporter\marketing\pages\importer\index.tsx)

import Link from 'next/link';
import React from 'react';
import { hasEntitlement, lockedText } from '../../src/entitlements';

function ActionButton(props: {
  label: string;
  href: string;
  entitlementKey: string;
}) {
  const locked = !hasEntitlement(props.entitlementKey);
  return (
    <Link
      href={locked ? '/importer' : props.href}
      aria-disabled={locked}
      tabIndex={locked ? -1 : 0}
      className={
        'flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 transition ' +
        (locked ? 'cursor-not-allowed opacity-60' : 'hover:border-white/20 hover:bg-white/10')
      }
      onClick={(e) => {
        if (!locked) return;
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div>
        <div className="text-sm font-medium">{props.label}</div>
        {locked ? <div className="mt-1 text-xs text-white/60">{lockedText(props.entitlementKey)}</div> : null}
      </div>
      <div className="text-xs text-white/70">{locked ? '🔒' : '→'}</div>
    </Link>
  );
}

export default function ImporterIndexPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Importer</h1>
        <p className="mt-1 text-sm text-white/70">Actions below enforce entitlements in the UI.</p>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ActionButton label="Create report" href="/importer/reports/new" entitlementKey="action.create_report" />
          <ActionButton label="Export (CSV/XML)" href="/importer/exports" entitlementKey="action.export" />
          <ActionButton label="Upload certificate" href="/importer/certificates" entitlementKey="action.upload_certificate" />
          <ActionButton label="Manage suppliers" href="/importer/suppliers" entitlementKey="action.manage_suppliers" />
        </div>

        <div className="mt-10 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-medium">Locked state</div>
          <div className="mt-1 text-xs text-white/60">Locked actions are disabled and remain on this page.</div>
        </div>
      </div>
    </main>
  );
}

// File: pages/importer/index.tsx (C:\Users\redfi\eu-cbam-reporter\marketing\pages\importer\index.tsx)
