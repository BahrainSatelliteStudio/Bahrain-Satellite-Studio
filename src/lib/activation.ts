// بروتوكول تفعيل الأكواد (متوافق مع لوحة panel.bhsat.me): إعدادات JSON ← POST form json=XOR(payload) ← رد XOR فيه status 101
export const xor = (s: string, key: string) => {
  let o = "";
  for (let i = 0; i < s.length; i++) o += String.fromCharCode(s.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  return o;
};

const PRIVATE_V4 = [/^0\./, /^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, /^(22[4-9]|2[3-5]\d)\./];
export function isSafeUrl(raw: string) {
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  if (!["http:", "https:"].includes(u.protocol) || u.username || u.password || u.hash) return false;
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return false;
  if (PRIVATE_V4.some((r) => r.test(h))) return false;
  if (h.includes(":") && (h === "::1" || h === "::" || /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(h) || h.startsWith("::ffff:") || h.startsWith("2001:db8"))) return false;
  return true;
}

async function limitedFetch(url: string, init: RequestInit) {
  const ctrl = new AbortController();
  const tm = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(url, { ...init, redirect: "manual", signal: ctrl.signal, headers: { "Accept-Encoding": "identity", ...(init.headers as Record<string, string>) } });
    if (r.status < 200 || r.status > 299) throw new Error("خدمة التفعيل لم تستجب");
    const buf = new Uint8Array(await r.arrayBuffer());
    if (buf.length > 256 * 1024) throw new Error("رد خدمة التفعيل كبير جدًا");
    return buf;
  } finally { clearTimeout(tm); }
}
const latin1 = (b: Uint8Array) => { let s = ""; for (const c of b) s += String.fromCharCode(c); return s; };

export async function activateWithProvider(configUrl: string, p: { code: string; mac: string; model: string; firmware: string }) {
  if (!isSafeUrl(configUrl)) throw new Error("رابط خدمة التفعيل غير مسموح");
  const cfg = JSON.parse(new TextDecoder().decode(await limitedFetch(configUrl, { headers: { "user-agent": "Mozilla/5.0 IPTVPlayer" } })));
  const base = String(cfg.activation_base_url || ""), key = String(cfg.xor_key || "");
  const ua = String(cfg.user_agent || "Mozilla/5.0 IPTVPlayer").replace(/[\r\n]/g, "").slice(0, 256);
  if (!base || !key || key.length > 256 || !isSafeUrl(base)) throw new Error("إعدادات خدمة التفعيل غير صالحة");
  const payload = JSON.stringify({ mode: "active", code: p.code, mac: p.mac, sn: p.mac, chipid: "000000", model: p.model, firmware_ver: p.firmware });
  const body = new URLSearchParams({ json: xor(payload, key) });
  const raw = await limitedFetch(base, { method: "POST", body: body.toString(), headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": ua } });
  let res: any;
  try { res = JSON.parse(xor(latin1(raw), key)); } catch { throw new Error("رد خدمة التفعيل غير مفهوم"); }
  if (Number(res?.status) !== 101 || res.username == null || res.password == null) {
    const msg = String(res?.message || "رمز التفعيل غير صحيح أو مستخدم").replace(/[\u0000-\u001f<>]/g, "").slice(0, 240);
    throw new Error(msg);
  }
  return { username: String(res.username), password: String(res.password) };
}

export async function sha256(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}
