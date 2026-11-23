const MAX_TEXT_CHARACTERS = 32_000;

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  let afterQuote = false;
  const source = String(text ?? "").replace(/^\uFEFF/, "");

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (inQuotes) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
          afterQuote = true;
        }
      } else {
        cell += character;
      }
      continue;
    }

    if (afterQuote && (character === " " || character === "\t")) continue;
    if (afterQuote && character !== "," && character !== "\r" && character !== "\n") {
      throw new Error("Unexpected characters after a quoted CSV field.");
    }
    if (character === '"' && cell.length === 0 && !afterQuote) {
      inQuotes = true;
    } else if (character === '"' && !afterQuote) {
      throw new Error("A quote inside an unquoted CSV field must be escaped by quoting the whole field.");
    } else if (character === ",") {
      row.push(cell);
      cell = "";
      afterQuote = false;
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      afterQuote = false;
    } else {
      cell += character;
      afterQuote = false;
    }
  }

  if (inQuotes) throw new Error("The CSV has an opening quote with no matching closing quote.");
  if (cell.length || row.length || afterQuote) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((item) => !(item.length === 1 && item[0] === ""));
}

function toCsv(rows) {
  return rows.map((row) => row.map((value) => {
    let text = String(value ?? "");
    const trimmed = text.trim();
    const numeric = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed);
    if (/^\s*[=+@]/.test(text) || (/^\s*-/.test(text) && !numeric)) text = "'" + text;
    return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }).join(",")).join("\r\n");
}

function convertUnit(value, category, from, to) {
  if (String(value ?? "").trim() === "") throw new Error("Enter a number.");
  const amount = Number(value);
  if (!Number.isFinite(amount)) throw new Error("Enter a valid number.");

  const units = {
    length: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 },
    weight: { mg: 0.000001, g: 0.001, kg: 1, oz: 0.028349523125, lb: 0.45359237 },
    time: { ms: 0.001, sec: 1, min: 60, hr: 3600, day: 86400 }
  };

  if (category === "temperature") {
    const toC = { C: (number) => number, F: (number) => (number - 32) * 5 / 9, K: (number) => number - 273.15 };
    const fromC = { C: (number) => number, F: (number) => number * 9 / 5 + 32, K: (number) => number + 273.15 };
    if (!toC[from] || !fromC[to]) throw new Error("Choose valid temperature units.");
    const celsius = toC[from](amount);
    if (celsius < -273.15) throw new Error("Temperature cannot be below absolute zero.");
    return fromC[to](celsius);
  }

  const table = units[category];
  if (!table || !(from in table) || !(to in table)) throw new Error("Choose compatible units.");
  return amount * table[from] / table[to];
}

function convertCase(text, mode) {
  const value = String(text ?? "");
  if (mode === "upper") return value.toLocaleUpperCase();
  if (mode === "lower") return value.toLocaleLowerCase();
  if (mode === "title") {
    return value.toLocaleLowerCase().replace(/(^|[\s([{])([\p{L}\p{N}])/gu,
      (_, prefix, character) => prefix + character.toLocaleUpperCase());
  }
  if (mode === "sentence") {
    return value.toLocaleLowerCase().replace(/(^\s*[\p{L}]|[.!?]\s+[\p{L}])/gu,
      (part) => part.toLocaleUpperCase());
  }
  if (mode === "clean") {
    return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).join("\n");
  }
  if (mode === "unique") {
    return [...new Set(value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))].join("\n");
  }
  throw new Error("Unknown text operation.");
}

function textStatistics(text) {
  const value = String(text ?? "");
  const words = value.trim() ? value.trim().split(/\s+/u).length : 0;
  return {
    characters: Array.from(value).length,
    charactersWithoutSpaces: Array.from(value.replace(/\s/gu, "")).length,
    words,
    lines: value.length ? value.split(/\r\n|\r|\n/).length : 0
  };
}

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return btoa(binary);
}

function decodeBase64(value) {
  const compact = value.replace(/\s+/g, "");
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(compact)) {
    throw new Error("Enter valid Base64 text.");
  }
  const binary = atob(compact);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function csvToJson(value) {
  const rows = parseCsv(value);
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.trim());
  if (headers.some((header) => !header)) throw new Error("The first CSV row must contain a name for every column.");
  if (new Set(headers).size !== headers.length) throw new Error("The CSV contains duplicate column names.");

  return rows.slice(1).map((row, index) => {
    if (row.length > headers.length) throw new Error("CSV row " + (index + 2) + " has more values than the header row.");
    return Object.fromEntries(headers.map((header, column) => [header, row[column] ?? ""]));
  });
}

