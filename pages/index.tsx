// FILE: C:\Users\redfi\eu-cbam-reporter\marketing\pages\index.tsx
import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/en",
      permanent: false,
    },
  };
};

export default function Index() {
  return null;
}
// FILE: C:\Users\redfi\eu-cbam-reporter\marketing\pages\index.tsx
