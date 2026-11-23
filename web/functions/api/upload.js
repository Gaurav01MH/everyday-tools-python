import {
  MAX_UPLOAD_BYTES,
  MAX_ACTIVE_SHARE_OBJECTS,
  MAX_ACTIVE_SHARE_STORAGE_BYTES,
  SHARE_OBJECT_PREFIX,
  SHARE_LIFETIME_MS,
  createShareId,
  jsonResponse,
  readLimitedBody,
  sanitizeFilename,
  verifyTurnstile
} from "../_lib/share.js";

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  if (request.headers.get("Origin") !== url.origin) {
    return jsonResponse({ error: "Uploads must come from the Files Format website." }, 403);
  }
  if (!env.SHARES) {
    return jsonResponse({ error: "File storage is not connected yet. The site owner must finish the R2 setup." }, 503);
  }

  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (declaredLength > MAX_UPLOAD_BYTES) {
    return jsonResponse({ error: "Each upload is limited to 10 MB." }, 413);
  }

  const kind = request.headers.get("X-Share-Kind");
  if (kind !== "file" && kind !== "text") {
    return jsonResponse({ error: "Choose one file or enter text to share." }, 400);
  }

  const verification = await verifyTurnstile(
    request.headers.get("X-Turnstile-Token") || "",
    request,
    env.TURNSTILE_SECRET_KEY
  );
  if (!verification.ok) return jsonResponse({ error: verification.message }, verification.status);

  let bytes;
  try {
    bytes = await readLimitedBody(request.body);
  } catch (error) {
    return jsonResponse({ error: error.message || "The upload is too large." }, error.status || 400);
  }
  if (kind === "text" && bytes.byteLength === 0) {
    return jsonResponse({ error: "Enter some text or choose a file." }, 400);
  }

  let suppliedName = "";
  try {
    suppliedName = decodeURIComponent(request.headers.get("X-Share-Filename") || "");
  } catch {
    return jsonResponse({ error: "The filename could not be read." }, 400);
  }
  const filename = sanitizeFilename(suppliedName, kind === "text" ? "shared-text.txt" : "shared-file");

  // Refuse new uploads when the small public-sharing allowance is full.
  let existing;
  try {
    existing = await env.SHARES.list({ prefix: SHARE_OBJECT_PREFIX, limit: 1000 });
  } catch {
    return jsonResponse({ error: "The storage usage check failed. Please retry later." }, 503);
  }
  const objects = existing.objects || [];
  const storedBytes = objects.reduce((sum, object) => sum + (object.size || 0), 0);
  if (existing.truncated ||
      objects.length >= MAX_ACTIVE_SHARE_OBJECTS ||
      storedBytes + bytes.byteLength > MAX_ACTIVE_SHARE_STORAGE_BYTES) {
    return jsonResponse({ error: "The free sharing allowance is temporarily full. Expired uploads are automatically removed; please try again later." }, 503);
  }

  const id = createShareId();
  const expiresAt = new Date(Date.now() + SHARE_LIFETIME_MS).toISOString();
  try {
    await env.SHARES.put(SHARE_OBJECT_PREFIX + id, bytes, {
      httpMetadata: {
        contentType: kind === "text" ? "text/plain; charset=utf-8" : "application/octet-stream"
      },
      customMetadata: { fileName: filename, kind, expiresAt }
    });
  } catch {
    return jsonResponse({ error: "The file could not be saved. Storage may be unavailable or its free quota may have been reached." }, 503);
  }

  return jsonResponse({
    id,
    url: new URL("/s/" + id, url.origin).href,
    filename,
    size: bytes.byteLength,
    expiresAt,
    expiresInDays: 7
  }, 201);
}
