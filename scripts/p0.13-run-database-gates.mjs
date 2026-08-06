#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const TASK = "P0.13 Add continuous integration quality gates";

function parseArgs(argv) {
  const args = {
    projectRoot: process.cwd(),
    evidenceDir: "_p0_13_ci_evidence/database",
    keepRunning: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--keep-running") {
      args.keepRunning = true;
      continue;
    }
    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }
    if (!token.startsWith("--")) throw new Error(`Unknown argument: ${token}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${token}`);
    if (token === "--project-root") args.projectRoot = value;
    else if (token === "--evidence-dir") args.evidenceDir = value;
    else if (token === "--supabase-bin") args.supabaseBin = value;
    else throw new Error(`Unknown argument: ${token}`);
    index += 1;
  }
  args.projectRoot = path.resolve(args.projectRoot);
  args.supabaseRoot = path.join(args.projectRoot, "supabase");
  args.evidenceDir = path.resolve(args.projectRoot, args.evidenceDir);
  args.supabaseBin = args.supabaseBin || process.env.SUPABASE_BIN || "supabase";
  return args;
}

function ensureDir(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function redact(value) {
  return String(value ?? "")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_LOCAL_JWT]")
    .replace(/((?:service[_ -]?role|anon|publishable|secret|jwt)[_ -]?(?:key|secret)?\s*[:=]\s*)\S+/gi, "$1[REDACTED]")
    .replace(/(postgresql:\/\/postgres:)[^@\s]+@/gi, "$1[REDACTED]@");
}

function commandLabel(command, args) {
  return [command, ...args].join(" ");
}

async function runCommand({ command, args, cwd, logPath, allowFailure = false }) {
  ensureDir(path.dirname(logPath));
  const stream = fs.createWriteStream(logPath, { flags: "w" });
  const startedAt = new Date();
  const header = `COMMAND=${commandLabel(command, args)}\nSTARTED_UTC=${startedAt.toISOString()}\n`;
  stream.write(header);
  process.stdout.write(header);

  return await new Promise((resolve) => {
    let settled = false;
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const write = (chunk) => {
      const safe = redact(chunk.toString());
      stream.write(safe);
      process.stdout.write(safe);
    };
    child.stdout.on("data", write);
    child.stderr.on("data", write);

    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      const message = `\nSPAWN_ERROR=${redact(error.message)}\nEXIT_CODE=127\n`;
      stream.end(message);
      process.stderr.write(message);
      resolve({ exitCode: 127, error: error.message, allowFailure });
    });

    child.once("close", (code, signal) => {
      if (settled) return;
      settled = true;
      const exitCode = Number.isInteger(code) ? code : 128;
      const footer = `\nFINISHED_UTC=${new Date().toISOString()}\nSIGNAL=${signal || ""}\nEXIT_CODE=${exitCode}\n`;
      stream.end(footer);
      process.stdout.write(footer);
      resolve({ exitCode, signal, allowFailure });
    });
  });
}

function resultCode(result) {
  return result && Number.isInteger(result.exitCode) ? result.exitCode : -1;
}

