import {
  SHARE_OBJECT_PREFIX,
  downloadHeaders,
  jsonResponse
} from "../_lib/share.js";

export async function onRequestGet({ params, env }) {
  const id = String(params?.id || "");
  if (!/^[a-f0-9]{48}$/.test(id)) {
    return new Response("Share link not found.", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  if (!env.SHARES) return jsonResponse({ error: "File storage is temporarily unavailable." }, 503);

  let object;
  try {
    object = await env.SHARES.get(SHARE_OBJECT_PREFIX + id);
  } catch {
    return jsonResponse({ error: "File storage is temporarily unavailable." }, 503);
  }

  if (!object) {
    return new Response("This share link does not exist or has expired.", {
      status: 404,
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" }
    });
  }

  const metadata = object.customMetadata || {};
  const expiry = Date.parse(metadata.expiresAt || "");
  if (!Number.isFinite(expiry) || Date.now() >= expiry) {
    try { await env.SHARES.delete(SHARE_OBJECT_PREFIX + id); } catch { /* Still deny expired links. */ }
    return new Response("This share link has expired. Create a new one in Files Format.", {
      status: 410,
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" }
    });
  }

  const kind = metadata.kind === "text" ? "text" : "file";
  return new Response(object.body, {
    status: 200,
    headers: downloadHeaders(metadata.fileName || (kind === "text" ? "shared-text.txt" : "shared-file"), kind)
  });
}
