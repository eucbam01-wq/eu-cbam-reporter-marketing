// FILE: marketing/pages/_app.tsx
import React from "react";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import PublicLayout from "../src/layouts/PublicLayout";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  // Supplier portal must be isolated: no marketing navbar/footer/layout.
  // Route pattern in Next pages router is "/supplier/[token]".
  const isSupplierPortal = router.pathname === "/supplier/[token]" || router.asPath.startsWith("/supplier/");

  const getLayout =
    (Component as any).getLayout ||
    ((page: React.ReactNode) => (isSupplierPortal ? <>{page}</> : <PublicLayout>{page}</PublicLayout>));

  return getLayout(<Component {...pageProps} />);
}
// FILE: marketing/pages/_app.tsx
