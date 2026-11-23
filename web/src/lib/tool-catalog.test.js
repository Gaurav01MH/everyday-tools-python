import test from "node:test";
import assert from "node:assert/strict";
import { TOOL_CATALOG, findToolBySlug } from "./tool-catalog.js";

test("Files Format catalog has the expected PDF, image and text tools", () => {
  assert.equal(TOOL_CATALOG.length, 29);
  assert.equal(TOOL_CATALOG.filter((tool) => tool.mode === "pdf").length, 6);
  assert.equal(TOOL_CATALOG.filter((tool) => tool.mode === "images").length, 3);
  assert.equal(TOOL_CATALOG.filter((tool) => tool.mode === "text").length, 20);
});

test("every catalogue entry has a unique slug and mode-operation pair", () => {
  const slugs = TOOL_CATALOG.map((tool) => tool.slug);
  const operations = TOOL_CATALOG.map((tool) => tool.mode + ":" + tool.operation);
  assert.equal(new Set(slugs).size, slugs.length, "tool slugs must be unique");
  assert.equal(new Set(operations).size, operations.length, "tool operations must be unique per category");
});

test("every tool has enough factual detail to render its SEO page", () => {
  for (const tool of TOOL_CATALOG) {
    assert.ok(tool.slug && /^[a-z0-9-]+$/.test(tool.slug), tool.slug);
    assert.ok(["pdf", "images", "text"].includes(tool.mode), tool.slug + " has an invalid mode");
    assert.ok(tool.name.trim(), tool.slug + " has no name");
    assert.ok(tool.title.trim(), tool.slug + " has no page title");
    assert.ok(tool.description.trim(), tool.slug + " has no description");
    assert.ok(tool.keywords.length >= 3, tool.slug + " needs search terms");
    assert.ok(tool.inputs.trim(), tool.slug + " needs input requirements");
    assert.ok(tool.steps.length >= 2, tool.slug + " needs usage steps");
    assert.ok(tool.limitation.trim(), tool.slug + " needs a limitations statement");
  }
});

test("tool slug lookup is safe for existing and unknown slugs", () => {
  assert.equal(findToolBySlug("merge-pdf")?.operation, "merge");
  assert.equal(findToolBySlug("validate-json")?.operation, "json-validate");
  assert.equal(findToolBySlug("link-maker")?.operation, "link-make");
  assert.equal(findToolBySlug("qr-code-generator")?.operation, "qr-code");
  assert.equal(findToolBySlug("../admin"), null);
  assert.equal(findToolBySlug("does-not-exist"), null);
});
