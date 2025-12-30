// FILE: eu-cbam-reporter-marketing/pages/robots.txt.tsx
import type { GetServerSideProps } from "next";

export default function Robots() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const body = `User-agent: *
Allow: /

Sitemap: https://www.grandscope.ai/sitemap.xml
`;

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(body);

  return { props: {} };
};
// FILE: eu-cbam-reporter-marketing/pages/robots.txt.tsx
