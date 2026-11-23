import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { TOOL_CATALOG } from "../src/lib/tool-catalog.js";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const basePath = process.env.PUBLIC_BASE_PATH || (process.env.GITHUB_PAGES === "true" ? "/everyday-tools-python/" : "/");
const origin = (process.env.PUBLIC_SITE_ORIGIN || "https://gaurav01mh.github.io").replace(/\/$/, "");
const baseUrl = new URL(basePath.endsWith("/") ? basePath : basePath + "/", origin).href;
const sitemap = await readFile(join(dist, "sitemap.xml"), "utf8");
const robots = await readFile(join(dist, "robots.txt"), "utf8");
const llms = await readFile(join(dist, "llms.txt"), "utf8");
const home = await readFile(join(dist, "index.html"), "utf8");
const brandedAlias = await readFile(join(dist, "too-broke-for-a-custom-domain", "index.html"), "utf8");

assert.match(home, /<title>Files Format/);
assert.match(home, /name="description"/);
assert.match(home, /application\/ld\+json/);
assert.match(home, /logo\.svg/);
// Verify the branded free GitHub Pages alias is an exact copy of the homepage.
assert.equal(brandedAlias, home, "Branded GitHub Pages alias should match the homepage");
assert.match(robots, /User-agent: \*/);
assert.match(robots, /User-agent: OAI-SearchBot\s+Allow: \//);
assert.match(robots, /User-agent: GPTBot\s+Disallow: \//);
assert.ok(robots.includes("Sitemap: " + baseUrl + "sitemap.xml"));
assert.ok(llms.includes("Files Format"));
assert.ok(llms.includes("Individual tools"));

const requiredPages = [
  "tools/",
  "about/",
  "pdf-tools/",
  "image-tools/",
  "text-tools/",
  "policies/privacy/",
  "policies/terms/",
  "policies/licensing/",
  "connect/"
];

for (const page of requiredPages) {
  await access(join(dist, page, "index.html"));
  assert.ok(sitemap.includes("<loc>" + baseUrl + page + "</loc>"), "Missing sitemap URL for " + page);
}

for (const tool of TOOL_CATALOG) {
  const relativePath = "tools/" + tool.slug + "/index.html";
  const html = await readFile(join(dist, relativePath), "utf8");
  const canonical = baseUrl + "tools/" + tool.slug + "/";
  assert.ok(html.includes("<title>" + tool.title + " | Files Format</title>"), "Missing title for " + tool.slug);
  assert.ok(html.includes('rel="canonical" href="' + canonical + '"'), "Missing canonical for " + tool.slug);
  assert.ok(html.includes('type="application/ld+json"'), "Missing structured data for " + tool.slug);
  assert.ok(html.includes(tool.description), "Missing tool description for " + tool.slug);
  assert.ok(html.includes("?tool=" + tool.slug), "Missing launch link for " + tool.slug);
  assert.ok(sitemap.includes("<loc>" + canonical + "</loc>"), "Missing sitemap entry for " + tool.slug);
}

console.log("SEO checks passed for " + TOOL_CATALOG.length + " tool pages and " + requiredPages.length + " supporting pages.");
