export const MAX_FILES = 20;
export const MAX_TOTAL_BYTES = 100 * 1024 * 1024;
export const MAX_PDF_PAGES = 250;
export const MAX_IMAGE_PIXELS = 16_000_000;
export const MAX_TEXT_CHARACTERS = 2_000_000;
export const MAX_SINGLE_PDF_BYTES = 50 * 1024 * 1024;
export const MAX_TOTAL_OUTPUT_BYTES = 100 * 1024 * 1024;

export function assertInputFiles(files, { min = 1, max = MAX_FILES, totalBytes = MAX_TOTAL_BYTES } = {}) {
  if (!Array.isArray(files) || files.length < min) {
    throw new Error("Choose at least " + min + " file" + (min === 1 ? "" : "s") + ".");
  }
  if (files.length > max) {
    throw new Error("Choose no more than " + max + " files at a time.");
  }
  const bytes = files.reduce((sum, file) => sum + file.size, 0);
  if (bytes > totalBytes) {
    throw new Error("The selected files are too large for safe browser processing. Keep the total under 100 MB.");
  }
  for (const file of files) {
    if (!file || typeof file.arrayBuffer !== "function" || file.size <= 0) {
      throw new Error("One of the selected files is empty or unreadable.");
    }
  }
  return true;
}

export function parsePageSelection(input, pageCount) {
  const value = String(input ?? "").trim();
  if (!Number.isInteger(pageCount) || pageCount < 1) throw new Error("The PDF has no readable pages.");
  if (!value || value.toLowerCase() === "all") return Array.from({ length: pageCount }, (_, i) => i);

  const result = [];
  const seen = new Set();
  const pieces = value.split(",");
  for (const piece of pieces) {
    const token = piece.trim();
    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(token);
    if (!match) throw new Error('Invalid page selection: "' + token + '". Use numbers and ranges such as 1, 3-5.');
    const first = Number(match[1]);
    const last = match[2] ? Number(match[2]) : first;
    if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last) || first < 1 || last < first || last > pageCount) {
      throw new Error('Page range "' + token + '" is outside this PDF. It has ' + pageCount + " pages.");
    }
    for (let page = first; page <= last; page += 1) {
      if (seen.has(page)) throw new Error("Page " + page + " appears more than once.");
      seen.add(page);
      result.push(page - 1);
    }
  }
  if (!result.length) throw new Error("Choose at least one page.");
  return result;
}

export function safeFilename(name, fallback = "everyday-tools") {
  const last = String(name ?? "").split(/[\\/]/).pop() || fallback;
  const stem = last.replace(/\.[^.]*$/, "").normalize("NFKC")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/[. ]+$/g, "").trim().slice(0, 90);
  return stem || fallback;
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "Unknown size";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  let afterQuote = false;
  const source = String(text ?? "").replace(/^\uFEFF/, "");

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
          afterQuote = true;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (afterQuote && (char === " " || char === "\t")) continue;
    if (afterQuote && char !== "," && char !== "\r" && char !== "\n") {
      throw new Error("Unexpected characters after a quoted CSV field.");
    }
    if (char === '"' && cell.length === 0 && !afterQuote) {
      inQuotes = true;
    } else if (char === '"' && !afterQuote) {
      throw new Error("A quote inside an unquoted CSV field must be escaped by quoting the whole field.");
    } else if (char === ",") {
      row.push(cell);
      cell = "";
      afterQuote = false;
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      afterQuote = false;
    } else {
      cell += char;
      afterQuote = false;
    }
  }
  if (inQuotes) throw new Error("The CSV has an opening quote with no matching closing quote.");
  if (cell.length || row.length || afterQuote) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

export function toCsv(rows) {
  if (!Array.isArray(rows)) throw new TypeError("Rows must be an array.");
  return rows.map((row) => row.map((value) => {
    let text = String(value ?? "");
    // Prefix spreadsheet-formula-like cells so opening exported CSVs is safer.
    if (/^\s*[=+@\-]/.test(text)) text = "'" + text;
    return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }).join(",")).join("\r\n");
}

export function convertUnit(value, category, from, to) {
  if (String(value ?? "").trim() === "") throw new Error("Enter a number.");
  const amount = Number(value);
  if (!Number.isFinite(amount)) throw new Error("Enter a valid number.");

  const units = {
    length: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 },
    weight: { mg: 0.000001, g: 0.001, kg: 1, oz: 0.028349523125, lb: 0.45359237 },
    time: { ms: 0.001, sec: 1, min: 60, hr: 3600, day: 86400 }
  };
  if (category === "temperature") {
    const toC = {
      C: (n) => n,
      F: (n) => (n - 32) * 5 / 9,
      K: (n) => n - 273.15
    };
    const fromC = {
      C: (n) => n,
      F: (n) => n * 9 / 5 + 32,
      K: (n) => n + 273.15
    };
    if (!toC[from] || !fromC[to]) throw new Error("Choose valid temperature units.");
    const celsius = toC[from](amount);
    if (celsius < -273.15) throw new Error("Temperature cannot be below absolute zero.");
    return fromC[to](celsius);
  }

  const table = units[category];
  if (!table || !(from in table) || !(to in table)) throw new Error("Choose compatible units.");
  return amount * table[from] / table[to];
}

export function convertCase(text, mode) {
  const value = String(text ?? "");
  if (mode === "upper") return value.toLocaleUpperCase();
  if (mode === "lower") return value.toLocaleLowerCase();
  if (mode === "title") return value.toLocaleLowerCase().replace(/(^|[\s([{])([\p{L}\p{N}])/gu, (_, prefix, letter) => prefix + letter.toLocaleUpperCase());
  if (mode === "sentence") return value.toLocaleLowerCase().replace(/(^\s*[\p{L}]|[.!?]\s+[\p{L}])/gu, (part) => part.toLocaleUpperCase());
  if (mode === "clean") return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).join("\n");
  if (mode === "unique") return [...new Set(value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))].join("\n");
  throw new Error("Unknown text operation.");
}

export function textStatistics(text) {
  const value = String(text ?? "");
  const words = value.trim() ? value.trim().split(/\s+/u).length : 0;
  return {
    characters: Array.from(value).length,
    charactersWithoutSpaces: Array.from(value.replace(/\s/gu, "")).length,
    words,
    lines: value.length ? value.split(/\r\n|\r|\n/).length : 0
  };
}
