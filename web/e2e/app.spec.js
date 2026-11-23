import { test, expect } from "@playwright/test";
import { PDFDocument, degrees } from "pdf-lib";
import JSZip from "jszip";
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
  await expect(page.getByRole("heading", { name: "Everyday file jobs, made simpler." })).toBeVisible();
  await expect(page.getByRole("img", { name: "FileDesk — PDF, Image & File Tools" })).toBeVisible();
  await expect(page.getByLabel("Search tools, e.g. merge PDF or compress image")).toBeVisible();
  await expect(page.getByText("Files stay on this device")).toBeVisible();
  await expect(page.getByRole("button", { name: "PDF tools" })).toHaveAttribute("aria-pressed", "true");
});

test("searches tool cards and opens the matching PDF operation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Search tools, e.g. merge PDF or compress image" }).fill("merge");
  await expect(page.getByRole("button", { name: /Merge PDF/ })).toBeVisible();
  await expect(page.locator("#tool-count")).toHaveText("1 tool");
  await page.getByRole("button", { name: /Merge PDF/ }).click();
  await expect(page.getByLabel("Choose a task")).toHaveValue("merge");
  await expect(page).toHaveURL(/tool=merge-pdf/);
  await expect(page.locator(".tool-card.is-selected")).toContainText("Merge PDF");
});

test("opens a selected tool from a shareable direct URL", async ({ page }) => {
  await page.goto("/?tool=validate-json");
  await expect(page.getByRole("button", { name: "Text & data" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Choose a task")).toHaveValue("json-validate");
  await expect(page.getByLabel("Input", { exact: true })).toHaveAttribute("placeholder", "Paste JSON here");
});

test("switches tool categories and transforms text", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Text & data" }).click();
  await page.getByLabel("Choose a task").selectOption("upper");
  await page.getByLabel("Input", { exact: true }).fill("Everyday tools");
  await page.getByRole("button", { name: "Process text" }).click();
  await expect(page.getByLabel("Processed output")).toHaveValue("EVERYDAY TOOLS");
  await expect(page.getByText("Your result is ready. Nothing was sent to a server.")).toBeVisible();
});

test("formats JSON and gives a useful error for malformed JSON", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Text & data" }).click();
  await page.getByLabel("Choose a task").selectOption("json-format");
  await page.getByLabel("Input", { exact: true }).fill('{"ok":true}');
  await page.getByRole("button", { name: "Process text" }).click();
  await expect(page.getByLabel("Processed output")).toHaveValue("{\n  \"ok\": true\n}");
  await page.getByLabel("Input", { exact: true }).fill("{");
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
  await page.locator("#page-selection").fill("2");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Run tool" }).click();
  const download = await downloadPromise;
  const output = await PDFDocument.load(await readFile(await download.path()));
  expect(output.getPageCount()).toBe(1);
  expect(output.getPage(0).getWidth()).toBe(400);

  await choosePdf(page, "extract", "sample.pdf", source);
  await page.locator("#page-selection").fill("4-5");
  await page.getByRole("button", { name: "Run tool" }).click();
  await expect(page.getByRole("heading", { name: "Could not finish" })).toBeVisible();
  await expect(page.getByText(/outside this PDF/)).toBeVisible();
});

test("PDF rotation adds to the existing page rotation", async ({ page }) => {
  await page.goto("/");
  const source = await makePdf([[200, 300, 90]]);
  await choosePdf(page, "rotate", "quarter-turn.pdf", source);
  await page.locator("#page-selection").fill("1");
  await page.getByLabel("Rotation").selectOption("90");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Run tool" }).click();
  const download = await downloadPromise;
  const output = await PDFDocument.load(await readFile(await download.path()));
  expect(output.getPage(0).getRotation().angle).toBe(180);
});

test("renders a PDF page to a PNG inside a downloadable ZIP", async ({ page }) => {
  await page.goto("/");
  const source = await makePdf([[300, 400]]);
  await choosePdf(page, "render", "render-sample.pdf", source);
  const downloadPromise = page.waitForEvent("download", { timeout: 20_000 }).catch(() => null);
  await page.getByRole("button", { name: "Run tool" }).click();
  await expect(page.locator("#result-title")).toHaveText(/Done|Could not finish/, { timeout: 20_000 });
  const download = await downloadPromise;
  if (!download) {
    throw new Error("PDF render did not download a file: " + await page.locator("#result-message").innerText());
  }
  expect(download.suggestedFilename()).toBe("render-sample-pages-png.zip");
  const zip = await JSZip.loadAsync(await readFile(await download.path()));
  const png = zip.file("page-001.png");
  expect(png).not.toBeNull();
  const bytes = await png.async("uint8array");
  expect([...bytes.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
});

test("converts a browser image and downloads the chosen format", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Image tools" }).click();
  await page.getByLabel("Choose a task").selectOption("convert");
  const pngDataUrl = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 2;
    const context = canvas.getContext("2d");
    context.fillStyle = "#c44";
    context.fillRect(0, 0, 2, 2);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    return "data:image/png;base64," + btoa(binary);
  });
  const png = Buffer.from(pngDataUrl.split(",")[1], "base64");
  await page.locator("#file-input").setInputFiles({
    name: "tiny.png",
    mimeType: "image/png",
    buffer: png
  });
  await page.getByLabel("Output format").selectOption("image/webp");
  const downloadPromise = page.waitForEvent("download", { timeout: 20_000 }).catch(() => null);
  await page.getByRole("button", { name: "Run tool" }).click();
  await expect(page.locator("#result-title")).toHaveText(/Done|Could not finish/, { timeout: 20_000 });
  const download = await downloadPromise;
  if (!download) {
    throw new Error("Image conversion did not download a file: " + await page.locator("#result-message").innerText());
  }
  expect(download.suggestedFilename()).toBe("tiny.webp");
  const bytes = await readFile(await download.path());
  expect(bytes.subarray(0, 4).toString("ascii")).toBe("RIFF");
  expect(bytes.subarray(8, 12).toString("ascii")).toBe("WEBP");
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
  await page.getByLabel("Input", { exact: true }).fill("local only");
  await page.getByRole("button", { name: "Process text" }).click();
  await expect(page.getByLabel("Processed output")).toHaveValue("LOCAL ONLY");
  expect(externalRequests).toEqual([]);
  expect(postRequests).toEqual([]);
});
