// FILE: marketing/pages/tools/penalty-calculator.tsx
import type { GetServerSideProps } from "next";

export default function PenaltyCalculatorRedirectPage() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: "/en",
    permanent: false,
  },
});

// FILE: marketing/pages/tools/penalty-calculator.tsx
