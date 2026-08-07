#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const BUILTIN_FROM_RECEIVERS = new Set([
  "array", "buffer", "object", "string", "number", "boolean", "bigint",
  "set", "map", "weakset", "weakmap", "uint8array", "uint16array",
  "uint32array", "int8array", "int16array", "int32array", "float32array",
  "float64array", "bigint64array", "biguint64array", "promise", "date",
]);

function normalizeSlashes(value) {
  return String(value ?? "").replaceAll("\\", "/");
}

function stableCodePointCompare(leftValue, rightValue) {
  const left = String(leftValue ?? "");
  const right = String(rightValue ?? "");
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function normalizeGeneratedLineEndings(value) {
  return String(value ?? "").replace(/\r\n?/g, "\n");
}

function canonicalGeneratedText(value) {
  return `${normalizeGeneratedLineEndings(value).replace(/\n*$/, "")}\n`;
}

function generatedFileMatchesCanonicalText(filePath, canonicalText) {
  if (!fs.existsSync(filePath)) return false;
  const existingBytes = fs.readFileSync(filePath);
  if (existingBytes.length >= 3 && existingBytes[0] === 0xef && existingBytes[1] === 0xbb && existingBytes[2] === 0xbf) {
    return false;
  }
  const existingText = existingBytes.toString("utf8");
  const withoutCrlf = existingText.replace(/\r\n/g, "");
  if (withoutCrlf.includes("\r")) return false;
  const hasCrlf = existingText.includes("\r\n");
  const hasBareLf = /(^|[^\r])\n/.test(existingText);
  if (hasCrlf && hasBareLf) return false;
  return normalizeGeneratedLineEndings(existingText) === canonicalText;
}

function writeCanonicalGeneratedFile(filePath, value) {
  const canonicalText = canonicalGeneratedText(value);
  if (generatedFileMatchesCanonicalText(filePath, canonicalText)) return false;
  const bytes = Buffer.from(canonicalText, "utf8");

  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, bytes, { flag: "wx" });
  try {
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    fs.rmSync(tempPath, { force: true });
    throw error;
  }
  return true;
}

