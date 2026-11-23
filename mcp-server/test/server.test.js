import test from "node:test";
import assert from "node:assert/strict";
import { TOOL_CATALOG } from "../src/catalog.js";
import { runTextTool } from "../src/text-tools.js";
import { TOOL_CATALOG as SITE_TOOL_CATALOG } from "../../web/src/lib/tool-catalog.js";

test("MCP tool catalogue is derived from the website's current catalogue", () => {
  assert.equal(TOOL_CATALOG.length, SITE_TOOL_CATALOG.length);
  assert.deepEqual(
    TOOL_CATALOG.map((tool) => tool.slug),
    SITE_TOOL_CATALOG.map((tool) => tool.slug)
  );
});

test("the catalogue has all three expected categories", () => {
  assert.deepEqual(
    [...new Set(TOOL_CATALOG.map((tool) => tool.category))].sort(),
    ["images", "pdf", "text"]
  );
  assert.equal(new Set(TOOL_CATALOG.map((tool) => tool.slug)).size, TOOL_CATALOG.length);
  assert.equal(TOOL_CATALOG.length, 27);
});

test("text transforms run correctly", () => {
  assert.equal(runTextTool("upper", "Files Format"), "FILES FORMAT");
  assert.equal(runTextTool("lower", "HELLO"), "hello");
  assert.equal(runTextTool("title", "hello world"), "Hello World");
  assert.equal(runTextTool("sentence", "hello. WORLD"), "Hello. World");
  assert.equal(runTextTool("clean", " a \n\n b "), "a\nb");
  assert.equal(runTextTool("unique", "a\na\nb"), "a\nb");
});

test("statistics count Unicode characters, words and lines", () => {
  assert.equal(
    runTextTool("stats", "Hi 🌍\nthere"),
    "Characters: 10\nCharacters without spaces: 8\nWords: 3\nLines: 2"
  );
});

test("JSON formatting and validation", () => {
  assert.equal(runTextTool("json-format", '{"ok":true}'), '{\n  "ok": true\n}');
  assert.equal(runTextTool("json-validate", '{"ok":true}'), "Valid JSON.");
  assert.throws(() => runTextTool("json-format", "{"), /JSON/);
});

test("CSV conversion quotes cells safely", () => {
  assert.equal(
    runTextTool("csv-json", "name,city\nAda,London"),
    '[\n  {\n    "name": "Ada",\n    "city": "London"\n  }\n]'
  );
  assert.equal(
    runTextTool("json-csv", '[{"name":"Ada","note":"hi, there"}]'),
    'name,note\r\nAda,"hi, there"'
  );
  assert.throws(() => runTextTool("csv-json", "name,name\nAda,London"), /duplicate column/);
});

test("URL and Base64 conversion", () => {
  assert.equal(runTextTool("url-encode", "a b+c"), "a%20b%2Bc");
  assert.equal(runTextTool("url-decode", "a%20b%2Bc"), "a b+c");
  assert.equal(runTextTool("base64-encode", "Hello"), "SGVsbG8=");
  assert.equal(runTextTool("base64-decode", "SGVsbG8="), "Hello");
  assert.throws(() => runTextTool("base64-decode", "%%%"), /Base64/);
  assert.throws(() => runTextTool("url-decode", "%ZZ"), /URL-encoded/);
});

test("percentage and unit conversions", () => {
  assert.equal(runTextTool("percent-of", "12", "250"), "30");
  assert.equal(runTextTool("percent-change", "100", "125"), "25%");
  assert.equal(runTextTool("unit-convert", "1", "", { category: "length", from: "km", to: "m" }), "1000");
  assert.equal(runTextTool("unit-convert", "0", "", { category: "temperature", from: "C", to: "F" }), "32");
  assert.throws(
    () => runTextTool("unit-convert", "-300", "", { category: "temperature", from: "C", to: "K" }),
    /absolute zero/
  );
});

test("remote text input fields are capped", () => {
  assert.throws(() => runTextTool("upper", "x".repeat(32_001)), /32,000/);
  assert.throws(() => runTextTool("percent-of", "12", "x".repeat(32_001)), /32,000/);
});