export async function runDatabaseGates(options = {}) {
  const args = { ...options };
  args.projectRoot = path.resolve(args.projectRoot || process.cwd());
  args.supabaseRoot = path.resolve(args.supabaseRoot || path.join(args.projectRoot, "supabase"));
  args.evidenceDir = path.resolve(args.evidenceDir || path.join(args.projectRoot, "_p0_13_ci_evidence/database"));
  args.supabaseBin = args.supabaseBin || process.env.SUPABASE_BIN || "supabase";
  args.supabaseArgsPrefix = Array.isArray(args.supabaseArgsPrefix)
    ? args.supabaseArgsPrefix.map((value) => String(value))
    : [];
  args.keepRunning = Boolean(args.keepRunning);
  ensureDir(args.evidenceDir);

  const withSupabasePrefix = (commandArgs) => [...args.supabaseArgsPrefix, ...commandArgs];

  const required = [
    path.join(args.supabaseRoot, "config.toml"),
    path.join(args.supabaseRoot, "seed.sql"),
    path.join(args.supabaseRoot, "migrations"),
    path.join(args.supabaseRoot, "tests"),
  ];
  const missing = required.filter((entry) => !fs.existsSync(entry));
  if (missing.length) {
    throw new Error(`Missing Supabase CI input: ${missing.join(", ")}`);
  }

  const results = {
    version: null,
    initialStop: null,
    start: null,
    reset: null,
    lint: null,
    pgTap: null,
    finalStop: null,
  };
  let primaryError = null;

  try {
    results.version = await runCommand({
      command: args.supabaseBin,
      args: withSupabasePrefix(["--version"]),
      cwd: args.supabaseRoot,
      logPath: path.join(args.evidenceDir, "00-supabase-version.log"),
    });
    if (results.version.exitCode !== 0) throw new Error("Supabase CLI is unavailable.");

    results.initialStop = await runCommand({
      command: args.supabaseBin,
      args: withSupabasePrefix(["stop"]),
      cwd: args.supabaseRoot,
      logPath: path.join(args.evidenceDir, "01-initial-stop.log"),
      allowFailure: true,
    });

    results.start = await runCommand({
      command: args.supabaseBin,
      args: withSupabasePrefix(["start"]),
      cwd: args.supabaseRoot,
      logPath: path.join(args.evidenceDir, "02-supabase-start.log"),
    });
    if (results.start.exitCode !== 0) throw new Error("Supabase start failed.");

    results.reset = await runCommand({
      command: args.supabaseBin,
      args: withSupabasePrefix(["db", "reset"]),
      cwd: args.supabaseRoot,
      logPath: path.join(args.evidenceDir, "03-db-reset.log"),
    });
    if (results.reset.exitCode !== 0) throw new Error("Clean migration reset failed.");

    results.lint = await runCommand({
      command: args.supabaseBin,
      args: withSupabasePrefix(["db", "lint", "--local", "--level", "error", "--fail-on", "error", "--schema", "public"]),
      cwd: args.supabaseRoot,
      logPath: path.join(args.evidenceDir, "04-db-lint.log"),
    });
    if (results.lint.exitCode !== 0) throw new Error("SQL lint failed.");

    results.pgTap = await runCommand({
      command: args.supabaseBin,
      args: withSupabasePrefix(["test", "db"]),
      cwd: args.supabaseRoot,
      logPath: path.join(args.evidenceDir, "05-pgtap.log"),
    });
    if (results.pgTap.exitCode !== 0) throw new Error("pgTAP/security tests failed.");
  } catch (error) {
    primaryError = error;
  } finally {
    if (!args.keepRunning) {
      results.finalStop = await runCommand({
        command: args.supabaseBin,
        args: withSupabasePrefix(["stop"]),
        cwd: args.supabaseRoot,
        logPath: path.join(args.evidenceDir, "06-final-stop.log"),
        allowFailure: true,
      });
    }
  }

  const pass = !primaryError &&
    resultCode(results.version) === 0 &&
    resultCode(results.start) === 0 &&
    resultCode(results.reset) === 0 &&
    resultCode(results.lint) === 0 &&
    resultCode(results.pgTap) === 0;

  const summary = {
    task: TASK,
    generatedAt: new Date().toISOString(),
    projectRoot: args.projectRoot,
    supabaseRoot: args.supabaseRoot,
    evidenceDir: args.evidenceDir,
    pass,
    error: primaryError ? primaryError.message : null,
    exitCodes: Object.fromEntries(Object.entries(results).map(([key, value]) => [key, resultCode(value)])),
    commands: {
      reset: "supabase db reset",
      lint: "supabase db lint --local --level error --fail-on error --schema public",
      pgTap: "supabase test db",
    },
  };
  fs.writeFileSync(path.join(args.evidenceDir, "P0.13-database-gates.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    path.join(args.evidenceDir, "P0.13-database-gates.txt"),
    [
      `TASK=${TASK}`,
      `MIGRATION_RESET_EXIT_CODE=${resultCode(results.reset)}`,
      `SQL_LINT_EXIT_CODE=${resultCode(results.lint)}`,
      `PGTAP_EXIT_CODE=${resultCode(results.pgTap)}`,
      `PASS=${pass ? "TRUE" : "FALSE"}`,
      `EVIDENCE=${args.evidenceDir}`,
      primaryError ? `ERROR=${primaryError.message}` : "",
    ].filter(Boolean).join("\n") + "\n",
    "utf8",
  );

  console.log(`TASK=${TASK}`);
  console.log(`MIGRATION_RESET_EXIT_CODE=${resultCode(results.reset)}`);
  console.log(`SQL_LINT_EXIT_CODE=${resultCode(results.lint)}`);
  console.log(`PGTAP_EXIT_CODE=${resultCode(results.pgTap)}`);
  console.log(`PASS=${pass ? "TRUE" : "FALSE"}`);
  console.log(`EVIDENCE=${args.evidenceDir}`);
  if (primaryError) console.error(`ERROR=${primaryError.message}`);
  return summary;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("Usage: node scripts/p0.13-run-database-gates.mjs [--project-root .] [--evidence-dir path] [--supabase-bin path] [--keep-running]");
    return;
  }
  const summary = await runDatabaseGates(args);
  if (!summary.pass) process.exitCode = 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (invokedPath && import.meta.url === invokedPath) {
  main().catch((error) => {
    console.error(`FATAL=${error?.stack || error?.message || String(error)}`);
    process.exitCode = 2;
  });
}
