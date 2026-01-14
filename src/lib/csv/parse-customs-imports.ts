// FILE: C:\Users\redfi\eu-cbam-reporter\marketing\src\lib\csv\parse-customs-imports.ts
/* eslint-disable no-control-regex */

export type CustomsImportRow = {
  import_ref: string | null
  import_date: string | null
  supplier_name: string | null
  supplier_country: string | null
  product_sku: string
  product_description: string | null
  cn_code: string
  quantity: number | null
  net_mass_kg: number | null
  customs_value_eur: number | null
  country_of_origin: string | null
  procedure_code: string | null
}

export type CustomsImportParseErrorCode =
  | "MISSING_COLUMN"
  | "MISSING_REQUIRED"
  | "INVALID_CN_CODE"
  | "INVALID_ISO2"
  | "INVALID_NUMBER"
  | "INVALID_DATE"
  | "EMPTY_FILE"
  | "CSV_PARSE_ERROR"

export type CustomsImportParseError = {
  code: CustomsImportParseErrorCode
  message: string
  rowNumber?: number // 1-based data row index (excluding header)
  column?: keyof CustomsImportRow | string
  value?: string
}

export type ParseCustomsImportsResult = {
  rows: CustomsImportRow[]
  errors: CustomsImportParseError[]
  header: string[]
}

const REQUIRED_COLUMNS = ["product_sku", "cn_code"] as const

const ALL_COLUMNS = [
  "import_ref",
  "import_date",
  "supplier_name",
  "supplier_country",
  "product_sku",
  "product_description",
  "cn_code",
  "quantity",
  "net_mass_kg",
  "customs_value_eur",
  "country_of_origin",
  "procedure_code",
] as const

function normalizeHeaderCell(s: string): string {
  return s.trim().toLowerCase()
}

function toNullIfEmpty(s: string | undefined): string | null {
  if (s == null) return null
  const v = s.trim()
  return v === "" ? null : v
}

function parseNumberNullable(raw: string | null | undefined, col: string, rowNumber: number, errors: CustomsImportParseError[]): number | null {
  const v = toNullIfEmpty(raw ?? "")
  if (v === null) return null
  const n = Number(v.replace(/,/g, ""))
  if (!Number.isFinite(n)) {
    errors.push({
      code: "INVALID_NUMBER",
      message: `Invalid number for ${col}`,
      rowNumber,
      column: col,
      value: v,
    })
    return null
  }
  return n
}

function parseDateNullable(raw: string | null | undefined, col: string, rowNumber: number, errors: CustomsImportParseError[]): string | null {
  const v = toNullIfEmpty(raw ?? "")
  if (v === null) return null

  // Accept YYYY-MM-DD only (data type declared as date)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    errors.push({
      code: "INVALID_DATE",
      message: `Invalid date for ${col} (expected YYYY-MM-DD)`,
      rowNumber,
      column: col,
      value: v,
    })
    return null
  }
  return v
}

function normalizeIso2Nullable(raw: string | null | undefined, col: string, rowNumber: number, errors: CustomsImportParseError[]): string | null {
  const v = toNullIfEmpty(raw ?? "")
  if (v === null) return null
  const iso2 = v.toUpperCase()
  if (!/^[A-Z]{2}$/.test(iso2)) {
    errors.push({
      code: "INVALID_ISO2",
      message: `Invalid ISO-2 country code for ${col}`,
      rowNumber,
      column: col,
      value: v,
    })
    return null
  }
  return iso2
}

function normalizeCnCode(raw: string | null | undefined, rowNumber: number, errors: CustomsImportParseError[]): string {
  const v = (raw ?? "").trim()
  if (v === "") return ""
  const digits = v.replace(/\s+/g, "")
  if (!/^\d{6,8}$/.test(digits)) {
    errors.push({
      code: "INVALID_CN_CODE",
      message: "CN code must be 6-8 digits",
      rowNumber,
      column: "cn_code",
      value: v,
    })
    return ""
  }
  return digits
}

function requireText(raw: string | null | undefined, col: keyof CustomsImportRow, rowNumber: number, errors: CustomsImportParseError[]): string {
  const v = (raw ?? "").trim()
  if (v === "") {
    errors.push({
      code: "MISSING_REQUIRED",
      message: `Missing required field: ${col}`,
      rowNumber,
      column: col,
      value: raw ?? "",
    })
    return ""
  }
  return v
}

