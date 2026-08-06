import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateProject } from "../scripts/p0.13-ci-quality-gates.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, "..");

const RELATIVE_INPUTS = [
  ".github/workflows/grandscope-quality-gates.yml",
  "package.json",
  "package-lock.json",
  "db-object-reconciliation.config.json",
  "scripts/p0.13-ci-quality-gates.mjs",
  "scripts/p0.13-run-database-gates.mjs",
  "scripts/p0.6-route-crawler.mjs",
  "scripts/reconcile-db-objects.mjs",
  "scripts/ci-verify.mjs",
  "tests/p0.13-ci-quality-gates.test.mjs",
  "tests/reconcile-db-objects.test.mjs",
  "supabase/config.toml",
  "supabase/seed.sql",
];

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "p0-13-ci-"));
  for (const relative of RELATIVE_INPUTS) {
    const source = path.join(projectRoot, relative);
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
  for (const directory of ["supabase/migrations", "supabase/tests"]) {
    const source = path.join(projectRoot, directory);
    const target = path.join(root, directory);
    fs.mkdirSync(target, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      fs.copyFileSync(path.join(source, entry), path.join(target, entry));
    }
  }
  return root;
}

function failedIds(result) {
  return result.checks.filter((check) => !check.pass).map((check) => check.id);
}

test("complete P0.13 package passes every static quality-gate check", () => {
  const result = validateProject(projectRoot);
  assert.equal(result.pass, true, JSON.stringify(result.checks.filter((check) => !check.pass), null, 2));
  assert.equal(result.failedCheckCount, 0);
  assert.equal(result.checkCount, 15);
});

test("route smoke gate has bounded requests, bounded crawl time, and POSIX process-tree cleanup", () => {
  const routeRunner = fs.readFileSync(path.join(projectRoot, "scripts/p0.6-route-crawler.mjs"), "utf8");
  const workflow = fs.readFileSync(path.join(projectRoot, ".github/workflows/grandscope-quality-gates.yml"), "utf8");

  assert.match(routeRunner, /const\s+detached\s*=\s*process\.platform\s*!==\s*"win32"/);
  assert.match(routeRunner, /process\.kill\(-child\.pid,\s*signal\)/);
  assert.match(routeRunner, /await\s+stopProcessTree\(child\)/);
  assert.match(routeRunner, /requestTimeoutMs/);
  assert.match(routeRunner, /crawlTimeoutMs/);
  assert.match(routeRunner, /maxRoutes/);
  assert.match(workflow, /timeout\s+--signal=TERM\s+--kill-after=30s\s+12m/);
  assert.match(workflow, /--request-timeout-ms\s+30000/);
  assert.match(workflow, /--crawl-timeout-ms\s+600000/);
  assert.match(workflow, /--max-routes\s+500/);
});

test("workflow gate fails when the production build command is removed", () => {
  const root = createFixture();
  const workflow = path.join(root, ".github/workflows/grandscope-quality-gates.yml");
  fs.writeFileSync(workflow, fs.readFileSync(workflow, "utf8").replace("npm run build", "echo build-skipped"));
  const result = validateProject(root);
  assert.equal(result.pass, false);
  assert.ok(failedIds(result).includes("P013-005"));
});

test("workflow gate fails when a gate is allowed to continue on error", () => {
  const root = createFixture();
  const workflow = path.join(root, ".github/workflows/grandscope-quality-gates.yml");
  fs.appendFileSync(workflow, "\n# deliberate test mutation\ncontinue-on-error: true\n");
  const result = validateProject(root);
  assert.equal(result.pass, false);
  assert.ok(failedIds(result).includes("P013-006"));
});

test("package gate fails when the typecheck script is absent", () => {
  const root = createFixture();
  const packagePath = path.join(root, "package.json");
  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  delete pkg.scripts.typecheck;
  fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
  const result = validateProject(root);
  assert.equal(result.pass, false);
  assert.ok(failedIds(result).includes("P013-008"));
});

