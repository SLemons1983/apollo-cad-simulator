import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const MAX_SKEW_MS = 5 * 60 * 1000;

type VerifyResult = { ok: true; clientId: string } | { ok: false; status: number; error: string };

function signatureFor(secret: string, timestamp: string, requestId: string, body: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${requestId}.${body}`).digest("hex");
}

export function signedHeaders(clientId: string, secret: string, body: string) {
  const timestamp = new Date().toISOString();
  const requestId = randomUUID();
  return {
    "content-type": "application/json",
    authorization: `Bearer ${secret}`,
    "x-apollo-client-id": clientId,
    "x-apollo-timestamp": timestamp,
    "x-apollo-request-id": requestId,
    "x-apollo-signature": signatureFor(secret, timestamp, requestId, body),
  };
}

const replayCache = new Map<string, number>();
function seenRequest(id: string) {
  const now = Date.now();
  for (const [key, at] of replayCache) if (now - at > MAX_SKEW_MS) replayCache.delete(key);
  if (replayCache.has(id)) return true;
  replayCache.set(id, now);
  return false;
}

export function verifySignedRequest(request: Request, rawBody: string, expectedClientId: string, secret: string): VerifyResult {
  const auth = request.headers.get("authorization") ?? "";
  const clientId = request.headers.get("x-apollo-client-id") ?? "";
  const timestamp = request.headers.get("x-apollo-timestamp") ?? "";
  const requestId = request.headers.get("x-apollo-request-id") ?? "";
  const supplied = request.headers.get("x-apollo-signature") ?? "";

  if (!secret) return { ok: false, status: 500, error: "Integration secret is not configured" };
  if (auth !== `Bearer ${secret}`) return { ok: false, status: 401, error: "Invalid bearer credential" };
  if (clientId !== expectedClientId) return { ok: false, status: 403, error: "Unexpected integration client" };
  if (!timestamp || !requestId || !supplied) return { ok: false, status: 401, error: "Missing signed request headers" };

  const parsedTime = Date.parse(timestamp);
  if (!Number.isFinite(parsedTime) || Math.abs(Date.now() - parsedTime) > MAX_SKEW_MS) {
    return { ok: false, status: 401, error: "Request timestamp outside permitted window" };
  }
  if (seenRequest(requestId)) return { ok: false, status: 409, error: "Replay request rejected" };

  const expected = signatureFor(secret, timestamp, requestId, rawBody);
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(supplied, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, status: 401, error: "Invalid request signature" };
  } catch {
    return { ok: false, status: 401, error: "Invalid request signature" };
  }
  return { ok: true, clientId };
}

export async function signedPost(url: string, clientId: string, secret: string, payload: unknown) {
  const body = JSON.stringify(payload);
  const response = await fetch(url, { method: "POST", headers: signedHeaders(clientId, secret, body), body, cache: "no-store" });
  const text = await response.text();
  let data: unknown = text;
  try { data = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) throw new Error(`Integration POST ${response.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  return data;
}