function relative(projectRoot, absolutePath) {
  return normalizeSlashes(path.relative(projectRoot, absolutePath));
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function lineNumberAt(text, index) {
  return text.slice(0, Math.max(0, index)).split(/\r?\n/).length;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function walkFiles(rootPath, extensions = null) {
  if (!fs.existsSync(rootPath)) return [];
  const results = [];
  const stack = [rootPath];
  while (stack.length) {
    const current = stack.pop();
    const stat = fs.statSync(current);
    if (stat.isDirectory()) {
      const base = path.basename(current).toLowerCase();
      if (["node_modules", ".next", ".git", "dist", "build", "coverage"].includes(base)) continue;
      for (const entry of fs.readdirSync(current)) stack.push(path.join(current, entry));
    } else if (!extensions || extensions.has(path.extname(current).toLowerCase())) {
      results.push(current);
    }
  }
  return results.sort(stableCodePointCompare);
}

function parseArgs(argv) {
  const args = {
    projectRoot: process.cwd(),
    config: null,
    outputDir: null,
    strict: false,
    quiet: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--project-root") args.projectRoot = argv[++i];
    else if (token === "--config") args.config = argv[++i];
    else if (token === "--output-dir") args.outputDir = argv[++i];
    else if (token === "--strict") args.strict = true;
    else if (token === "--quiet") args.quiet = true;
    else if (token === "--help" || token === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${token}`);
  }
  args.projectRoot = path.resolve(args.projectRoot);
  args.config = path.resolve(args.config || path.join(args.projectRoot, "db-object-reconciliation.config.json"));
  return args;
}

function resolveCallArgument(rawArgument, sourceText, config) {
  const raw = String(rawArgument ?? "").trim().replace(/\s+as\s+any\s*$/i, "").trim();
  const literal = raw.match(/^(?:["'`])([^"'`]+)(?:["'`])$/s);
  if (literal) return { value: literal[1], dynamic: false, source: "literal" };

  const quotedFallbacks = [...raw.matchAll(/["'`]([^"'`]+)["'`]/g)].map((m) => m[1]);
  if (quotedFallbacks.length) {
    return { value: quotedFallbacks.at(-1), dynamic: true, source: "inline-fallback" };
  }

  const identifier = raw.match(/^([A-Za-z_$][\w$]*)$/)?.[1];
  if (identifier) {
    const declaration = new RegExp(`\\b(?:const|let|var)\\s+${identifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*=\\s*([^;]+);`, "g");
    const declarations = [...sourceText.matchAll(declaration)];
    for (const match of declarations.reverse()) {
      const expression = match[1];
      const literals = [...expression.matchAll(/["'`]([^"'`]+)["'`]/g)].map((m) => m[1]);
      if (literals.length) return { value: literals.at(-1), dynamic: true, source: `identifier:${identifier}` };
      for (const [envName, fallback] of Object.entries(config.dynamicBucketFallbacks || {})) {
        if (expression.includes(envName)) return { value: fallback, dynamic: true, source: `env:${envName}` };
      }
    }
  }

  for (const [envName, fallback] of Object.entries(config.dynamicBucketFallbacks || {})) {
    if (raw.includes(envName)) return { value: fallback, dynamic: true, source: `env:${envName}` };
  }
  return { value: null, dynamic: true, source: raw || "unresolved" };
}

function inferOperations(sourceText, matchIndex, kind) {
  const tail = sourceText.slice(matchIndex, matchIndex + 1600);
  const stopCandidates = [tail.indexOf(";"), tail.indexOf("\n\n")].filter((v) => v > 0);
  const stop = stopCandidates.length ? Math.max(...stopCandidates) : tail.length;
  const chain = tail.slice(0, Math.min(stop + 1, tail.length));
  const operations = new Set();

  if (kind === "rpc") operations.add("EXECUTE");
  else if (kind === "bucket") {
    if (/\.upload\s*\(/.test(chain)) operations.add("INSERT");
    if (/\.createSignedUrl\s*\(|\.download\s*\(|\.list\s*\(/.test(chain)) operations.add("SELECT");
    if (/\.remove\s*\(/.test(chain)) operations.add("DELETE");
    if (/\.update\s*\(/.test(chain)) operations.add("UPDATE");
  } else {
    if (/\.select\s*\(/.test(chain)) operations.add("SELECT");
    if (/\.insert\s*\(/.test(chain)) operations.add("INSERT");
    if (/\.upsert\s*\(/.test(chain)) operations.add("UPSERT");
    if (/\.update\s*\(/.test(chain)) operations.add("UPDATE");
    if (/\.delete\s*\(/.test(chain)) operations.add("DELETE");
  }

  if (!operations.size) operations.add(kind === "rpc" ? "EXECUTE" : "UNKNOWN");
  return [...operations].sort();
}

function sourceContext(filePath, receiver, sourceText) {
  const normalized = normalizeSlashes(filePath).toLowerCase();
  if (normalized.includes("/supabase/functions/")) {
    if (String(receiver).trim() === "service" || sourceText.includes("SUPABASE_SERVICE_ROLE_KEY")) return "edge-service-role";
    return "edge-authenticated";
  }
  if (normalized.includes("/pages/api/")) return "server";
  return "browser-authenticated";
}

export function scanSourceReferences(projectRoot, config) {
  const extensions = new Set((config.sourceExtensions || [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]).map((x) => x.toLowerCase()));
  const files = (config.sourceRoots || []).flatMap((root) => walkFiles(path.join(projectRoot, root), extensions));
  const references = [];
  const unresolved = [];

  for (const filePath of [...new Set(files)]) {
    const sourceText = fs.readFileSync(filePath, "utf8");
    const sourceFile = relative(projectRoot, filePath);

    const rpcRegex = /\.rpc\s*\(\s*(["'`][^"'`]+["'`](?:\s+as\s+any)?)/g;
    for (const match of sourceText.matchAll(rpcRegex)) {
      const resolved = resolveCallArgument(match[1], sourceText, config);
      if (!resolved.value) {
        unresolved.push({ kind: "rpc", sourceFile, line: lineNumberAt(sourceText, match.index), expression: match[1] });
        continue;
      }
      references.push({
        kind: "rpc",
        schema: config.defaultSchema || "public",
        name: resolved.value,
        operations: inferOperations(sourceText, match.index, "rpc"),
        sourceFile,
        line: lineNumberAt(sourceText, match.index),
        receiver: "rpc",
        context: sourceContext(filePath, "rpc", sourceText),
        dynamic: resolved.dynamic,
        resolution: resolved.source,
      });
    }

    const storageRegex = /\.storage\s*\.\s*from\s*\(\s*([^\)]+)\)/g;
    for (const match of sourceText.matchAll(storageRegex)) {
      const resolved = resolveCallArgument(match[1], sourceText, config);
      if (!resolved.value) {
        unresolved.push({ kind: "bucket", sourceFile, line: lineNumberAt(sourceText, match.index), expression: match[1] });
        continue;
      }
      references.push({
        kind: "bucket",
        schema: "storage",
        name: resolved.value,
        operations: inferOperations(sourceText, match.index, "bucket"),
        sourceFile,
        line: lineNumberAt(sourceText, match.index),
        receiver: "supabase.storage",
        context: sourceContext(filePath, "supabase.storage", sourceText),
        dynamic: resolved.dynamic,
        resolution: resolved.source,
      });
    }

    const fromRegex = /([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*)\s*\.\s*from\s*\(\s*([^\)]+)\)/g;
    for (const match of sourceText.matchAll(fromRegex)) {
      const receiver = match[1].replace(/\s+/g, "");
      const lastReceiver = receiver.split(".").at(-1).toLowerCase();
      if (BUILTIN_FROM_RECEIVERS.has(lastReceiver) || receiver.toLowerCase().endsWith(".storage")) continue;
      const resolved = resolveCallArgument(match[2], sourceText, config);
      if (!resolved.value) {
        unresolved.push({ kind: "relation", sourceFile, line: lineNumberAt(sourceText, match.index), expression: match[2], receiver });
        continue;
      }
      references.push({
        kind: "relation",
        schema: config.defaultSchema || "public",
        name: resolved.value,
        operations: inferOperations(sourceText, match.index, "relation"),
        sourceFile,
        line: lineNumberAt(sourceText, match.index),
        receiver,
        context: sourceContext(filePath, receiver, sourceText),
        dynamic: resolved.dynamic,
        resolution: resolved.source,
      });
    }
  }

  const seen = new Set();
  const deduped = references.filter((ref) => {
    const key = [ref.kind, ref.schema, ref.name, ref.sourceFile, ref.line, ref.operations.join(",")].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { references: deduped, unresolved };
}

function cleanIdentifier(value) {
  return String(value ?? "").replaceAll('"', "").trim().toLowerCase();
}

function objectKey(kind, schema, name) {
  return `${kind}:${cleanIdentifier(schema)}.${cleanIdentifier(name)}`;
}

function addObject(objects, key, data) {
  if (!objects.has(key)) objects.set(key, { ...data, migrations: [], policies: [], grants: [], owner: null });
  return objects.get(key);
}

function policyIsDeny(block, command) {
  const lower = block.toLowerCase().replace(/\s+/g, " ");
  if (command === "INSERT") return /with check\s*\(\s*false\s*\)/.test(lower);
  return /using\s*\(\s*false\s*\)/.test(lower);
}

function detectFunctionAuthorization(block) {
  const lower = block.toLowerCase();
  const signals = [];
  if (lower.includes("auth.uid()")) signals.push("auth.uid()");
  if (lower.includes("is_org_member")) signals.push("is_org_member");
  if (lower.includes("can_access_importer")) signals.push("can_access_importer");
  if (lower.includes("is_group_member")) signals.push("is_group_member");
  if (lower.includes("is_org_admin")) signals.push("is_org_admin");
  if (lower.includes("authentication_required")) signals.push("authentication_required");
  if (lower.includes("current_supplier_request_id")) signals.push("current_supplier_request_id");
  if (lower.includes("token_hash") && /p_token\b/.test(lower)) signals.push("supplier-token-validation");
  if (lower.includes("auth.jwt()")) signals.push("auth.jwt()");
  const security = lower.includes("security definer") ? "SECURITY DEFINER" : "SECURITY INVOKER/default";
  return { security, signals: [...new Set(signals)] };
}

export function parseMigrations(projectRoot, config) {
  const files = (config.migrationRoots || []).flatMap((root) => walkFiles(path.join(projectRoot, root), new Set([".sql"])));
  const objects = new Map();
  const allSql = [];

  for (const filePath of [...new Set(files)]) {
    const sql = fs.readFileSync(filePath, "utf8");
    const migrationFile = relative(projectRoot, filePath);
    allSql.push({ filePath, migrationFile, sql });

    const relationPatterns = [
      { kind: "table", regex: /create\s+table\s+(?:if\s+not\s+exists\s+)?((?:"?[\w$-]+"?\.)?"?[\w$-]+"?)/gi },
      { kind: "materialized_view", regex: /create\s+materialized\s+view\s+(?:if\s+not\s+exists\s+)?((?:"?[\w$-]+"?\.)?"?[\w$-]+"?)/gi },
      { kind: "view", regex: /create\s+(?:or\s+replace\s+)?view\s+((?:"?[\w$-]+"?\.)?"?[\w$-]+"?)/gi },
    ];
    for (const { kind, regex } of relationPatterns) {
      for (const match of sql.matchAll(regex)) {
        const parts = match[1].split(".").map(cleanIdentifier);
        const name = parts.pop();
        const schema = parts.pop() || config.defaultSchema || "public";
        const key = objectKey("relation", schema, name);
        const object = addObject(objects, key, { kind, schema, name });
        object.migrations.push({ file: migrationFile, line: lineNumberAt(sql, match.index) });
        if (kind === "view") {
          const viewHeader = sql.slice(match.index, Math.min(sql.length, match.index + 500));
          if (/with\s*\(\s*"?security_invoker"?\s*=\s*(?:'true'|true)\s*\)/i.test(viewHeader)) object.securityInvoker = true;
        }
      }
    }

    const functionMatches = [...sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+((?:"?[\w$-]+"?\.)?"?[\w$-]+"?)\s*\(/gi)];
    for (let i = 0; i < functionMatches.length; i += 1) {
      const match = functionMatches[i];
      const parts = match[1].split(".").map(cleanIdentifier);
      const name = parts.pop();
      const schema = parts.pop() || config.defaultSchema || "public";
      const end = functionMatches[i + 1]?.index ?? sql.length;
      const block = sql.slice(match.index, end);
      const auth = detectFunctionAuthorization(block);
      const key = objectKey("rpc", schema, name);
      const object = addObject(objects, key, { kind: "rpc", schema, name });
      object.migrations.push({ file: migrationFile, line: lineNumberAt(sql, match.index) });
      object.functionSecurity = auth.security;
      object.authorizationSignals = auth.signals;
    }

    for (const match of sql.matchAll(/alter\s+table\s+(?:only\s+)?((?:"?[\w$-]+"?\.)?"?[\w$-]+"?)\s+enable\s+row\s+level\s+security/gi)) {
      const parts = match[1].split(".").map(cleanIdentifier);
      const name = parts.pop();
      const schema = parts.pop() || config.defaultSchema || "public";
      const object = addObject(objects, objectKey("relation", schema, name), { kind: "table", schema, name });
      object.rlsEnabled = true;
      object.rlsMigration = { file: migrationFile, line: lineNumberAt(sql, match.index) };
    }

    const policyMatches = [...sql.matchAll(/create\s+policy\s+("[^"]+"|[\w$-]+)\s+on\s+((?:"?[\w$-]+"?\.)?"?[\w$-]+"?)/gi)];
    for (let i = 0; i < policyMatches.length; i += 1) {
      const match = policyMatches[i];
      const policyName = cleanIdentifier(match[1]);
      const parts = match[2].split(".").map(cleanIdentifier);
      const name = parts.pop();
      const schema = parts.pop() || config.defaultSchema || "public";
      const end = policyMatches[i + 1]?.index ?? Math.min(sql.length, match.index + 1600);
      const block = sql.slice(match.index, end);
      const command = block.match(/\bfor\s+(select|insert|update|delete|all)\b/i)?.[1]?.toUpperCase() || "ALL";
      const roles = block.match(/\bto\s+([^;\n]+?)(?:\s+using|\s+with\s+check|;)/i)?.[1]?.trim() || "unspecified";
      const policy = {
        name: policyName,
        command,
        roles,
        deny: policyIsDeny(block, command),
        file: migrationFile,
        line: lineNumberAt(sql, match.index),
        block: block.replace(/\s+/g, " ").trim().slice(0, 700),
      };
      const relation = addObject(objects, objectKey("relation", schema, name), { kind: "table", schema, name });
      relation.policies.push(policy);

      if (schema === "storage" && name === "objects") {
        for (const bucketMatch of block.matchAll(/bucket_id\s*=\s*'([^']+)'/gi)) {
          const bucketName = bucketMatch[1];
          const bucket = addObject(objects, objectKey("bucket", "storage", bucketName), { kind: "bucket", schema: "storage", name: bucketName });
          bucket.policies.push(policy);
        }
      }
    }

    for (const match of sql.matchAll(/insert\s+into\s+storage\.buckets\s*\([^)]*\)\s*values\s*\(\s*'([^']+)'/gi)) {
      const name = match[1];
      const object = addObject(objects, objectKey("bucket", "storage", name), { kind: "bucket", schema: "storage", name });
      object.migrations.push({ file: migrationFile, line: lineNumberAt(sql, match.index) });
    }

    for (const match of sql.matchAll(/alter\s+(table|view|materialized\s+view|function)\s+((?:"?[\w$-]+"?\.)?"?[\w$-]+"?)[^;]*?owner\s+to\s+("?[\w$-]+"?)/gi)) {
      const sqlKind = match[1].toLowerCase();
      const parts = match[2].split(".").map(cleanIdentifier);
      const name = parts.pop();
      const schema = parts.pop() || config.defaultSchema || "public";
      const keyKind = sqlKind === "function" ? "rpc" : "relation";
      const object = addObject(objects, objectKey(keyKind, schema, name), { kind: keyKind, schema, name });
      object.owner = cleanIdentifier(match[3]);
    }

    for (const match of sql.matchAll(/(grant|revoke)\s+execute\s+on\s+function\s+((?:"?[\w$-]+"?\.)?"?[\w$-]+"?)[^;]*?\s+(?:to|from)\s+([^;]+);/gi)) {
      const parts = match[2].split(".").map(cleanIdentifier);
      const name = parts.pop();
      const schema = parts.pop() || config.defaultSchema || "public";
      const object = addObject(objects, objectKey("rpc", schema, name), { kind: "rpc", schema, name });
      object.grants.push({ action: match[1].toUpperCase(), roles: match[3].trim(), file: migrationFile, line: lineNumberAt(sql, match.index) });
    }
  }

  for (const object of objects.values()) {
    object.migrations = [...new Map(object.migrations.map((m) => [`${m.file}:${m.line}`, m])).values()];
    object.policies = [...new Map(object.policies.map((p) => [`${p.file}:${p.line}:${p.name}`, p])).values()];
    if (!object.owner) object.owner = "postgres (migration executor default)";
  }
  return { objects, files: [...new Set(files)].map((file) => relative(projectRoot, file)), allSql };
}

function requiredPolicyOperations(references) {
  const operations = new Set();
  for (const ref of references) {
    if (ref.context === "edge-service-role") continue;
    for (const operation of ref.operations) {
      if (operation === "UPSERT") {
        operations.add("INSERT");
        operations.add("UPDATE");
      } else if (["SELECT", "INSERT", "UPDATE", "DELETE"].includes(operation)) operations.add(operation);
    }
  }
  return [...operations].sort();
}

function authorizationRuleForRelation(object) {
  if (!object) return "MISSING";
  if (object.kind === "view" || object.kind === "materialized_view") {
    const invoker = object.securityInvoker ? "security_invoker=true" : "security_invoker not detected";
    return `${object.kind}; ${invoker}; authorization inherited from underlying RLS relations`;
  }
  const policies = object.policies || [];
  if (!policies.length) return object.rlsEnabled ? "RLS enabled; no policies" : "RLS not enabled; no policies";
  return `${object.rlsEnabled ? "RLS enabled" : "RLS not enabled"}; ${policies.map((p) => `${p.name}[${p.command}${p.deny ? ":deny" : ""}]@${p.file}:${p.line}`).join(", ")}`;
}

function authorizationRuleForRpc(object) {
  if (!object) return "MISSING";
  const signals = object.authorizationSignals || [];
  const grants = object.grants?.length
    ? `; execute-controls=${object.grants.map((g) => `${g.action}:${g.roles}@${g.file}:${g.line}`).join(",")}`
    : "; execute controls not explicit";
  return `${object.functionSecurity || "SECURITY INVOKER/default"}; guards=${signals.length ? signals.join(",") : "none detected"}${grants}`;
}

function authorizationRuleForBucket(object) {
  if (!object) return "MISSING";
  const policies = object.policies || [];
  return policies.length
    ? `storage.objects policies: ${policies.map((p) => `${p.name}[${p.command}${p.deny ? ":deny" : ""}]@${p.file}:${p.line}`).join(", ")}`
    : "bucket exists; no storage.objects policy";
}

function roleIsGranted(object, roleName) {
  return (object?.grants || []).some((grant) => {
    if (grant.action !== "GRANT") return false;
    const roles = grant.roles.toLowerCase().replaceAll('"', '').split(",").map((role) => role.trim());
    return roles.includes(roleName.toLowerCase()) || roles.includes("public");
  });
}

function evaluateObject(group, migrationObject, config) {
  const failures = [];
  const warnings = [];
  const requiredOps = group.kind === "relation" || group.kind === "bucket" ? requiredPolicyOperations(group.references) : ["EXECUTE"];
  if (!migrationObject?.migrations?.length) failures.push("MISSING_MIGRATION");

  if (group.kind === "relation" && migrationObject?.migrations?.length) {
    if (migrationObject.kind === "table") {
      const clientRefs = group.references.filter((ref) => ref.context !== "edge-service-role");
      if (clientRefs.length && !migrationObject.rlsEnabled) failures.push("RLS_NOT_ENABLED");
      for (const operation of requiredOps) {
        const allows = (migrationObject.policies || []).some((policy) => !policy.deny && (policy.command === operation || policy.command === "ALL"));
        if (!allows) failures.push(`NO_${operation}_AUTHORIZATION_RULE`);
      }
      if (!requiredOps.length && !(migrationObject.policies || []).length) failures.push("NO_AUTHORIZATION_POLICY");
    } else if (migrationObject.kind === "view") {
      if (!migrationObject.securityInvoker) failures.push("VIEW_SECURITY_INVOKER_NOT_DECLARED");
    }
  }

  if (group.kind === "rpc" && migrationObject?.migrations?.length) {
    const publicRpcs = new Set((config.publicSupplierRpcs || []).map((name) => name.toLowerCase()));
    const expectedRole = publicRpcs.has(group.name.toLowerCase()) ? "anon" : "authenticated";
    if (!roleIsGranted(migrationObject, expectedRole)) failures.push(`NO_EXPLICIT_${expectedRole.toUpperCase()}_EXECUTE_GRANT`);

    if (!(migrationObject.authorizationSignals || []).length) {
      const warningRpcs = new Set((config.authorizationWarningRpcs || []).map((name) => name.toLowerCase()));
      if (warningRpcs.has(group.name.toLowerCase())) warnings.push("CALLER_OWNERSHIP_GUARD_DEFERRED_TO_P0.11");
      else failures.push("NO_RPC_AUTHORIZATION_GUARD_DETECTED");
    }
  }

  if (group.kind === "bucket" && migrationObject?.migrations?.length) {
    for (const operation of requiredOps) {
      const allows = (migrationObject.policies || []).some((policy) => !policy.deny && (policy.command === operation || policy.command === "ALL"));
      if (!allows) failures.push(`NO_${operation}_STORAGE_AUTHORIZATION_RULE`);
    }
  }

  return {
    failures: [...new Set(failures)],
    warnings: [...new Set(warnings)],
    requiredOps,
  };
}

function groupReferences(references) {
  const groups = new Map();
  for (const ref of references) {
    const key = objectKey(ref.kind, ref.schema, ref.name);
    if (!groups.has(key)) groups.set(key, { key, kind: ref.kind, schema: ref.schema, name: ref.name, references: [] });
    groups.get(key).references.push(ref);
  }
  return [...groups.values()].sort((a, b) => stableCodePointCompare(`${a.kind}:${a.schema}.${a.name}`, `${b.kind}:${b.schema}.${b.name}`));
}

function sqlLiteral(value) {
  return String(value).replaceAll("'", "''");
}

function pgText(value) {
  return `'${sqlLiteral(value)}'`;
}

function relationAuthorizationExpression(row) {
  const schema = pgText(row.schema);
  const name = pgText(row.object_name);
  if (row.relation_kind === "view") {
    return `exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = ${schema}
      and c.relname = ${name}
      and c.relkind = 'v'
      and coalesce(c.reloptions, array[]::text[]) @> array['security_invoker=true']::text[]
  )`;
  }

  const policyChecks = row.required_operations
    .split("|")
    .filter(Boolean)
    .map((operation) => `exists (
      select 1
      from pg_policies
      where schemaname = ${schema}
        and tablename = ${name}
        and cmd in (${pgText(operation)}, 'ALL')
        and coalesce(qual, '') !~* '^\\s*false\\s*$'
        and coalesce(with_check, '') !~* '^\\s*false\\s*$'
    )`);

  if (!policyChecks.length) {
    policyChecks.push(`exists (
      select 1
      from pg_policies
      where schemaname = ${schema}
        and tablename = ${name}
    )`);
  }

  return `exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = ${schema}
      and c.relname = ${name}
      and c.relkind in ('r', 'p')
      and c.relrowsecurity
  )
  and ${policyChecks.join("\n  and ")}`;
}

function rpcAuthorizationExpression(row, config) {
  const publicRpcs = new Set((config.publicSupplierRpcs || []).map((name) => name.toLowerCase()));
  const expectedRole = publicRpcs.has(row.object_name.toLowerCase()) ? "anon" : "authenticated";
  return `exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = ${pgText(row.schema)}
      and p.proname = ${pgText(row.object_name)}
      and has_function_privilege(${pgText(expectedRole)}, p.oid, 'EXECUTE')
  )`;
}

function bucketAuthorizationExpression(row) {
  const checks = row.required_operations
    .split("|")
    .filter(Boolean)
    .map((operation) => `exists (
      select 1
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and cmd in (${pgText(operation)}, 'ALL')
        and (coalesce(qual, '') like '%${sqlLiteral(row.object_name)}%' or coalesce(with_check, '') like '%${sqlLiteral(row.object_name)}%')
    )`);
  return `exists (select 1 from storage.buckets where id = ${pgText(row.object_name)})${checks.length ? `\n  and ${checks.join("\n  and ")}` : ""}`;
}

function generateAuthorizationTestSql(rows, config) {
  const assertions = rows.map((row) => {
    let expression;
    if (row.object_type === "relation") expression = relationAuthorizationExpression(row);
    else if (row.object_type === "rpc") expression = rpcAuthorizationExpression(row, config);
    else expression = bucketAuthorizationExpression(row);
    const label = `${row.test_id} ${row.object_type}:${row.schema}.${row.object_name} authorization mapping`;
    return `-- P0.9-AUTH: ${row.test_id}\nselect ok(\n  ${expression},\n  ${pgText(label)}\n);`;
  });

  return `-- Generated by scripts/reconcile-db-objects.mjs for the P0.13 quality gate
-- One authorization assertion for every application-referenced database object.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(${rows.length});

${assertions.join("\n\n")}

select * from finish();
rollback;
`;
}

function writeCsv(filePath, rows) {
  const headers = [
    "object_type", "relation_kind", "schema", "object_name", "source_operations", "source_references",
    "source_contexts", "migration_status", "migration_file", "migration_line", "rls_or_authorization_rule",
    "owner", "authorization_test", "test_id", "required_operations", "authorization_alignment_status",
    "authorization_findings", "status", "failure_reasons", "notes",
  ];
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) lines.push(headers.map((header) => csvCell(row[header])).join(","));
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

export function reconcile(projectRoot, config, outputDir) {
  const source = scanSourceReferences(projectRoot, config);
  const migrations = parseMigrations(projectRoot, config);
  const groups = groupReferences(source.references);
  const generatedTestRelative = normalizeSlashes(config.generatedAuthorizationTest || "supabase/tests/p0.9_referenced_object_authorization_test.sql");
  const generatedTestAbsolute = path.join(projectRoot, generatedTestRelative);

  let testCounter = 0;
  const rows = groups.map((group) => {
    const migrationObject = migrations.objects.get(group.key);
    const evaluation = evaluateObject(group, migrationObject, config);
    testCounter += 1;
    const sourceOperations = [...new Set(group.references.flatMap((ref) => ref.operations))].sort();
    const contexts = [...new Set(group.references.map((ref) => ref.context))].sort();
    const migrationLocations = migrationObject?.migrations || [];
    const notes = [];
    if (group.references.some((ref) => ref.dynamic)) notes.push("dynamic argument resolved to a versioned fallback");
    if (group.references.some((ref) => ref.context === "edge-service-role")) notes.push("service-role source calls are mapped to the Edge Function caller gate");
    if (group.kind === "relation" && migrationObject?.kind === "view") notes.push("view authorization must be inherited from controlled underlying relations");

    const authRule = group.kind === "rpc"
      ? authorizationRuleForRpc(migrationObject)
      : group.kind === "bucket"
        ? authorizationRuleForBucket(migrationObject)
        : authorizationRuleForRelation(migrationObject, group.references);

    return {
      object_type: group.kind,
      relation_kind: migrationObject?.kind || (group.kind === "relation" ? "unknown" : group.kind),
      schema: group.schema,
      object_name: group.name,
      source_operations: sourceOperations.join("|"),
      source_references: group.references.map((ref) => `${ref.sourceFile}:${ref.line}`).sort().join(" | "),
      source_contexts: contexts.join("|"),
      migration_status: migrationLocations.length ? "FOUND" : "MISSING",
      migration_file: migrationLocations.map((m) => m.file).join(" | "),
      migration_line: migrationLocations.map((m) => m.line).join(" | "),
      rls_or_authorization_rule: authRule,
      owner: migrationObject?.owner || "MISSING",
      authorization_test: generatedTestRelative,
      test_id: `P0.9-AUTH-${String(testCounter).padStart(3, "0")}`,
      required_operations: evaluation.requiredOps.join("|"),
      authorization_alignment_status: evaluation.warnings.length ? "WARNING" : "PASS",
      authorization_findings: evaluation.warnings.join("|"),
      status: evaluation.failures.length ? "FAIL" : "PASS",
      failure_reasons: evaluation.failures.join("|"),
      notes: notes.join("; "),
    };
  });

  ensureDir(outputDir);
  ensureDir(path.dirname(generatedTestAbsolute));
  const generatedAuthorizationTestChanged = writeCanonicalGeneratedFile(
    generatedTestAbsolute,
    generateAuthorizationTestSql(rows, config),
  );
  writeCsv(path.join(outputDir, "db-object-map.csv"), rows);
  fs.writeFileSync(path.join(outputDir, "source-references.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), references: source.references, unresolved: source.unresolved }, null, 2)}\n`, "utf8");

  const failed = rows.filter((row) => row.status === "FAIL");
  const missing = rows.filter((row) => row.failure_reasons.includes("MISSING_MIGRATION"));
  const warned = rows.filter((row) => row.authorization_alignment_status === "WARNING");
  const summary = {
    task: "P0.9 Reconcile source references against database objects",
    generatedAt: new Date().toISOString(),
    projectRoot: normalizeSlashes(projectRoot),
    sourceFileCount: new Set(source.references.map((ref) => ref.sourceFile)).size,
    sourceReferenceCount: source.references.length,
    uniqueObjectCount: rows.length,
    relationCount: rows.filter((row) => row.object_type === "relation").length,
    rpcCount: rows.filter((row) => row.object_type === "rpc").length,
    bucketCount: rows.filter((row) => row.object_type === "bucket").length,
    migrationFileCount: migrations.files.length,
    unresolvedReferenceCount: source.unresolved.length,
    passedObjectCount: rows.length - failed.length,
    failedObjectCount: failed.length,
    missingMigrationCount: missing.length,
    authorizationWarningCount: warned.length,
    pass: failed.length === 0 && source.unresolved.length === 0,
    failures: failed.map((row) => ({ object: `${row.object_type}:${row.schema}.${row.object_name}`, reasons: row.failure_reasons.split("|") })),
    authorizationWarnings: warned.map((row) => ({ object: `${row.object_type}:${row.schema}.${row.object_name}`, findings: row.authorization_findings.split("|") })),
    unresolvedReferences: source.unresolved,
  };
  fs.writeFileSync(path.join(outputDir, "P0.9-verification.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    path.join(outputDir, "missing-db-objects.txt"),
    `${missing.map((row) => `${row.object_type}:${row.schema}.${row.object_name}`).join("\n")}${missing.length ? "\n" : ""}`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(outputDir, "failed-db-object-controls.txt"),
    `${failed.map((row) => `${row.object_type}:${row.schema}.${row.object_name}=${row.failure_reasons}`).join("\n")}${failed.length ? "\n" : ""}`,
    "utf8",
  );

  return { summary, rows, source, migrations, generatedTestRelative, generatedAuthorizationTestChanged };
}

function printSummary(result) {
  const { summary } = result;
  console.log(`TASK=${summary.task}`);
  console.log(`SOURCE_REFERENCE_COUNT=${summary.sourceReferenceCount}`);
  console.log(`UNIQUE_OBJECT_COUNT=${summary.uniqueObjectCount}`);
  console.log(`RELATION_COUNT=${summary.relationCount}`);
  console.log(`RPC_COUNT=${summary.rpcCount}`);
  console.log(`BUCKET_COUNT=${summary.bucketCount}`);
  console.log(`MIGRATION_FILE_COUNT=${summary.migrationFileCount}`);
  console.log(`UNRESOLVED_REFERENCE_COUNT=${summary.unresolvedReferenceCount}`);
  console.log(`PASSED_OBJECT_COUNT=${summary.passedObjectCount}`);
  console.log(`FAILED_OBJECT_COUNT=${summary.failedObjectCount}`);
  console.log(`MISSING_MIGRATION_COUNT=${summary.missingMigrationCount}`);
  console.log(`AUTHORIZATION_WARNING_COUNT=${summary.authorizationWarningCount}`);
  console.log(`PASS=${summary.pass ? "TRUE" : "FALSE"}`);
  if (!summary.pass) {
    for (const failure of summary.failures) console.log(`FAILURE=${failure.object}:${failure.reasons.join(",")}`);
    for (const unresolved of summary.unresolvedReferences) console.log(`UNRESOLVED=${unresolved.sourceFile}:${unresolved.line}:${unresolved.expression}`);
  }
  for (const warning of summary.authorizationWarnings) console.log(`WARNING=${warning.object}:${warning.findings.join(",")}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("Usage: node reconcile-db-objects.mjs --project-root <path> [--config <json>] [--output-dir <path>] [--strict]");
    return;
  }
  if (!fs.existsSync(args.config)) throw new Error(`Config not found: ${args.config}`);
  const config = readJson(args.config);
  const outputDir = path.resolve(args.outputDir || path.join(args.projectRoot, config.evidenceDir || "Development/P0.9/evidence"));
  const result = reconcile(args.projectRoot, config, outputDir);
  if (!args.quiet) printSummary(result);
  if (args.strict && !result.summary.pass) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`FATAL=${error?.stack || error}`);
    process.exitCode = 2;
  });
}
