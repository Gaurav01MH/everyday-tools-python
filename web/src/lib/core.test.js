import test from "node:test";
import assert from "node:assert/strict";
import {
  parsePageSelection, parseCsv, toCsv, convertUnit, textStatistics,
  safeFilename, assertInputFiles, MAX_TOTAL_BYTES
} from "./core.js";
import { runTextTool } from "./text-tools.js";

test("page selection expands ranges and preserves order", () => {
  assert.deepEqual(parsePageSelection("5, 1-3", 5), [4, 0, 1, 2]);
  assert.deepEqual(parsePageSelection("all", 3), [0, 1, 2]);
});

test("page selection rejects reversed, repeated and out-of-range values", () => {
  assert.throws(() => parsePageSelection("4-2", 5), /outside/);
  assert.throws(() => parsePageSelection("1,1", 5), /more than once/);
  assert.throws(() => parsePageSelection("6", 5), /outside/);
  assert.throws(() => parsePageSelection("1, nope", 5), /Invalid page selection/);
});

test("CSV parser handles commas, escaped quotes and newlines in cells", () => {
  const source = 'name,note\r\nA,"hello, world"\r\nB,"say ""yes"""';
  assert.deepEqual(parseCsv(source), [["name", "note"], ["A", "hello, world"], ["B", 'say "yes"']]);
});

test("CSV parser rejects unclosed quotes and exporter round-trips data", () => {
  assert.throws(() => parseCsv('a,"unfinished'), /no matching closing quote/);
  assert.throws(() => parseCsv('a,b\nwrong"quote,x'), /quote inside an unquoted/);
  assert.deepEqual(parseCsv('"value" ,next'), [["value", "next"]]);
  const rows = [["a", "b"], ["x,y", 'say "yes"'], ["line\none", ""]];
  assert.deepEqual(parseCsv(toCsv(rows)), rows);
});


test("CSV export prefixes spreadsheet formula-like cells", () => {
  assert.equal(toCsv([["=2+2"], ["  @SUM(A1:A2)"], ["safe"]]), "'=2+2\\r\\n'  @SUM(A1:A2)\\r\\nsafe");
});

test("temperature and length conversions are accurate", () => {
  assert.equal(convertUnit(0, "temperature", "C", "F"), 32);
  assert.equal(convertUnit(1, "length", "km", "m"), 1000);
  assert.throws(() => convertUnit(-274, "temperature", "C", "K"), /absolute zero/);
  assert.throws(() => convertUnit(-1, "temperature", "K", "C"), /absolute zero/);
});

test("text statistics handle empty input and Unicode text", () => {
  assert.deepEqual(textStatistics(""), { characters: 0, charactersWithoutSpaces: 0, words: 0, lines: 0 });
  assert.deepEqual(textStatistics("नमस्ते world\nagain"), {
    characters: 18, charactersWithoutSpaces: 16, words: 3, lines: 2
  });
});

test("filenames are reduced to safe download names", () => {
  assert.equal(safeFilename("../../my:report?.pdf"), "my-report-");
});

test("file guard rejects batches above its byte cap", () => {
  const file = { size: MAX_TOTAL_BYTES + 1, arrayBuffer() {} };
  assert.throws(() => assertInputFiles([file]), /100 MB/);
});

test("text functions distinguish invalid JSON and JSON formatting", () => {
  assert.equal(runTextTool("json-format", '{"a":1}'), '{\n  "a": 1\n}');
  assert.throws(() => runTextTool("json-format", "{"), /JSON/);
});
