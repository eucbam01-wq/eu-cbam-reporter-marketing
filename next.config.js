// FILE: C:\Users\redfi\Desktop\eu-cbam-reporter\marketing\next.config.js
const path = require("path");

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    return [
      { source: "/check", destination: "/app", permanent: false },
      { source: "/importer/reports/new", destination: "/importer/emissions-review", permanent: false },
      { source: "/importer/exports", destination: "/importer/inspector-pack", permanent: false },
      { source: "/importer/suppliers", destination: "/importer/supplier-links", permanent: false },
    ];
  },
};

module.exports = nextConfig;
