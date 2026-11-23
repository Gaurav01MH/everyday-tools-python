import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_UPLOAD_BYTES,
  MAX_ACTIVE_SHARE_OBJECTS,
  MAX_ACTIVE_SHARE_STORAGE_BYTES,
  SHARE_LIFETIME_MS,
  createShareId,
  downloadHeaders,
  readLimitedBody,
  sanitizeFilename
} from "./share.js";
import { onRequestPost } from "../api/upload.js";
import { onRequestGet } from "../s/[id].js";

test("sharing has conservative upload, active-object and expiry limits", () => {
  assert.equal(MAX_UPLOAD_BYTES, 10 * 1024 * 1024);
  assert.equal(MAX_ACTIVE_SHARE_OBJECTS, 300);
  assert.equal(MAX_ACTIVE_SHARE_STORAGE_BYTES, 3 * 1024 * 1024 * 1024);
  assert.equal(SHARE_LIFETIME_MS, 7 * 24 * 60 * 60 * 1000);
});

test("share identifiers are 192-bit random hexadecimal tokens", () => {
  const id = createShareId();
  assert.match(id, /^[a-f0-9]{48}$/);
  assert.notEqual(id, createShareId());
});

test("filenames cannot escape a path or inject response headers", () => {
  assert.equal(sanitizeFilename("../../folder\\\\report.pdf"), "_.._folder__report.pdf");
  assert.equal(sanitizeFilename("safe\r\nContent-Type: text/html.txt"), "safeContent-Type: text_html.txt");
  assert.equal(sanitizeFilename(""), "shared-file");
});

test("share downloads are forced attachments with no-sniff and no-index headers", () => {
  const headers = downloadHeaders("page.html", "file");
  assert.equal(headers["Content-Type"], "application/octet-stream");
  assert.match(headers["Content-Disposition"], /^attachment;/);
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.match(headers["Content-Security-Policy"], /sandbox/);
  assert.equal(headers["X-Robots-Tag"], "noindex, nofollow, noarchive");
});

test("request streaming enforces the 10 MB upload limit", async () => {
  const result = await readLimitedBody(new Blob(["hello"]).stream(), 10);
  assert.equal(new TextDecoder().decode(result), "hello");
  await assert.rejects(() => readLimitedBody(new Blob(["too long"]).stream(), 4), /10 MB/);
});

test("upload route refuses requests until R2 storage has been bound", async () => {
  const request = new Request("https://too-broke-for-a-custom-domain.pages.dev/api/upload", {
    method: "POST",
    headers: {
      Origin: "https://too-broke-for-a-custom-domain.pages.dev",
      "X-Share-Kind": "text"
    },
    body: "sample"
  });
  const response = await onRequestPost({ request, env: {} });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /R2 setup/);
});

test("share route rejects malformed identifiers without storage access", async () => {
  const response = await onRequestGet({ params: { id: "short" }, env: {} });
  assert.equal(response.status, 404);
});
