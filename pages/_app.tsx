// FILE: C:\Users\redfi\eu-cbam-reporter\marketing\pages\_app.tsx
import type { AppProps } from "next/app";
import PublicLayout from "../src/layouts/PublicLayout";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <PublicLayout>
      <Component {...pageProps} />
    </PublicLayout>
  );
}
// FILE: C:\Users\redfi\eu-cbam-reporter\marketing\pages\_app.tsx
