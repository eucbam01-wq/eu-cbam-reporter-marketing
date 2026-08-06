// FILE: marketing/pages/pricing.tsx
import type { GetServerSideProps } from "next";

export default function PricingRedirectPage() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const queryIndex = context.resolvedUrl.indexOf("?");
  const queryString = queryIndex >= 0 ? context.resolvedUrl.slice(queryIndex) : "";

  return {
    redirect: {
      destination: `/en/pricing${queryString}`,
      permanent: false,
    },
  };
};

// FILE: marketing/pages/pricing.tsx
