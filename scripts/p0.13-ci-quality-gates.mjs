#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const TASK = "P0.13 Add continuous integration quality gates";
const EXPECTED_MIGRATIONS = [
  "20260113013108_phase0_baseline.sql",
  "20260113013109_phase1_item1_org_groups_entities.sql",
  "20260804223000_p0_9_reconcile_source_objects.sql",
  "20260805113000_p0_11_harden_supplier_token_authorization.sql",
  "20260805170000_p0_12_restrict_supplier_evidence_storage.sql",
];
const EXPECTED_PGTAP = [
  "p0.9_referenced_object_authorization_test.sql",
  "p0.11_supplier_token_authorization_test.sql",
  "p0.11_supplier_token_lifecycle_test.sql",
  "p0.12_supplier_evidence_storage_test.sql",
];

function normalize(value) {
  return String(value ?? "").replaceAll("\\", "/");
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function listFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function parseConfigToml(text) {
  const projectId = text.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1] || "";
  const ports = [...text.matchAll(/^\s*(?:port|shadow_port)\s*=\s*(\d+)\s*$/gm)].map((match) => Number(match[1]));
  return { projectId, ports };
}

function checkResult(id, description, pass, detail = "") {
  return { id, description, pass: Boolean(pass), detail: String(detail || "") };
}

function includesInOrder(text, needles) {
  let cursor = -1;
  for (const needle of needles) {
    const found = text.indexOf(needle, cursor + 1);
    if (found < 0) return false;
    cursor = found;
  }
  return true;
}

