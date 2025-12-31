// FILE: C:\Users\redfi\eu-cbam-reporter\marketing\src\components\Footer.tsx
import Link from "next/link";
import { useRouter } from "next/router";

const DEFAULT_LOCALE = "en";

function getLocalePrefixFromPath(pathname: string) {
  const safePath = (pathname || "").split("?")[0].split("#")[0];
  const firstSegment = safePath.split("/").filter(Boolean)[0] || "";
  const looksLikeLocale = /^[a-z]{2}(-[A-Z]{2})?$/.test(firstSegment);
  return looksLikeLocale ? `/${firstSegment}` : `/${DEFAULT_LOCALE}`;
}

export default function Footer() {
  const router = useRouter();
  const currentPath = (router.asPath || "").split("?")[0].split("#")[0];
  const localePrefix = getLocalePrefixFromPath(currentPath);

  const hrefOverview = localePrefix;
  const hrefHow = `${localePrefix}/how-it-works`;
  const hrefPricing = `${localePrefix}/pricing`;
  const hrefCompliance = `${localePrefix}/compliance-data`;
  const hrefContact = `${localePrefix}/contact`;
  const hrefPenalty = "/tools/penalty-calculator";

  return (
    <footer
      className="border-t"
      style={{
        borderColor: "rgba(207,207,207,.70)",
        background:
          "radial-gradient(900px 220px at 15% 0%, rgba(48,98,99,.10), transparent 58%), radial-gradient(900px 220px at 85% 0%, rgba(255,214,23,.10), transparent 62%), rgba(245,245,245,.92)",
      }}
    >
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
                  <li>
                    <Link className="text-slate-600 hover:text-slate-900" href={hrefOverview}>
                      Overview
                    </Link>
                  </li>
                  <li>
                    <Link className="text-slate-600 hover:text-slate-900" href={hrefHow}>
                      How it works
                    </Link>
                  </li>
                  <li>
                    <Link className="text-slate-600 hover:text-slate-900" href={hrefPricing}>
                      Pricing
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <div className="text-sm font-semibold text-slate-900">Compliance</div>
                <ul className="mt-3 space-y-2 text-sm">
                  <li>
                    <Link className="text-slate-600 hover:text-slate-900" href={hrefCompliance}>
                      Compliance data
                    </Link>
                  </li>
                  <li>
                    <Link className="text-slate-600 hover:text-slate-900" href={hrefPenalty}>
                      Penalty calculator
                    </Link>
                  </li>
                  <li>
                    <Link className="text-slate-600 hover:text-slate-900" href={hrefContact}>
                      Contact
                    </Link>
                  </li>
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

