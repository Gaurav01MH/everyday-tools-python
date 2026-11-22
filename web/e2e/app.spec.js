import { test, expect } from "@playwright/test";
import { PDFDocument, degrees } from "pdf-lib";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const axeSource = await readFile(require.resolve("axe-core/axe.min.js"), "utf8");

async function makePdf(pageSizes) {
  const pdf = await PDFDocument.create();
  for (const [width, height, angle = 0] of pageSizes) {
    const page = pdf.addPage([width, height]);
    if (angle) page.setRotation(degrees(angle));
  }
  return Buffer.from(await pdf.save());
}

async function choosePdf(page, operation, name, bytes) {
  await page.getByLabel("Choose a task").selectOption(operation);
  await page.locator("#file-input").setInputFiles({
    name,
    mimeType: "application/pdf",
    buffer: bytes
  });
}

test("page loads with a simple default workspace and local-processing notice", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Get your file work done." })).toBeVisible();
  await expect(page.getByText("Files stay on this device")).toBeVisible();
  await expect(page.getByRole("button", { name: "PDF tools" })).toHaveAttribute("aria-pressed", "true");
});

test("switches tool categories and transforms text", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Text & data" }).click();
  await page.getByLabel("Choose a task").selectOption("upper");
  await page.getByLabel("Input").fill("Everyday tools");
  await page.getByRole("button", { name: "Process text" }).click();
  await expect(page.getByLabel("Processed output")).toHaveValue("EVERYDAY TOOLS");
  await expect(page.getByText("Your result is ready. Nothing was sent to a server.")).toBeVisible();
});

test("formats JSON and gives a useful error for malformed JSON", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Text & data" }).click();
  await page.getByLabel("Choose a task").selectOption("json-format");
  await page.getByLabel("Input").fill('{"ok":true}');
  await page.getByRole("button", { name: "Process text" }).click();
  await expect(page.getByLabel("Processed output")).toHaveValue('{
  "ok": true
}');
  await page.getByLabel("Input").fill("{");
  await page.getByRole("button", { name: "Process text" }).click();
  await expect(page.getByRole("heading", { name: "Could not finish" })).toBeVisible();
});

test("merges two PDFs in the visible selected order", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Choose a task").selectOption("merge");
  const first = await makePdf([[200, 300]]);
  const second = await makePdf([[400, 500]]);
  await page.locator("#file-input").setInputFiles([
    { name: "first.pdf", mimeType: "application/pdf", buffer: first },
    { name: "second.pdf", mimeType: "application/pdf", buffer: second }
  ]);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Run tool" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("merged.pdf");
  const bytes = await readFile(await download.path());
  const output = await PDFDocument.load(bytes);
  expect(output.getPageCount()).toBe(2);
  expect(output.getPage(0).getWidth()).toBe(200);
  expect(output.getPage(1).getWidth()).toBe(400);
});

test("extracts selected PDF pages and validates an invalid selection", async ({ page }) => {
  await page.goto("/");
  const source = await makePdf([[200, 300], [400, 500], [600, 700]]);
  await choosePdf(page, "extract", "sample.pdf", source);
  await page.getByLabel("Pages").fill("2");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Run tool" }).click();
  const download = await downloadPromise;
  const output = await PDFDocument.load(await readFile(await download.path()));
  expect(output.getPageCount()).toBe(1);
  expect(output.getPage(0).getWidth()).toBe(400);

  await choosePdf(page, "extract", "sample.pdf", source);
  await page.getByLabel("Pages").fill("4-5");
  await page.getByRole("button", { name: "Run tool" }).click();
  await expect(page.getByRole("heading", { name: "Could not finish" })).toBeVisible();
  await expect(page.getByText(/outside this PDF/)).toBeVisible();
});

test("PDF rotation adds to the existing page rotation", async ({ page }) => {
  await page.goto("/");
  const source = await makePdf([[200, 300, 90]]);
  await choosePdf(page, "rotate", "quarter-turn.pdf", source);
  await page.getByLabel("Pages").fill("1");
  await page.getByLabel("Rotation").selectOption("90");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Run tool" }).click();
  const download = await downloadPromise;
  const output = await PDFDocument.load(await readFile(await download.path()));
  expect(output.getPage(0).getRotation().angle).toBe(180);
});

test("mobile layout has no horizontal page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  await page.getByRole("button", { name: "Image tools" }).click();
  await expect(page.getByRole("heading", { name: "Image tools" })).toBeVisible();
});

test("initial page passes the axe accessibility rules", async ({ page }) => {
  const browser = page.context().browser();
  const auditContext = await browser.newContext({ bypassCSP: true });
  const auditPage = await auditContext.newPage();
  try {
    await auditPage.goto("/");
    await auditPage.addScriptTag({ content: axeSource });
    const results = await auditPage.evaluate(async () => window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] }
    }));
    const violations = results.violations.map((item) => ({
      id: item.id,
      impact: item.impact,
      description: item.help,
      nodes: item.nodes.map((node) => node.target)
    }));
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  } finally {
    await auditContext.close();
  }
});

test("website contains no third-party upload targets or analytics calls", async ({ page }) => {
  const externalRequests = [];
  const postRequests = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://localhost:5173/")) externalRequests.push(request.url());
    if (request.method() !== "GET" && request.method() !== "HEAD") postRequests.push(request.url());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Text & data" }).click();
  await page.getByLabel("Choose a task").selectOption("upper");
  await page.getByLabel("Input").fill("local only");
  await page.getByRole("button", { name: "Process text" }).click();
  await expect(page.getByLabel("Processed output")).toHaveValue("LOCAL ONLY");
  expect(externalRequests).toEqual([]);
  expect(postRequests).toEqual([]);
});