export function validateProject(projectRoot) {
  const root = path.resolve(projectRoot);
  const workflowPath = path.join(root, ".github", "workflows", "grandscope-quality-gates.yml");
  const packagePath = path.join(root, "package.json");
  const configPath = path.join(root, "db-object-reconciliation.config.json");
  const supabaseConfigPath = path.join(root, "supabase", "config.toml");
  const migrationDir = path.join(root, "supabase", "migrations");
  const testDir = path.join(root, "supabase", "tests");
  const dbRunnerPath = path.join(root, "scripts", "p0.13-run-database-gates.mjs");
  const routeRunnerPath = path.join(root, "scripts", "p0.6-route-crawler.mjs");
  const reconcilePath = path.join(root, "scripts", "reconcile-db-objects.mjs");
  const ciVerifyPath = path.join(root, "scripts", "ci-verify.mjs");

  const requiredFiles = [
    workflowPath,
    packagePath,
    path.join(root, "package-lock.json"),
    configPath,
    supabaseConfigPath,
    path.join(root, "supabase", "seed.sql"),
    dbRunnerPath,
    routeRunnerPath,
    reconcilePath,
    ciVerifyPath,
    path.join(root, "tests", "p0.13-ci-quality-gates.test.mjs"),
    path.join(root, "tests", "reconcile-db-objects.test.mjs"),
  ];

  const checks = [];
  const missing = requiredFiles.filter((entry) => !fs.existsSync(entry));
  checks.push(checkResult("P013-001", "All CI implementation files exist", missing.length === 0, missing.map((entry) => normalize(path.relative(root, entry))).join(", ")));

  if (missing.includes(workflowPath) || missing.includes(packagePath) || missing.includes(configPath) || missing.includes(supabaseConfigPath)) {
    const failedCheckCount = checks.filter((check) => !check.pass).length;
    return { task: TASK, projectRoot: normalize(root), pass: false, checkCount: checks.length, failedCheckCount, checks };
  }

  const workflow = readText(workflowPath);
  const pkg = readJson(packagePath);
  const reconciliationConfig = readJson(configPath);
  const supabaseConfig = readText(supabaseConfigPath);
  const dbRunner = readText(dbRunnerPath);
  const migrations = listFiles(migrationDir);
  const pgTapTests = listFiles(testDir);

  checks.push(checkResult(
    "P013-002",
    "Workflow runs for pull requests, main pushes, merge queues, and manual dispatch",
    /pull_request:\s*[\s\S]*?branches:\s*[\s\S]*?- main/.test(workflow) &&
      /push:\s*[\s\S]*?branches:\s*[\s\S]*?- main/.test(workflow) &&
      /^\s*merge_group:\s*$/m.test(workflow) &&
      /^\s*workflow_dispatch:\s*$/m.test(workflow),
  ));
  checks.push(checkResult(
    "P013-003",
    "Required status check has a unique stable job name",
    /^\s{2}quality-gates:\s*$/m.test(workflow) && /^\s{4}name:\s*quality-gates\s*$/m.test(workflow),
  ));
  checks.push(checkResult(
    "P013-004",
    "Workflow uses current supported action majors and read-only contents permission",
    workflow.includes("actions/checkout@v6") &&
      workflow.includes("actions/setup-node@v7") &&
      workflow.includes("actions/upload-artifact@v6") &&
      workflow.includes("supabase/setup-cli@v3") &&
      /^\s{2}contents:\s*read\s*$/m.test(workflow),
  ));
  checks.push(checkResult(
    "P013-005",
    "Every required quality gate is present in workflow order",
    includesInOrder(workflow, [
      "npm ci",
      "npm run typecheck",
      "npm run test:unit",
      "npm run test:ci-config",
      "npm run test:db:static",
      "npm run build",
      "node scripts/p0.6-route-crawler.mjs",
      "supabase/setup-cli@v3",
      "npm run test:db",
    ]),
  ));
  checks.push(checkResult(
    "P013-006",
    "Workflow does not suppress gate failures",
    !/continue-on-error:\s*true/i.test(workflow) && !/\|\|\s*true/.test(workflow),
  ));
  checks.push(checkResult(
    "P013-007",
    "Workflow uploads evidence even after a failed gate",
    /if:\s*\$\{\{\s*always\(\)\s*\}\}/.test(workflow) && workflow.includes("_p0_13_ci_evidence/"),
  ));
  checks.push(checkResult(
    "P013-008",
    "Package scripts expose typecheck, unit, CI config, DB static, DB runtime, build, and route gates",
    typeof pkg.scripts?.typecheck === "string" &&
      typeof pkg.scripts?.["test:unit"] === "string" &&
      typeof pkg.scripts?.["test:ci-config"] === "string" &&
      typeof pkg.scripts?.["test:db:static"] === "string" &&
      typeof pkg.scripts?.["test:db"] === "string" &&
      typeof pkg.scripts?.build === "string" &&
      typeof pkg.scripts?.["test:routes"] === "string" &&
      typeof pkg.scripts?.["verify:p0.13"] === "string",
  ));
  checks.push(checkResult(
    "P013-009",
    "Database runner enforces clean reset, SQL lint, pgTAP, and cleanup",
    includesInOrder(dbRunner, [
      '["start"]',
      '["db", "reset"]',
      '["db", "lint", "--local", "--level", "error", "--fail-on", "error", "--schema", "public"]',
      '["test", "db"]',
    ]) && dbRunner.includes('["stop"]') && dbRunner.includes("finally"),
  ));
  checks.push(checkResult(
    "P013-010",
    "Canonical Phase 0 migrations are present in order and no non-SQL migration exists",
    EXPECTED_MIGRATIONS.every((name) => migrations.includes(name)) &&
      migrations.every((name) => name.toLowerCase().endsWith(".sql")) &&
      EXPECTED_MIGRATIONS.every((name, index) => index === 0 || name > EXPECTED_MIGRATIONS[index - 1]),
    `found=${migrations.join("|")}`,
  ));
  checks.push(checkResult(
    "P013-011",
    "All existing Phase 0 pgTAP and security tests are included",
    EXPECTED_PGTAP.every((name) => pgTapTests.includes(name)),
    `found=${pgTapTests.join("|")}`,
  ));

  const malformedTests = EXPECTED_PGTAP.filter((name) => {
    const filePath = path.join(testDir, name);
    if (!fs.existsSync(filePath)) return true;
    const text = readText(filePath);
    return !/\bbegin\s*;/i.test(text) || !/select\s+plan\s*\(\s*\d+\s*\)/i.test(text) || !/select\s+\*\s+from\s+finish\s*\(\s*\)/i.test(text) || !/\brollback\s*;/i.test(text);
  });
  checks.push(checkResult("P013-012", "pgTAP files are transactional and declare a test plan", malformedTests.length === 0, malformedTests.join(", ")));

  const parsedToml = parseConfigToml(supabaseConfig);
  checks.push(checkResult(
    "P013-013",
    "Supabase CI stack uses an isolated project id and unique ports",
    parsedToml.projectId === "grandscope-p0-13-ci" &&
      parsedToml.ports.length >= 5 &&
      new Set(parsedToml.ports).size === parsedToml.ports.length &&
      parsedToml.ports.every((port) => port >= 55720 && port <= 55799),
    `project_id=${parsedToml.projectId};ports=${parsedToml.ports.join(",")}`,
  ));
  checks.push(checkResult(
    "P013-014",
    "Database reconciliation scans the active application and versioned migration paths",
    JSON.stringify(reconciliationConfig.sourceRoots) === JSON.stringify(["pages", "src", "supabase/functions"]) &&
      JSON.stringify(reconciliationConfig.migrationRoots) === JSON.stringify(["supabase/migrations"]) &&
      reconciliationConfig.generatedAuthorizationTest === "supabase/tests/p0.9_referenced_object_authorization_test.sql",
  ));
  checks.push(checkResult(
    "P013-015",
    "Workflow avoids live production credentials",
    !/\$\{\{\s*secrets\./.test(workflow) && workflow.includes("p0-13-ci-placeholder"),
  ));

  const failedCheckCount = checks.filter((check) => !check.pass).length;
  return {
    task: TASK,
    generatedAt: new Date().toISOString(),
    projectRoot: normalize(root),
    expectedMigrationCount: EXPECTED_MIGRATIONS.length,
    migrationCount: migrations.length,
    expectedPgTapCount: EXPECTED_PGTAP.length,
    pgTapCount: pgTapTests.length,
    checkCount: checks.length,
    failedCheckCount,
    pass: failedCheckCount === 0,
    checks,
  };
}

function parseArgs(argv) {
  const args = { projectRoot: process.cwd(), json: false, output: null };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--json") args.json = true;
    else if (token === "--project-root" || token === "--output") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${token}`);
      if (token === "--project-root") args.projectRoot = value;
      else args.output = value;
      index += 1;
    } else if (token === "--help" || token === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${token}`);
  }
  args.projectRoot = path.resolve(args.projectRoot);
  if (args.output) args.output = path.resolve(args.output);
  return args;
}

