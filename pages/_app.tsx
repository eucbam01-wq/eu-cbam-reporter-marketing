// FILE: marketing/pages/_app.tsx
import React from "react";
import type { AppProps } from "next/app";
import PublicLayout from "../src/layouts/PublicLayout";

export default function App({ Component, pageProps }: AppProps) {
  // Allows per-page layout overrides, while keeping PublicLayout as default.
  // Pages can export: Page.getLayout = (page) => <>{page}</>
  const getLayout =
    (Component as any).getLayout ||
    ((page: React.ReactNode) => <PublicLayout>{page}</PublicLayout>);

  return getLayout(<Component {...pageProps} />);
}

// FILE: marketing/pages/_app.tsx