test("migration gate fails when a canonical migration is renamed to a text file", () => {
  const root = createFixture();
  const migrations = path.join(root, "supabase/migrations");
  const source = path.join(migrations, "20260805170000_p0_12_restrict_supplier_evidence_storage.sql");
  fs.renameSync(source, source.replace(/\.sql$/, ".txt"));
  const result = validateProject(root);
  assert.equal(result.pass, false);
  assert.ok(failedIds(result).includes("P013-010"));
});

test("pgTAP gate fails when a security test loses its transaction rollback", () => {
  const root = createFixture();
  const testPath = path.join(root, "supabase/tests/p0.12_supplier_evidence_storage_test.sql");
  fs.writeFileSync(testPath, fs.readFileSync(testPath, "utf8").replace(/rollback\s*;/i, "-- rollback removed"));
  const result = validateProject(root);
  assert.equal(result.pass, false);
  assert.ok(failedIds(result).includes("P013-012"));
});

async function createDatabaseRunnerFixture({ failOn = "" } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "p0-13-db-runner-"));
  const supabaseRoot = path.join(root, "supabase");
  fs.mkdirSync(path.join(supabaseRoot, "migrations"), { recursive: true });
  fs.mkdirSync(path.join(supabaseRoot, "tests"), { recursive: true });
  fs.writeFileSync(path.join(supabaseRoot, "config.toml"), 'project_id = "test"\n');
  fs.writeFileSync(path.join(supabaseRoot, "seed.sql"), "select 1;\n");
  const log = path.join(root, "commands.log");
  const executable = path.join(root, "fake-supabase.mjs");
  fs.writeFileSync(
    executable,
    [
      'import fs from "node:fs";',
      `const log = ${JSON.stringify(log)};`,
      `const failOn = ${JSON.stringify(failOn)};`,
      'const command = process.argv.slice(2).join(" ");',
      'fs.appendFileSync(log, `${command}\\n`, "utf8");',
      'console.log(`fake supabase ${command}`);',
      'if (failOn && command === failOn) process.exit(3);',
      '',
    ].join("\n"),
    "utf8",
  );
  return {
    root,
    supabaseRoot,
    log,
    supabaseBin: process.execPath,
    supabaseArgsPrefix: [executable],
  };
}

test("database runner executes reset, SQL lint, pgTAP, and final cleanup", async () => {
  const { runDatabaseGates } = await import("../scripts/p0.13-run-database-gates.mjs");
  const fixture = await createDatabaseRunnerFixture();
  const result = await runDatabaseGates({
    projectRoot: fixture.root,
    supabaseRoot: fixture.supabaseRoot,
    evidenceDir: path.join(fixture.root, "evidence"),
    supabaseBin: fixture.supabaseBin,
    supabaseArgsPrefix: fixture.supabaseArgsPrefix,
  });
  assert.equal(result.pass, true);
  const commands = fs.readFileSync(fixture.log, "utf8").trim().split(/\r?\n/);
  assert.deepEqual(commands, ["--version", "stop", "start", "db reset", "db lint --local --level error --fail-on error --schema public", "test db", "stop"]);
});

test("database runner fails on SQL lint and still stops the local stack", async () => {
  const { runDatabaseGates } = await import("../scripts/p0.13-run-database-gates.mjs");
  const fixture = await createDatabaseRunnerFixture({ failOn: "db lint --local --level error --fail-on error --schema public" });
  const result = await runDatabaseGates({
    projectRoot: fixture.root,
    supabaseRoot: fixture.supabaseRoot,
    evidenceDir: path.join(fixture.root, "evidence"),
    supabaseBin: fixture.supabaseBin,
    supabaseArgsPrefix: fixture.supabaseArgsPrefix,
  });
  assert.equal(result.pass, false);
  assert.equal(result.exitCodes.lint, 3);
  const commands = fs.readFileSync(fixture.log, "utf8").trim().split(/\r?\n/);
  assert.equal(commands.at(-1), "stop");
  assert.equal(commands.includes("test db"), false);
});