function jsonToCsv(value) {
  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed)) throw new Error("JSON to CSV expects an array of rows or an array of objects.");
  if (!parsed.length) return "";

  const cell = (item) => item === null || item === undefined
    ? ""
    : typeof item === "object" ? JSON.stringify(item) : String(item);

  if (parsed.every(Array.isArray)) return toCsv(parsed.map((row) => row.map(cell)));
  if (parsed.every((row) => row && typeof row === "object" && !Array.isArray(row))) {
    const headers = [...new Set(parsed.flatMap((row) => Object.keys(row)))];
    if (!headers.length) throw new Error("The JSON objects do not contain any columns.");
    return toCsv([headers, ...parsed.map((row) => headers.map((header) => cell(row[header])))]);
  }
  throw new Error("JSON to CSV expects an array of rows or an array of objects, not a mixture.");
}

function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function makeLink(input, labelInput = "") {
  const source = String(input ?? "").trim();
  if (!source) throw new Error("Enter a website URL.");
  if (source.length > 2048) throw new Error("The website URL must be 2,048 characters or fewer.");
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(source) ? source : "https://" + source;
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("Enter a valid website address, such as https://example.com.");
  }
  if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname) {
    throw new Error("Only HTTP and HTTPS website addresses are allowed.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Website links containing embedded usernames or passwords are not allowed.");
  }
  const url = parsed.href;
  const label = String(labelInput ?? "").trim() || parsed.hostname;
  if (label.length > 300) throw new Error("Link text must be 300 characters or fewer.");
  const markdownLabel = label.replace(/\\/g, "\\\\").replace(/\]/g, "\\]");
  const markdownUrl = url.replace(/\)/g, "%29");
  return [
    "Markdown link:",
    "[" + markdownLabel + "](" + markdownUrl + ")",
    "",
    "HTML hyperlink:",
    '<a href="' + escapeHtml(url) + '" rel="noopener noreferrer">' + escapeHtml(label) + "</a>"
  ].join("\n");
}

export function runTextTool(operation, input, extra = "", options = {}) {
  const value = String(input ?? "");
  const extraValue = String(extra ?? "");
  if (value.length > MAX_TEXT_CHARACTERS || extraValue.length > MAX_TEXT_CHARACTERS) {
    throw new Error("Each text field is limited to 32,000 characters for remote processing.");
  }

  switch (operation) {
    case "link-make":
      return makeLink(value, extraValue);
    case "upper":
    case "lower":
    case "title":
    case "sentence":
    case "clean":
    case "unique":
      return convertCase(value, operation);
    case "stats": {
      const stats = textStatistics(value);
      return [
        "Characters: " + stats.characters,
        "Characters without spaces: " + stats.charactersWithoutSpaces,
        "Words: " + stats.words,
        "Lines: " + stats.lines
      ].join("\n");
    }
    case "json-format":
      return JSON.stringify(JSON.parse(value), null, 2);
    case "json-validate":
      JSON.parse(value);
      return "Valid JSON.";
    case "csv-json":
      return JSON.stringify(csvToJson(value), null, 2);
    case "json-csv":
      return jsonToCsv(value);
    case "url-encode":
      return encodeURIComponent(value);
    case "url-decode":
      try { return decodeURIComponent(value); }
      catch { throw new Error("The text contains an invalid URL-encoded sequence."); }
    case "base64-encode":
      return encodeBase64(value);
    case "base64-decode":
      return decodeBase64(value);
    case "percent-of": {
      if (!value.trim() || !extraValue.trim()) throw new Error("Enter a percentage and a number.");
      const percent = Number(value);
      const number = Number(extraValue);
      if (!Number.isFinite(percent) || !Number.isFinite(number)) throw new Error("Enter a percentage and a number.");
      return String(percent / 100 * number);
    }
    case "percent-change": {
      if (!value.trim() || !extraValue.trim()) throw new Error("Enter both the starting value and the new value.");
      const oldValue = Number(value);
      const newValue = Number(extraValue);
      if (!Number.isFinite(oldValue) || !Number.isFinite(newValue) || oldValue === 0) {
        throw new Error("Enter valid numbers. The starting value cannot be zero.");
      }
      return ((newValue - oldValue) / oldValue * 100).toFixed(4).replace(/\.?0+$/, "") + "%";
    }
    case "unit-convert": {
      const result = convertUnit(value, options.category, options.from, options.to);
      return String(Number(result.toPrecision(12)));
    }
    default:
      throw new Error("Choose a supported text or data operation.");
  }
}
