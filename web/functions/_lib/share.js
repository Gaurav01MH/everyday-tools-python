export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_ACTIVE_SHARE_OBJECTS = 300;
export const MAX_ACTIVE_SHARE_STORAGE_BYTES = 3 * 1024 * 1024 * 1024;
export const SHARE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
export const SHARE_OBJECT_PREFIX = "shared/";

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export function sanitizeFilename(input, fallback = "shared-file") {
  let filename = String(input ?? "")
    .normalize("NFKC")
    .replace(/[\\/]/g, "_")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/^\.+/, "")
    .trim()
    .slice(0, 160);
  if (!filename || filename === "." || filename === "..") filename = fallback;
  return filename;
}

export function createShareId() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function readLimitedBody(stream, maximum = MAX_UPLOAD_BYTES) {
  if (!stream) return new Uint8Array();
  const reader = stream.getReader();
  const parts = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximum) {
        await reader.cancel("Upload exceeds the maximum size.");
        const error = new Error("Each upload is limited to 10 MB.");
        error.status = 413;
        throw error;
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  return bytes;
}

export async function verifyTurnstile(token, request, secret) {
  if (!secret) {
    return {
      ok: false,
      status: 503,
      message: "Sharing is not activated yet. The site owner must finish the Cloudflare setup."
    };
  }
  if (!token || token.length > 2048) {
    return { ok: false, status: 400, message: "Complete the security check before uploading." };
  }

  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token);
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) form.set("remoteip", ip);

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString()
    });
    if (!response.ok) {
      return { ok: false, status: 502, message: "The security check could not be verified. Please try again." };
    }
    const result = await response.json();
    const hostname = new URL(request.url).hostname;
    if (result.success === true && result.hostname === hostname && result.action === "share-upload") {
      return { ok: true };
    }
    return { ok: false, status: 403, message: "The security check expired. Complete it again and retry." };
  } catch {
    return { ok: false, status: 502, message: "The security check service is temporarily unavailable." };
  }
}

export function downloadHeaders(filename, kind) {
  const safe = sanitizeFilename(filename, kind === "text" ? "shared-text.txt" : "shared-file");
  const ascii = safe.replace(/[^\x20-\x7e]/g, "_").replace(/["\\;]/g, "_") || "shared-file";
  return {
    "Content-Type": kind === "text" ? "text/plain; charset=utf-8" : "application/octet-stream",
    "Content-Disposition": "attachment; filename=\"" + ascii + "\"; filename*=UTF-8''" + encodeURIComponent(safe),
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "Content-Security-Policy": "sandbox; default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer"
  };
}
