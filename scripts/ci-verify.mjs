#!/usr/bin/env node
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function readOption(args, name, fallback = null) {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  if (!args[index + 1] || args[index + 1].startsWith("--")) {
    throw new Error(`Missing value for ${name}`);
  }
  return args[index + 1];
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const reconcileScript = path.join(scriptDir, "reconcile-db-objects.mjs");
const args = process.argv.slice(2);
const projectRoot = path.resolve(readOption(args, "--project-root", process.cwd()));
const config = path.resolve(projectRoot, readOption(args, "--config", "db-object-reconciliation.config.json"));
const outputDir = path.resolve(projectRoot, readOption(args, "--output-dir", "_p0_13_ci_evidence/db-contract"));

const child = spawnSync(
  process.execPath,
  [
    reconcileScript,
    "--project-root", projectRoot,
    "--config", config,
    "--output-dir", outputDir,
    "--strict",
  ],
  { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
);

if (child.stdout) process.stdout.write(child.stdout);
if (child.stderr) process.stderr.write(child.stderr);
if (child.error) {
  console.error(`FATAL=${child.error.message}`);
  process.exitCode = 2;
} else {
  process.exitCode = child.status ?? 2;
}