function printText(result) {
  console.log(`TASK=${result.task}`);
  console.log(`CHECK_COUNT=${result.checkCount}`);
  console.log(`FAILED_CHECK_COUNT=${result.failedCheckCount}`);
  console.log(`MIGRATION_COUNT=${result.migrationCount ?? -1}`);
  console.log(`PGTAP_TEST_COUNT=${result.pgTapCount ?? -1}`);
  for (const check of result.checks) {
    console.log(`${check.pass ? "OK" : "NOT_OK"}=${check.id}:${check.description}${check.detail ? `:${check.detail}` : ""}`);
  }
  console.log(`PASS=${result.pass ? "TRUE" : "FALSE"}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("Usage: node scripts/p0.13-ci-quality-gates.mjs [--project-root .] [--json] [--output file]");
    return;
  }
  const result = validateProject(args.projectRoot);
  if (args.output) {
    fs.mkdirSync(path.dirname(args.output), { recursive: true });
    fs.writeFileSync(args.output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  }
  if (args.json) console.log(JSON.stringify(result, null, 2));
  else printText(result);
  if (!result.pass) process.exitCode = 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (invokedPath && import.meta.url === invokedPath) {
  main().catch((error) => {
    console.error(`FATAL=${error?.stack || error?.message || String(error)}`);
    process.exitCode = 2;
  });
}
