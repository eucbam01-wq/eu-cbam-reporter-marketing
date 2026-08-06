#!/usr/bin/env node

import { createWriteStream } from "node:fs";
import { promises as fs } from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const TASK = "P0.6 Repair broken internal routes and CTAs";
const LEGACY_REDIRECTS = new Map([
  ["/check", "/app"],
  ["/importer/reports/new", "/importer/emissions-review"],
  ["/importer/exports", "/importer/inspector-pack"],
  ["/importer/suppliers", "/importer/supplier-links"],
]);
const FORBIDDEN_SOURCE_ROUTES = [...LEGACY_REDIRECTS.keys()];
const VIDEO_PATH = "/videos/how-it-works.mp4";
const TEXT_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);

function parseArgs(argv) {
  const result = { startServer: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--start-server") {
      result.startServer = true;
      continue;
    }
    if (!value.startsWith("--")) continue;
    const key = value.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) throw new Error(`Missing value for ${value}`);
    result[key] = next;
    index += 1;
  }
  return result;
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function ensureDirectory(directory) {
  await fs.mkdir(directory, { recursive: true });
}

function normalizeRoute(candidate) {
  if (!candidate || typeof candidate !== "string") return null;
  const trimmed = candidate.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  if (/^(mailto:|tel:|javascript:|data:|blob:)/i.test(trimmed)) return null;
  if (trimmed.includes("${") || trimmed.includes("[") || trimmed.includes("]")) return null;
  return trimmed;
}

function routeFromPageFile(relativeFile) {
  const normalized = relativeFile.split(path.sep).join("/");
  if (!TEXT_EXTENSIONS.has(path.extname(normalized))) return null;
  const withoutExtension = normalized.replace(/\.(?:jsx?|tsx?)$/, "");
  if (withoutExtension === "_app" || withoutExtension === "_document" || withoutExtension === "_error") return null;
  if (withoutExtension.startsWith("api/")) return null;
  if (withoutExtension.includes("[")) return null;
  const route = withoutExtension.endsWith("/index")
    ? `/${withoutExtension.slice(0, -"/index".length)}`
    : withoutExtension === "index"
      ? "/"
      : `/${withoutExtension}`;
  return route || "/";
}

async function listFiles(root, extensions = null) {
  const files = [];
  async function walk(directory) {
    let entries = [];
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      if (["node_modules", ".next", ".git", "_p0_6_evidence", "_p0_6_rollback"].includes(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute);
      } else if (!extensions || extensions.has(path.extname(entry.name))) {
        files.push(absolute);
      }
    }
  }
  await walk(root);
  return files;
}

async function sourceAudit(projectRoot) {
  const scanRoots = [path.join(projectRoot, "pages"), path.join(projectRoot, "src")];
  const findings = [];
  const literalRoutes = new Set();

  for (const scanRoot of scanRoots) {
    const files = await listFiles(scanRoot, TEXT_EXTENSIONS);
    for (const file of files) {
      const text = await fs.readFile(file, "utf8");
      const relative = path.relative(projectRoot, file).split(path.sep).join("/");
      const lines = text.split(/\r?\n/);
      for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
        const line = lines[lineNumber];
        for (const route of FORBIDDEN_SOURCE_ROUTES) {
          if (line.includes(route)) {
            findings.push({ file: relative, line: lineNumber + 1, route, text: line.trim() });
          }
        }
      }

      const patterns = [
        /\bhref\s*=\s*["'](\/[^"']*)["']/gi,
        /\bhref\s*=\s*\{\s*["'](\/[^"']*)["']\s*\}/gi,
        /\bhref\s*:\s*["'](\/[^"']*)["']/gi,
      ];
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          const route = normalizeRoute(match[1]);
          if (route) literalRoutes.add(route);
        }
      }
    }
  }

  return { findings, literalRoutes };
}

