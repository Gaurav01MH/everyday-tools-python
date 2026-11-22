import {
  convertCase, convertUnit, parseCsv, textStatistics, toCsv, MAX_TEXT_CHARACTERS
} from "./core.js";

function decodeBase64(text) {
  const normalized = String(text ?? "").replace(/\s+/g, "");
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(normalized)) {
    throw new Error("Enter valid Base64 text.");
  }
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function encodeBase64(text) {
  const bytes = new TextEncoder().encode(text);
  const chunks = [];
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + chunkSize)));
  }
  return btoa(chunks.join(""));
}

export function runTextTool(operation, input, extra, options = {}) {
  const value = String(input ?? "");
  if (value.length > MAX_TEXT_CHARACTERS || String(extra ?? "").length > MAX_TEXT_CHARACTERS) {
    throw new Error("Text input is too large. Keep each field under 2 million characters.");
  }
  switch (operation) {
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
        `Characters: ${stats.characters}`,
        `Characters without spaces: ${stats.charactersWithoutSpaces}`,
        `Words: ${stats.words}`,
        `Lines: ${stats.lines}`
      ].join("\n");
    }
    case "json-format":
      return JSON.stringify(JSON.parse(value), null, 2);
    case "json-validate":
      JSON.parse(value);
      return "Valid JSON.";
    case "csv-json":
      return JSON.stringify(parseCsv(value), null, 2);
    case "json-csv": {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed) || parsed.some((row) => !Array.isArray(row))) {
        throw new Error("JSON to CSV expects an array of arrays.");
      }
      return toCsv(parsed);
    }
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
      const percent = Number(value);
      const number = Number(extra);
      if (!Number.isFinite(percent) || !Number.isFinite(number)) throw new Error("Enter a percentage and a number.");
      return String(percent / 100 * number);
    }
    case "percent-change": {
      const oldValue = Number(value);
      const newValue = Number(extra);
      if (!Number.isFinite(oldValue) || !Number.isFinite(newValue) || oldValue === 0) {
        throw new Error("Enter valid numbers. The starting value cannot be zero.");
      }
      const change = ((newValue - oldValue) / Math.abs(oldValue)) * 100;
      return `${change.toFixed(4).replace(/\.?0+$/, "")}%`;
    }
    case "unit-convert": {
      const number = Number(value);
      const result = convertUnit(number, options.category, options.from, options.to);
      return String(Number(result.toPrecision(12)));
    }
    default:
      throw new Error("Choose a valid text or data operation.");
  }
}
