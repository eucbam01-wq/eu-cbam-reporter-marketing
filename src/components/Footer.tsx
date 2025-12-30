// FILE: C:\Users\redfi\eu-cbam-reporter\marketing\src\components\Footer.tsx
export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="text-lg font-semibold tracking-tight text-slate-900">GrandScope</div>
            <p className="mt-2 text-sm text-slate-600">
              EU CBAM reporting software for Annex 5.1 submissions.
            </p>
            <p className="mt-3 text-xs text-slate-500">EU CBAM transitional phase reporting (2023 to 2025)</p>
          </div>

          <nav aria-label="Footer" className="md:col-span-2">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <div className="text-sm font-semibold text-slate-900">Product</div>
                <ul className="mt-3 space-y-2 text-sm">
                  <li><a className="text-slate-600 hover:text-slate-900" href="/en">Overview</a></li>
                  <li><a className="text-slate-600 hover:text-slate-900" href="/en/how-it-works">How it works</a></li>
                  <li><a className="text-slate-600 hover:text-slate-900" href="/en/pricing">Pricing</a></li>
                </ul>
              </div>

              <div>
                <div className="text-sm font-semibold text-slate-900">Compliance</div>
                <ul className="mt-3 space-y-2 text-sm">
                  <li><a className="text-slate-600 hover:text-slate-900" href="/en/compliance-data">Compliance data</a></li>
                  <li><a className="text-slate-600 hover:text-slate-900" href="/tools/penalty-calculator">Penalty calculator</a></li>
                  <li><a className="text-slate-600 hover:text-slate-900" href="/en/contact">Contact</a></li>
                </ul>
              </div>
            </div>
          </nav>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6 text-xs text-slate-500">
          (c) {new Date().getFullYear()} GrandScope. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
// FILE: C:\Users\redfi\eu-cbam-reporter\marketing\src\components\Footer.tsx