async function localVideoAudit(projectRoot) {
  const file = path.join(projectRoot, "public", "videos", "how-it-works.mp4");
  try {
    const stat = await fs.stat(file);
    const handle = await fs.open(file, "r");
    const header = Buffer.alloc(32);
    await handle.read(header, 0, header.length, 0);
    await handle.close();
    const hasFtyp = header.includes(Buffer.from("ftyp"));
    return { exists: true, size: stat.size, hasFtyp, file };
  } catch (error) {
    return { exists: false, size: 0, hasFtyp: false, file, error: error?.message || String(error) };
  }
}

async function routesFromBuild(projectRoot) {
  const routes = new Set();
  const manifestPaths = [
    path.join(projectRoot, ".next", "server", "pages-manifest.json"),
    path.join(projectRoot, ".next", "routes-manifest.json"),
  ];
  for (const manifestPath of manifestPaths) {
    try {
      const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
      if (manifest && typeof manifest === "object") {
        if (!Array.isArray(manifest)) {
          for (const key of Object.keys(manifest)) {
            if (key.startsWith("/") && !key.includes("[") && !key.startsWith("/api/") && !["/404", "/500", "/_app", "/_document", "/_error"].includes(key)) {
              routes.add(key);
            }
          }
        }
        for (const listName of ["staticRoutes", "dynamicRoutes", "redirects"]) {
          const list = manifest[listName];
          if (!Array.isArray(list)) continue;
          for (const entry of list) {
            const route = entry?.page || entry?.regex || entry?.source;
            if (typeof route === "string" && route.startsWith("/") && !route.includes("[") && !route.includes("(") && !route.startsWith("/api/")) {
              routes.add(route);
            }
          }
        }
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return routes;
}

async function routesFromPages(projectRoot) {
  const routes = new Set();
  const pagesRoot = path.join(projectRoot, "pages");
  const files = await listFiles(pagesRoot, TEXT_EXTENSIONS);
  for (const file of files) {
    const route = routeFromPageFile(path.relative(pagesRoot, file));
    if (route) routes.add(route);
  }
  return routes;
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

async function waitForServer(baseUrl, child, timeoutMs = 90000) {
  const started = Date.now();
  let lastError = "";
  while (Date.now() - started < timeoutMs) {
    if (child?.exitCode !== null && child?.exitCode !== undefined) {
      throw new Error(`Next server exited with code ${child.exitCode}.`);
    }
    try {
      const response = await fetch(`${baseUrl}/en`, { redirect: "manual" });
      if (response.status > 0) return;
    } catch (error) {
      lastError = error?.message || String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${baseUrl}. ${lastError}`.trim());
}

function startNextServer(projectRoot, port, stdoutFile, stderrFile) {
  const stdout = createWriteStream(stdoutFile, { flags: "a" });
  const stderr = createWriteStream(stderrFile, { flags: "a" });
  const env = { ...process.env, NODE_ENV: "production" };
  const command = process.platform === "win32" ? "cmd.exe" : "npm";
  const commandArgs = process.platform === "win32"
    ? ["/d", "/s", "/c", `npm run start -- -p ${port}`]
    : ["run", "start", "--", "-p", String(port)];
  const child = spawn(command, commandArgs, {
    cwd: projectRoot,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: process.platform === "win32",
  });
  child.stdout.pipe(stdout);
  child.stderr.pipe(stderr);
  child.once("close", () => {
    stdout.end();
    stderr.end();
  });
  return child;
}

function stopProcessTree(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    return;
  }
  child.kill("SIGTERM");
}

function extractInternalReferences(html, pageUrl, baseOrigin) {
  const found = new Set();
  const expression = /\b(href|src)\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = expression.exec(html)) !== null) {
    const attribute = match[1].toLowerCase();
    const raw = normalizeRoute(match[2]);
    if (!raw) continue;
    if (attribute === "src" && !/\.(?:mp4|webm)(?:$|[?#])/i.test(raw)) continue;
    let resolved;
    try {
      resolved = new URL(raw, pageUrl);
    } catch {
      continue;
    }
    if (resolved.origin !== baseOrigin) continue;
    resolved.hash = "";
    found.add(`${resolved.pathname}${resolved.search}` || "/");
  }
  return found;
}

async function requestRoute(baseUrl, route) {
  const chain = [];
  let current = new URL(route, baseUrl);
  const isVideo = current.pathname.endsWith(".mp4") || current.pathname.endsWith(".webm");

  for (let hop = 0; hop < 10; hop += 1) {
    const headers = { "user-agent": "GrandScope-P0.6-RouteCrawler/1.0" };
    if (isVideo) headers.range = "bytes=0-1023";
    const response = await fetch(current, { redirect: "manual", headers });
    chain.push({ url: current.toString(), status: response.status, location: response.headers.get("location") || "" });

    if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
      current = new URL(response.headers.get("location"), current);
      continue;
    }

    const body = Buffer.from(await response.arrayBuffer());
    return {
      requestedRoute: route,
      status: response.status,
      finalUrl: current.toString(),
      contentType: response.headers.get("content-type") || "",
      bytes: body.length,
      body,
      chain,
    };
  }

  throw new Error(`Too many redirects for ${route}`);
}

function formatResultLine(result) {
  const finalPath = new URL(result.finalUrl).pathname;
  const redirectCount = Math.max(0, result.chain.length - 1);
  return `${result.status}\t${result.requestedRoute}\t${finalPath}\t${redirectCount}\t${result.contentType}\t${result.bytes}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = path.resolve(args.projectRoot || process.cwd());
  const outputDir = path.resolve(args.outputDir || path.join(projectRoot, "_p0_6_evidence", `route-crawler-${timestamp()}`));
  await ensureDirectory(outputDir);

  const source = await sourceAudit(projectRoot);
  const video = await localVideoAudit(projectRoot);
  const pageRoutes = await routesFromPages(projectRoot);
  const builtRoutes = await routesFromBuild(projectRoot);

  let child = null;
  let baseUrl = args.baseUrl || "";
  const stdoutFile = path.join(outputDir, "next-start.stdout.log");
  const stderrFile = path.join(outputDir, "next-start.stderr.log");

  try {
    if (args.startServer) {
      const port = args.port ? Number(args.port) : await getFreePort();
      if (!Number.isInteger(port) || port <= 0) throw new Error(`Invalid port: ${args.port}`);
      baseUrl = `http://127.0.0.1:${port}`;
      child = startNextServer(projectRoot, port, stdoutFile, stderrFile);
      await waitForServer(baseUrl, child);
    }
    if (!baseUrl) throw new Error("Provide --base-url or use --start-server.");

    const baseOrigin = new URL(baseUrl).origin;
    const queue = [];
    const queued = new Set();
    const enqueue = (route) => {
      const normalized = normalizeRoute(route);
      if (!normalized) return;
      let url;
      try {
        url = new URL(normalized, baseUrl);
      } catch {
        return;
      }
      if (url.origin !== baseOrigin) return;
      url.hash = "";
      const pathAndQuery = `${url.pathname}${url.search}` || "/";
      if (pathAndQuery.includes("[")) return;
      if (!queued.has(pathAndQuery)) {
        queued.add(pathAndQuery);
        queue.push(pathAndQuery);
      }
    };

    for (const route of pageRoutes) enqueue(route);
    for (const route of builtRoutes) enqueue(route);
    for (const route of source.literalRoutes) enqueue(route);
    for (const [legacy, canonical] of LEGACY_REDIRECTS) {
      enqueue(legacy);
      enqueue(canonical);
    }
    enqueue(VIDEO_PATH);

    const results = [];
    const failures = [];
    const redirectFailures = [];

    while (queue.length > 0) {
      const route = queue.shift();
      try {
        const result = await requestRoute(baseUrl, route);
        results.push(result);
        if (result.status < 200 || result.status >= 400) {
          failures.push({ route, reason: `HTTP ${result.status}`, finalUrl: result.finalUrl });
        }

        const expected = LEGACY_REDIRECTS.get(route);
        if (expected) {
          const finalPath = new URL(result.finalUrl).pathname;
          if (finalPath !== expected) {
            redirectFailures.push({ route, expected, actual: finalPath });
          }
        }

        if (result.contentType.toLowerCase().includes("text/html")) {
          const html = result.body.toString("utf8");
          for (const discovered of extractInternalReferences(html, result.finalUrl, baseOrigin)) enqueue(discovered);
        }
      } catch (error) {
        failures.push({ route, reason: error?.message || String(error), finalUrl: "" });
      }
    }

    const videoHttp = results.find((result) => result.requestedRoute === VIDEO_PATH);
    const videoHttpOk = Boolean(
      videoHttp &&
        [200, 206].includes(videoHttp.status) &&
        videoHttp.contentType.toLowerCase().includes("video/mp4"),
    );
    const pass =
      source.findings.length === 0 &&
      video.exists &&
      video.size > 0 &&
      video.hasFtyp &&
      videoHttpOk &&
      failures.length === 0 &&
      redirectFailures.length === 0;

    const reportLines = [
      `TASK=${TASK}`,
      `PROJECT_ROOT=${projectRoot}`,
      `BASE_URL=${baseUrl}`,
      `SOURCE_BROKEN_REFERENCE_COUNT=${source.findings.length}`,
      `LOCAL_VIDEO_EXISTS=${video.exists ? "TRUE" : "FALSE"}`,
      `LOCAL_VIDEO_SIZE=${video.size}`,
      `LOCAL_VIDEO_FTYP=${video.hasFtyp ? "TRUE" : "FALSE"}`,
      `VIDEO_HTTP_OK=${videoHttpOk ? "TRUE" : "FALSE"}`,
      `ROUTE_COUNT=${results.length}`,
      `HTTP_FAILURE_COUNT=${failures.length}`,
      `REDIRECT_ASSERTION_FAILURE_COUNT=${redirectFailures.length}`,
      `PASS=${pass ? "TRUE" : "FALSE"}`,
      "",
      "STATUS\tREQUESTED_ROUTE\tFINAL_PATH\tREDIRECTS\tCONTENT_TYPE\tBYTES",
      ...results.sort((a, b) => a.requestedRoute.localeCompare(b.requestedRoute)).map(formatResultLine),
    ];

    if (source.findings.length) {
      reportLines.push("", "SOURCE_FINDINGS");
      for (const finding of source.findings) {
        reportLines.push(`${finding.file}:${finding.line}\t${finding.route}\t${finding.text}`);
      }
    }
    if (failures.length) {
      reportLines.push("", "HTTP_FAILURES");
      for (const failure of failures) reportLines.push(`${failure.route}\t${failure.reason}\t${failure.finalUrl}`);
    }
    if (redirectFailures.length) {
      reportLines.push("", "REDIRECT_FAILURES");
      for (const failure of redirectFailures) reportLines.push(`${failure.route}\texpected=${failure.expected}\tactual=${failure.actual}`);
    }

    const textReport = path.join(outputDir, "route-crawler-report.txt");
    const jsonReport = path.join(outputDir, "route-crawler-report.json");
    await fs.writeFile(textReport, `${reportLines.join("\n")}\n`, "utf8");
    await fs.writeFile(
      jsonReport,
      `${JSON.stringify(
        {
          task: TASK,
          projectRoot,
          baseUrl,
          sourceFindings: source.findings,
          video,
          videoHttpOk,
          results: results.map(({ body, ...rest }) => rest),
          failures,
          redirectFailures,
          pass,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    console.log(reportLines.slice(0, 11).join("\n"));
    console.log(`TEXT_REPORT=${textReport}`);
    console.log(`JSON_REPORT=${jsonReport}`);
    if (!pass) process.exitCode = 1;
  } finally {
    stopProcessTree(child);
  }
}

main().catch((error) => {
  console.error(`FATAL_ERROR=${error?.stack || error?.message || String(error)}`);
  process.exitCode = 1;
});

