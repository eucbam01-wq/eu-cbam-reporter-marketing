// File: eu-cbam-reporter-marketing/pages/sitemap.xml.tsx
import type { GetServerSideProps } from "next";

export default function SiteMap() {
  return null;
}

function xmlEscape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toIsoDate(d: Date) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export const getServerSideProps: GetServerSideProps = async ({ res, req }) => {
  const host = req.headers.host || "www.grandscope.ai";
  const protocol = (req.headers["x-forwarded-proto"] as string) || "https";
  const base = `${protocol}://${host}`;

  const urls = [
    `${base}/en`,
    `${base}/en/how-it-works`,
    `${base}/en/pricing`,
    `${base}/en/compliance-data`,
    `${base}/en/contact`,
    `${base}/tools/penalty-calculator`
  ];

  const lastmod = toIsoDate(new Date());

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (loc) =>
          `  <url>\n` +
          `    <loc>${xmlEscape(loc)}</loc>\n` +
          `    <lastmod>${lastmod}</lastmod>\n` +
          `  </url>\n`
      )
      .join("") +
    `</urlset>\n`;

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  res.end(body);

  return { props: {} };
};
// File: eu-cbam-reporter-marketing/pages/sitemap.xml.tsx