/**
 * Minimal CSV parser (RFC4180-ish): handles commas, quotes, CRLF/LF, escaped quotes ("").
 * No external deps. Suitable for client-side parsing of typical customs exports.
 */
function parseCsvText(csvText: string): { header: string[]; data: string[][]; errors: string[] } {
  const errors: string[] = []
  const text = csvText.replace(/^\uFEFF/, "") // strip BOM
  if (text.trim() === "") {
    return { header: [], data: [], errors: ["EMPTY_FILE"] }
  }

  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = i + 1 < text.length ? text[i + 1] : ""

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cell += ch
      }
      continue
    }

    if (ch === '"') {
      inQuotes = true
      continue
    }

    if (ch === ",") {
      row.push(cell)
      cell = ""
      continue
    }

    if (ch === "\r" && next === "\n") {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
      i++
      continue
    }

    if (ch === "\n") {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
      continue
    }

    cell += ch
  }

  // flush last cell
  row.push(cell)
  rows.push(row)

  if (inQuotes) {
    errors.push("Unclosed quote in CSV")
  }

  const header = rows.length > 0 ? rows[0] : []
  const data = rows.length > 1 ? rows.slice(1) : []
  return { header, data, errors }
}

export function parseCustomsImportsCsv(csvText: string): ParseCustomsImportsResult {
  const errors: CustomsImportParseError[] = []
  const parsed = parseCsvText(csvText)

  if (parsed.errors.length > 0) {
    for (const e of parsed.errors) {
      errors.push({ code: e === "EMPTY_FILE" ? "EMPTY_FILE" : "CSV_PARSE_ERROR", message: String(e) })
    }
    return { rows: [], errors, header: [] }
  }

  const rawHeader = parsed.header.map((h) => h ?? "")
  const normHeader = rawHeader.map(normalizeHeaderCell)

  // Build column map: normalized -> index
  const colIndex = new Map<string, number>()
  normHeader.forEach((h, idx) => {
    if (h !== "" && !colIndex.has(h)) colIndex.set(h, idx)
  })

  for (const col of REQUIRED_COLUMNS) {
    if (!colIndex.has(col)) {
      errors.push({
        code: "MISSING_COLUMN",
        message: `Missing required column: ${col}`,
        column: col,
      })
    }
  }

  if (errors.some((e) => e.code === "MISSING_COLUMN")) {
    return { rows: [], errors, header: rawHeader }
  }

  const rows: CustomsImportRow[] = []

  for (let r = 0; r < parsed.data.length; r++) {
    const rowNumber = r + 1
    const cells = parsed.data[r]

    const get = (col: typeof ALL_COLUMNS[number]): string | null => {
      const idx = colIndex.get(col)
      if (idx == null) return null
      return cells[idx] ?? null
    }

    const product_sku = requireText(get("product_sku"), "product_sku", rowNumber, errors)
    const cn_code = normalizeCnCode(get("cn_code"), rowNumber, errors)
    const supplier_country = normalizeIso2Nullable(get("supplier_country"), "supplier_country", rowNumber, errors)
    const country_of_origin = normalizeIso2Nullable(get("country_of_origin"), "country_of_origin", rowNumber, errors)

    const rowObj: CustomsImportRow = {
      import_ref: toNullIfEmpty(get("import_ref") ?? ""),
      import_date: parseDateNullable(get("import_date"), "import_date", rowNumber, errors),
      supplier_name: toNullIfEmpty(get("supplier_name") ?? ""),
      supplier_country,
      product_sku,
      product_description: toNullIfEmpty(get("product_description") ?? ""),
      cn_code,
      quantity: parseNumberNullable(get("quantity"), "quantity", rowNumber, errors),
      net_mass_kg: parseNumberNullable(get("net_mass_kg"), "net_mass_kg", rowNumber, errors),
      customs_value_eur: parseNumberNullable(get("customs_value_eur"), "customs_value_eur", rowNumber, errors),
      country_of_origin,
      procedure_code: toNullIfEmpty(get("procedure_code") ?? ""),
    }

    rows.push(rowObj)
  }

  return { rows, errors, header: rawHeader }
}
// FILE: C:\Users\redfi\eu-cbam-reporter\marketing\src\lib\csv\parse-customs-imports.ts
