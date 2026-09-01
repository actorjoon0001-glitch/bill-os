// HMAC 서명 기반 세션 토큰 (서버 저장소 없이 위변조 방지).
// Node 런타임(route handler)과 Edge 런타임(middleware) 양쪽에서 동작하도록
// Web Crypto(globalThis.crypto.subtle) 만 사용한다.

const enc = new TextEncoder();

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(str: string): Uint8Array {
  const s = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

export async function signSession(email: string, secret: string): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ e: email, t: Date.now() })));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return `${payload}.${b64url(sig)}`;
}

export async function verifySession(
  token: string | undefined,
  secret: string
): Promise<{ email: string } | null> {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    const key = await hmacKey(secret);
    const expected = b64url(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
    if (expected !== sig) return null;
    const obj = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    if (!obj?.e || typeof obj.e !== "string") return null;
    return { email: obj.e };
  } catch {
    return null;
  }
}
