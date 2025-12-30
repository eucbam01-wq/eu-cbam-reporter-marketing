// FILE: C:\Users\redfi\eu-cbam-reporter\marketing\src\components\NavBar.tsx
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

type NavBarProps = {
  /** Mobile icon size (px). */
  iconSizeMobile?: number;
  /** Desktop icon size (px). */
  iconSizeDesktop?: number;
};

const NAV_HEIGHT_PX = 72; // fixed header height

export default function NavBar({ iconSizeMobile = 22, iconSizeDesktop = 26 }: NavBarProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const currentPath = (router.asPath || "").split("?")[0].split("#")[0];

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside as any);
    return () => document.removeEventListener("mousedown", handleClickOutside as any);
  }, [open]);

  // Close on escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close menu on route change (mobile)
  useEffect(() => {
    setOpen(false);
  }, [currentPath]);

function isActive(href: string, end = true) {
  if (!currentPath) return false;
  if (href === "/en") return currentPath === "/en" || currentPath === "/en/";
  return end ? currentPath === href || currentPath === href + "/" : currentPath.startsWith(href);
}

const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
    ["gs-toplink", isActive ? "is-active" : ""].filter(Boolean).join(" ");

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    ["gs-mobile-link", isActive ? "is-active" : ""].filter(Boolean).join(" ");

  return (
    <>
      <header className="gs-nav" style={{ height: `${NAV_HEIGHT_PX}px` }}>
        <style>{`
          .gs-nav, .gs-nav * { box-sizing: border-box; }
          .gs-nav a { text-decoration: none; transition: all 0.22s ease; position: relative; }

          /* Brand palette from homepage */
          .gs-nav{
            --gs-brand:#306263;
            --gs-highlight:#FFD617;
            --gs-support:#4073AF;
            --gs-text:#404040;
            --gs-muted:#707070;
            --gs-border: rgba(159,159,159,.35);

            position: fixed;
            top: 0; left: 0; right: 0;
            z-index: 50;
            background:
              radial-gradient(900px 220px at 15% 0%, rgba(48,98,99,.18), transparent 58%),
              radial-gradient(900px 220px at 85% 0%, rgba(255,214,23,.16), transparent 62%),
              rgba(245,245,245,.88);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(207,207,207,.70);
          }

          .gs-container{
            max-width: 1140px;
            margin: 0 auto;
            padding: 0 16px;
            height: 100%;
          }

          /* One grid for both desktop and mobile to prevent overlap */
          .gs-grid{
            display: grid;
            grid-template-columns: auto 1fr auto;
            align-items: center;
            height: 100%;
            gap: 12px;
          }

          /* Brand */
          .gs-brand{
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 8px 10px;
            border-radius: 9999px;
            border: 1px solid rgba(207,207,207,.65);
            background: rgba(255,255,255,.55);
            color: var(--gs-text);
            box-shadow: 0 10px 24px rgba(2,6,23,.06);
            line-height: 1;
          }
          .gs-brand:hover{ border-color: rgba(48,98,99,.35); transform: translateY(-1px); }

          .gs-brand-icon{
            display:block;
            width: var(--gs-icon, 26px);
            height: var(--gs-icon, 26px);
          }

          /* Wordmark matches your logo: Grand (teal) + Scope (charcoal) */
          .gs-wordmark{
            font-weight: 950;
            letter-spacing: .02em;
            font-size: 18px;
            display: inline-flex;
            align-items: baseline;
            gap: 0;
          }
          .gs-wordmark .grand{ color: var(--gs-brand); }
          .gs-wordmark .scope{ color: var(--gs-text); }

          /* Center links */
          .gs-links{
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 18px;
            min-width: 0;
          }

          .gs-toplink{
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 8px 12px;
            border-radius: 9999px;
            font-size: 1.02rem;
            font-weight: 750;
            color: var(--gs-text);
            white-space: nowrap;
          }

          .gs-toplink::after{
            content:"";
            position:absolute;
            left: 12px;
            right: 12px;
            bottom: -4px;
            height: 2px;
            border-radius: 9999px;
            background: var(--gs-brand);
            transform: scaleX(0);
            transform-origin: left;
            transition: transform 0.22s ease;
          }

          .gs-toplink:hover{
            color: var(--gs-brand);
            background: rgba(48,98,99,.08);
            transform: translateY(-1px);
          }
          .gs-toplink:hover::after{ transform: scaleX(1); }

          .gs-toplink.is-active{
            color: var(--gs-brand);
            background: rgba(48,98,99,.10);
            box-shadow: inset 0 0 0 1px rgba(48,98,99,.22);
            font-weight: 850;
          }
          .gs-toplink.is-active::after{ transform: scaleX(1); }

          /* Actions */
          .gs-actions{
            display: inline-flex;
            align-items: center;
            justify-content: flex-end;
            gap: 10px;
          }

          .gs-cta{
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 10px 18px;
            border-radius: 9999px;
            font-weight: 900;
            border: 1px solid rgba(207,207,207,.70);
            color: var(--gs-text);
            background: rgba(255,255,255,.62);
          }

          .gs-ctaPrimary{
            background: var(--gs-highlight);
            border-color: rgba(255,214,23,.85);
            color: rgba(64,64,64,.98);
            box-shadow: 0 14px 34px rgba(255,214,23,.18);
          }
          .gs-ctaPrimary:hover{ transform: translateY(-1px); filter: brightness(.98); }

          .gs-ctaSecondary{
            background: rgba(48,98,99,.92);
            border-color: rgba(48,98,99,.92);
            color: #fff;
            box-shadow: 0 14px 34px rgba(48,98,99,.18);
          }
          .gs-ctaSecondary:hover{ transform: translateY(-1px); filter: brightness(.98); }

          /* Mobile layout: 1fr auto 1fr keeps center perfectly centered without overlap */
          .gs-mobile{ display: none; }
          .gs-desktop{ display: grid; }

          .gs-centerControls{
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
          }

          .gs-hamburger{
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            border-radius: 9999px;
            border: 1px solid rgba(207,207,207,.70);
            background: rgba(255,255,255,.62);
            color: var(--gs-text);
          }
          .gs-hamburger:hover{ border-color: rgba(48,98,99,.35); color: var(--gs-brand); transform: translateY(-1px); }

          .gs-mobile-menu{
            position: absolute;
            top: ${NAV_HEIGHT_PX}px;
            right: 12px;
            width: min(92vw, 320px);
            background: rgba(255,255,255,.98);
            border: 1px solid rgba(207,207,207,.80);
            border-radius: 18px;
            box-shadow: 0 22px 70px rgba(2,6,23,.18);
            padding: 10px;
          }

          .gs-mobile-link{
            display:block;
            padding: 12px 12px;
            border-radius: 14px;
            font-weight: 850;
            color: var(--gs-text);
          }
          .gs-mobile-link:hover{ background: rgba(48,98,99,.10); color: var(--gs-brand); }
          .gs-mobile-link.is-active{ background: rgba(48,98,99,.12); color: var(--gs-brand); }

          .gs-mobile-actions{
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid rgba(207,207,207,.55);
            display: grid;
            gap: 10px;
          }

          @media (max-width: 900px){
            .gs-links{ gap: 10px; }
            .gs-toplink{ font-size: .98rem; padding: 8px 10px; }
          }

          @media (max-width: 768px){
            .gs-desktop{ display:none; }
            .gs-mobile{ display:grid; grid-template-columns: 1fr auto 1fr; }
            .gs-actions{ display:none; }
            .gs-links{ display:none; }
            .gs-brand{ justify-self: start; padding: 8px 10px; }
            .gs-wordmark{ display:none; } /* icon-only on mobile */
          }
        `}</style>

        <div className="gs-container">
          {/* Desktop */}
          <div className="gs-grid gs-desktop">
            <Link href="/en"
              className="gs-brand"
              aria-label="GrandScope home"
              style={{ ["--gs-icon" as any]: `${iconSizeDesktop}px` }}
            >
              <img
                className="gs-brand-icon"
                src="/brand/grandscope-icon.png"
                alt="GrandScope icon"
                width={iconSizeDesktop}
                height={iconSizeDesktop}
              />
              <span className="gs-wordmark" aria-label="GrandScope">
                <span className="grand">Grand</span>
                <span className="scope">Scope</span>
              </span>
            </Link>

            <nav className="gs-links" aria-label="Primary">
              <Link href="/en" className={ desktopLinkClass({ isActive: isActive("/en", true) }) } aria-current={ isActive("/en", true) ? "page" : undefined }>
Home
</Link>
              <Link href="/en/pricing" className={ desktopLinkClass({ isActive: isActive("/en/pricing", true) }) } aria-current={ isActive("/en/pricing", true) ? "page" : undefined }>
Pricing
</Link>
              <Link href="/en/how-it-works" className={ desktopLinkClass({ isActive: isActive("/en/how-it-works", true) }) } aria-current={ isActive("/en/how-it-works", true) ? "page" : undefined }>
How it works
</Link>
              <Link href="/en/compliance-data" className={ desktopLinkClass({ isActive: isActive("/en/compliance-data", true) }) } aria-current={ isActive("/en/compliance-data", true) ? "page" : undefined }>
Compliance &amp; Data
</Link>
              <Link href="/en/contact" className={ desktopLinkClass({ isActive: isActive("/en/contact", true) }) } aria-current={ isActive("/en/contact", true) ? "page" : undefined }>
Contact
</Link>
            </nav>

            <div className="gs-actions" aria-label="Actions">
              <Link href="/login" className="gs-cta gs-ctaPrimary">
                Sign In
              </Link>
              <a href="#request-demo" className="gs-cta gs-ctaSecondary">
                Request demo
              </a>
            </div>
          </div>

          {/* Mobile */}
          <div className="gs-grid gs-mobile" style={{ position: "relative" }}>
            <Link href="/en"
              className="gs-brand"
              aria-label="GrandScope home"
              style={{ ["--gs-icon" as any]: `${iconSizeMobile}px` }}
            >
              <img
                className="gs-brand-icon"
                src="/brand/grandscope-icon.png"
                alt="GrandScope icon"
                width={iconSizeMobile}
                height={iconSizeMobile}
              />
              <span className="gs-wordmark" aria-hidden="true">
                <span className="grand">Grand</span>
                <span className="scope">Scope</span>
              </span>
            </Link>

            <div className="gs-centerControls">
              <button
                aria-label="Open menu"
                aria-expanded={open}
                aria-controls="gs-mobile-menu"
                className="gs-hamburger"
                onClick={() => setOpen((v) => !v)}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {open ? (
                    <path d="M18 6L6 18M6 6l12 12" />
                  ) : (
                    <>
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <line x1="3" y1="12" x2="21" y2="12" />
                      <line x1="3" y1="18" x2="21" y2="18" />
                    </>
                  )}
                </svg>
              </button>

              <Link href="/login" className="gs-cta gs-ctaPrimary" style={{ padding: "10px 18px" }}>
                Sign In
              </Link>
            </div>

            <div aria-hidden="true" />
          </div>

          {/* Mobile dropdown menu */}
          {open && (
            <div
              ref={menuRef}
              id="gs-mobile-menu"
              className="gs-mobile-menu"
              role="menu"
              aria-label="Main menu"
            >
              <Link href="/en" role="menuitem" className={ mobileLinkClass({ isActive: isActive("/en", true) }) } aria-current={ isActive("/en", true) ? "page" : undefined }>
Home
</Link>
              <Link href="/en/pricing" role="menuitem" className={ mobileLinkClass({ isActive: isActive("/en/pricing", true) }) } aria-current={ isActive("/en/pricing", true) ? "page" : undefined }>
Pricing
</Link>
              <Link href="/en/how-it-works" role="menuitem" className={ mobileLinkClass({ isActive: isActive("/en/how-it-works", true) }) } aria-current={ isActive("/en/how-it-works", true) ? "page" : undefined }>
How it works
</Link>
              <Link href="/en/compliance-data" role="menuitem" className={ mobileLinkClass({ isActive: isActive("/en/compliance-data", true) }) } aria-current={ isActive("/en/compliance-data", true) ? "page" : undefined }>
Compliance &amp; Data
</Link>
              <Link href="/en/contact" role="menuitem" className={ mobileLinkClass({ isActive: isActive("/en/contact", true) }) } aria-current={ isActive("/en/contact", true) ? "page" : undefined }>
Contact
</Link>

              <div className="gs-mobile-actions">
                <a href="#request-demo" className="gs-cta gs-ctaSecondary">
                  Request demo
                </a>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Spacer: header height + gap so the next section never sits under it */}
      <div style={{ height: `${NAV_HEIGHT_PX + 14}px` }} />
    </>
  );
}
// FILE: C:\Users\redfi\eu-cbam-reporter\marketing\src\components\NavBar.tsx
