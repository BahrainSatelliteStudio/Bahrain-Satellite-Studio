// Bahrain Satellite — Self-hosted customer panel. Zero dependencies (Node.js >= 18).
"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = __dirname;
const rules = require("./features");
const manifestPath = path.join(ROOT,"delivery.json");
const manifest = fs.existsSync(manifestPath) ? rules.validateManifest(JSON.parse(fs.readFileSync(manifestPath,"utf8"))) : null;
const featureEnabled = k => rules.featureEnabled(manifest,k);
const DATA = process.env.PANEL_DATA || path.join(ROOT, "data");
const UPLOADS = path.join(DATA, "uploads");
const BACKUPS = path.join(DATA, "backups");
const DB_FILE = path.join(DATA, "db.json");
const PORT = Number(process.env.PORT || readJson(path.join(DATA, "config.json"), {}).port || 8090);
const VERSION = "1.0.0";
for (const d of [DATA, UPLOADS, BACKUPS]) fs.mkdirSync(d, { recursive: true });

function readJson(f, def) { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return def; } }
const id = () => crypto.randomBytes(8).toString("hex");
const now = () => new Date().toISOString();

/* ---------- storage ---------- */
const DEFAULT_COLORS = { primary: "#FBBD23", secondary: "#303540", accent: "#DCA518", background: "#14181F", surface: "#20242C", text: "#F8F8F6", button: "#20242C" };
let db = readJson(DB_FILE, null);
if (!db) {
  db = {
    settings: { name: "Bahrain Satellite", logo: null, banner: null, theme: "bhsat", colors: DEFAULT_COLORS,
      whatsapp: "", telegram: "", facebook: "", website: "", email: "", phone: "", store_url: "", notice: "",
      latest_version: "1.0.0", min_version: "1.0.0", update_url: "", max_hosts: 40 },
    servers: [], notifications: [], changes: [], users: [], sessions: {}, codes: [],
  };
  if (manifest) { db.settings.name=manifest.name; db.settings.logo=manifest.logo; db.settings.theme=manifest.theme; db.settings.layout={template:manifest.template}; db.settings.max_hosts=2; }
  const pass = process.env.PANEL_ADMIN_PASSWORD || crypto.randomBytes(9).toString("base64url");
  const user = (process.env.PANEL_ADMIN_USER || "admin").toLowerCase();
  db.users.push({ username: user, ...hashPw(pass) });
  fs.writeFileSync(path.join(DATA, "initial-login.txt"), `Username: ${user}\nPassword: ${pass}\nغيّر كلمة المرور بعد أول دخول ثم احذف هذا الملف.\n`);
  console.log(`\n  First login → user: ${user}  password: ${pass}\n  (saved in data/initial-login.txt)\n`);
  save();
}
if (!Array.isArray(db.codes)) db.codes = [];
function save() { const tmp = DB_FILE + ".tmp"; fs.writeFileSync(tmp, JSON.stringify(db, null, 2)); fs.renameSync(tmp, DB_FILE); }
function log(user, section, summary) { db.changes.unshift({ id: id(), user, section, summary, at: now() }); db.changes = db.changes.slice(0, 500); save(); }

function dailyBackup() {
  const name = `db-${new Date().toISOString().slice(0, 10)}.json`;
  const f = path.join(BACKUPS, name);
  if (!fs.existsSync(f)) fs.copyFileSync(DB_FILE, f);
  const files = fs.readdirSync(BACKUPS).filter((x) => x.startsWith("db-")).sort();
  while (files.length > 14) fs.unlinkSync(path.join(BACKUPS, files.shift()));
}
dailyBackup(); setInterval(dailyBackup, 3600_000).unref();

/* ---------- auth ---------- */
function hashPw(pw, salt = crypto.randomBytes(16).toString("hex")) { return { salt, hash: crypto.scryptSync(pw, salt, 64).toString("hex") }; }
function checkPw(u, pw) { const h = crypto.scryptSync(pw, u.salt, 64); return crypto.timingSafeEqual(h, Buffer.from(u.hash, "hex")); }
const attempts = new Map();
function session(req) {
  const m = /(?:^|;\s*)sid=([a-f0-9]{64})/.exec(req.headers.cookie || "");
  const s = m && db.sessions[m[1]];
  if (!s || s.exp < Date.now()) return null;
  return { sid: m[1], user: s.user };
}

/* ---------- crypto for backups ---------- */
function encrypt(text, pass) {
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(pass, salt, 32);
  const c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return JSON.stringify({ format: "bhsat-backup", v: 1, salt: salt.toString("base64"), iv: iv.toString("base64"), tag: c.getAuthTag().toString("base64"), data: enc.toString("base64") });
}
function decrypt(json, pass) {
  const j = JSON.parse(json);
  if (j.format !== "bhsat-backup") throw new Error("ملف غير صالح");
  const key = crypto.scryptSync(pass, Buffer.from(j.salt, "base64"), 32);
  const d = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(j.iv, "base64"));
  d.setAuthTag(Buffer.from(j.tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(j.data, "base64")), d.final()]).toString("utf8");
}

/* ---------- helpers ---------- */
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".json": "application/json", ".ico": "image/x-icon" };
function send(res, code, body, headers = {}) {
  const isObj = typeof body === "object" && !Buffer.isBuffer(body);
  res.writeHead(code, { "content-type": isObj ? "application/json; charset=utf-8" : "text/plain; charset=utf-8", "x-content-type-options": "nosniff", ...headers });
  res.end(isObj ? JSON.stringify(body) : body);
}
function body(req, limit = 8 * 1024 * 1024) {
  return new Promise((ok, bad) => {
    let size = 0; const chunks = [];
    req.on("data", (c) => { size += c.length; if (size > limit) { bad(new Error("الملف كبير جدًا")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { ok(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {}); } catch { bad(new Error("بيانات غير صالحة")); } });
  });
}
function serveFile(res, file, cache) {
  fs.readFile(file, (e, buf) => {
    if (e) return send(res, 404, "Not found");
    res.writeHead(200, { "content-type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream", "cache-control": cache ? "public, max-age=86400" : "no-cache" });
    res.end(buf);
  });
}
const str = (v, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const isHex = (v) => /^#[0-9A-Fa-f]{6}$/.test(v);
const hostsUsed = () => db.servers.reduce((n, s) => n + 1 + s.backup_urls.length, 0);
function cleanServer(b, old = {}) {
  const urls = Array.isArray(b.backup_urls) ? b.backup_urls.map((u) => str(u, 300)).filter(Boolean).slice(0, 7) : old.backup_urls || [];
  return { ...old, name: str(b.name, 80) || old.name || "سيرفر", type: ["xtream", "m3u", "mac"].includes(b.type) ? b.type : old.type || "xtream",
    url: str(b.url, 300), login_code: str(b.login_code, 40), backup_urls: urls, activation_api_url: str(b.activation_api_url, 300),
    enabled: b.enabled === undefined ? old.enabled ?? true : !!b.enabled };
}
async function checkUrl(u) {
  const t0 = Date.now();
  try {
    const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(u.replace(/\/+$/, "") + "/player_api.php", { signal: ctrl.signal, headers: { "user-agent": "Mozilla/5.0 IPTVPlayer" } });
    clearTimeout(tm); return { url: u, ok: r.status < 500, ms: Date.now() - t0 };
  } catch { return { url: u, ok: false, ms: Date.now() - t0 }; }
}
function publicConfig() {
  const s = db.settings, t = Date.now();
  return {
    slug: manifest?.slug, layout: s.layout, feature_selection: manifest?.features, name: s.name, logo_url: s.logo, banner_url: s.banner, theme: s.theme, colors: s.colors, primary_color: s.colors.primary, accent_color: s.colors.accent,
    support_whatsapp: s.whatsapp || null, support_telegram: s.telegram || null, support_facebook: s.facebook || null, support_website: s.website || null,
    support_email: s.email || null, support_phone: s.phone || null, store_url: s.store_url || null, customer_notice: s.notice || null,
    latest_version: s.latest_version, min_version: s.min_version, update_url: s.update_url || null,
    sources: db.servers.filter((x) => x.enabled).map((x) => ({ id: x.id, type: x.type, name: x.name, has_code: !!x.login_code, activation_enabled: !!x.activation_api_url })),
    activation_enabled: db.servers.some((x) => x.enabled && x.type === "xtream" && x.activation_api_url),
    announcements: db.notifications.filter((n) => n.active && (!n.expires_at || Date.parse(n.expires_at) > t)).map(({ id, title, body, image_url, kind }) => ({ id, title, body, image_url, kind })),
  };
}


/* ---------- activation (code → username/password) — provider URL & XOR key never leave the server ---------- */
const RECEIPTS = path.join(DATA, "activation-receipts");
fs.mkdirSync(RECEIPTS, { recursive: true, mode: 0o700 });
const actHits = new Map(); const actLocks = new Set(); let actRunning = 0;
const xorStr = (s, k) => { let o = ""; for (let i = 0; i < s.length; i++) o += String.fromCharCode(s.charCodeAt(i) ^ k.charCodeAt(i % k.length)); return o; };
function privateIp(ip) {
  const net = require("node:net");
  if (net.isIPv4(ip)) return /^(0|10|127)\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\.|^192\.168\.|^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|^(22[4-9]|2[3-5]\d)\./.test(ip);
  const h = ip.toLowerCase(); return h === "::1" || h === "::" || /^(fc|fd|fe[89ab]|ff)/.test(h) || h.startsWith("::ffff:") || h.startsWith("2001:db8");
}
async function safeFetch(raw, init = {}) {
  const u = new URL(raw);
  if (!["http:", "https:"].includes(u.protocol) || u.username || u.password || u.hash) throw new Error("رابط غير مسموح");
  const dns = require("node:dns").promises;
  const { address } = await Promise.race([dns.lookup(u.hostname), new Promise((_, b) => setTimeout(() => b(new Error("DNS")), 4000))]);
  if (privateIp(address)) throw new Error("عنوان داخلي غير مسموح");
  const mod = require(u.protocol === "https:" ? "node:https" : "node:http");
  return new Promise((ok, bad) => {
    const r = mod.request(u, { method: init.method || "GET", headers: { "accept-encoding": "identity", ...(init.headers || {}) }, timeout: 12000,
      lookup: (_h, _o, cb) => cb(null, address, address.includes(":") ? 6 : 4) }, (resp) => {
      if (resp.statusCode < 200 || resp.statusCode > 299) { resp.resume(); return bad(new Error("خدمة التفعيل لم تستجب")); }
      const chunks = []; let n = 0;
      resp.on("data", (c) => { n += c.length; if (n > 256 * 1024) { r.destroy(); bad(new Error("رد كبير")); } else chunks.push(c); });
      resp.on("end", () => ok(Buffer.concat(chunks)));
    });
    r.on("timeout", () => r.destroy(new Error("انتهت المهلة"))); r.on("error", bad);
    if (init.body) r.write(init.body); r.end();
  });
}
/* ---------- built-in activation codes (BH-) — same rules as the cloud panel ---------- */
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const genCode = () => "BH-" + [0, 1, 2].map(() => Array.from(crypto.randomBytes(4)).map((b) => CODE_CHARS[b % CODE_CHARS.length]).join("")).join("-");
const codeHash = (c) => crypto.createHash("sha256").update(c.trim().toUpperCase()).digest("hex");
function redeemBuiltin(code, mac, res, cors) {
  if (!featureEnabled("activation")) return send(res, 403, { error: "تفعيل الأكواد غير متاح لهذا التطبيق" }, cors);
  const c = db.codes.find((x) => x.hash === codeHash(code));
  if (!c || !c.enabled) return send(res, 400, { error: "كود التفعيل غير صحيح" }, cors);
  if (c.device && c.device !== mac) return send(res, 403, { error: "هذا الكود مفعّل على جهاز آخر" }, cors);
  const sv = db.servers.find((x) => x.id === c.source_id && x.enabled);
  if (!sv) return send(res, 400, { error: "السيرفر المرتبط بالكود غير متاح" }, cors);
  if (!c.device) { c.device = mac; c.activated_at = now(); save(); }
  return send(res, 200, { serverId: sv.id, sourceId: sv.id, username: c.username, password: c.password, hosts: [sv.url, ...sv.backup_urls] }, cors);
}

async function activateRoute(req, res, cors) {
  const ip = req.headers["x-real-ip"] || req.socket.remoteAddress; const t = Date.now();
  const h = (actHits.get(ip) || []).filter((x) => t - x < 600_000); h.push(t); actHits.set(ip, h);
  if (actHits.size > 5000) actHits.delete(actHits.keys().next().value);
  if (h.length > 30 || actRunning >= 8) return send(res, 429, { error: "محاولات كثيرة، انتظر قليلًا" }, cors);
  let b; try { b = await body(req, 4096); } catch { return send(res, 413, { error: "طلب كبير" }, cors); }
  const code = String(b.code || ""), mac = String(b.deviceId || "").toUpperCase(), sc = String(b.serverId || b.serverCode || "");
  if (!/^[\x20-\x7e]{1,128}$/.test(code) || !/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(mac) || (sc && !/^\d{1,6}$/.test(sc))) return send(res, 400, { error: "بيانات غير صحيحة" }, cors);
  if (code.trim().toUpperCase().startsWith("BH-")) return redeemBuiltin(code, mac, res, cors);
  const list = db.servers.filter((x) => x.enabled && x.type === "xtream" && x.activation_api_url);
  const sv = sc ? list.find((x) => x.login_code === sc) : list.length === 1 ? list[0] : null;
  if (!sv) return send(res, 400, { error: list.length ? "كود السيرفر غير صحيح" : "تفعيل الأكواد غير متاح" }, cors);
  const rid = crypto.createHash("sha256").update(`${sv.id}|${sv.activation_api_url}|${mac}|${code}`).digest("hex");
  const rf = path.join(RECEIPTS, rid + ".json");
  const reply = (r) => send(res, 200, { serverId: sv.id, sourceId: sv.id, username: r.username, password: r.password, hosts: [sv.url, ...sv.backup_urls] }, cors);
  if (fs.existsSync(rf)) return reply(readJson(rf, {}));
  const lock = sv.id + "|" + code; if (actLocks.has(lock)) return send(res, 409, { error: "جارٍ تفعيل هذا الرمز" }, cors);
  actLocks.add(lock); actRunning++;
  try {
    const cfg = JSON.parse((await safeFetch(sv.activation_api_url)).toString("utf8"));
    const key = String(cfg.xor_key || ""), ua = String(cfg.user_agent || "Mozilla/5.0 IPTVPlayer").replace(/[\r\n]/g, "").slice(0, 256);
    if (!cfg.activation_base_url || !key || key.length > 256) throw new Error("إعدادات خدمة التفعيل غير صالحة");
    const payload = JSON.stringify({ mode: "active", code, mac, sn: mac, chipid: "000000", model: str(b.model, 60) || "Android TV", firmware_ver: str(b.firmware, 20) || "12" });
    const raw = await safeFetch(String(cfg.activation_base_url), { method: "POST", body: new URLSearchParams({ json: xorStr(payload, key) }).toString(), headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": ua } });
    let r; try { r = JSON.parse(xorStr(raw.toString("latin1"), key)); } catch { throw new Error("رد خدمة التفعيل غير مفهوم"); }
    if (Number(r.status) !== 101 || r.username == null || r.password == null) return send(res, 400, { error: String(r.message || "رمز التفعيل غير صحيح").replace(/[\u0000-\u001f<>]/g, "").slice(0, 240) }, cors);
    const out = { username: String(r.username), password: String(r.password), at: now() };
    fs.writeFileSync(rf + ".tmp", JSON.stringify(out), { mode: 0o600 }); fs.renameSync(rf + ".tmp", rf);
    return reply(out);
  } catch (e) { return send(res, 502, { error: e.message || "تعذر التفعيل" }, cors); }
  finally { actLocks.delete(lock); actRunning--; }
}


/* ---------- signed config (compatible with panel.bhsat.me: /config/servers.json + /config/app-release.json) ---------- */
const PRIV = path.join(DATA, "private.pem"), PUB = path.join(DATA, "public.pem");
if (!fs.existsSync(PRIV)) {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 3072 });
  fs.writeFileSync(PRIV, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
  fs.writeFileSync(PUB, publicKey.export({ type: "spki", format: "pem" }));
}
function signed(obj) {
  const payload = Buffer.from(JSON.stringify(obj), "utf8");
  return { payload: payload.toString("base64"), signature: crypto.sign("sha256", payload, fs.readFileSync(PRIV, "utf8")).toString("base64") };
}
function serversJson() {
  const s = db.settings;
  return signed({ revision: db.changes.length, settings: { logoUrl: s.logo, storeUrl: s.store_url || "", supportNumbers: [s.whatsapp, s.phone].filter(Boolean) },
    servers: db.servers.filter((x) => x.enabled).map((x) => ({ id: x.id, loginCode: x.login_code, name: x.name, type: x.type, url: x.url, backupUrls: x.backup_urls, enabled: true, activationEnabled: !!x.activation_api_url })) });
}

/* ---------- router ---------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const p = url.pathname;
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type", "cache-control": "no-store" };
  try {
    // ----- public API used by the APK -----
    if (p.startsWith("/api/public/")) {
      if (req.method === "OPTIONS") return send(res, 204, "", { ...cors, "access-control-allow-methods": "GET,POST" });
      if (p === "/api/public/config") return send(res, 200, publicConfig(), cors);
      if (p === "/api/public/server" && req.method === "POST") {
        const b = await body(req, 10000); const code = str(b.code, 40); const sid = str(b.id, 40);
        const list = db.servers.filter((x) => x.enabled && (code ? x.login_code === code : sid ? x.id === sid : true));
        if (!list.length) return send(res, 404, { error: "كود السيرفر غير صحيح" }, cors);
        return send(res, 200, { servers: list.map((x) => ({ id: x.id, type: x.type, name: x.name, hosts: [x.url, ...x.backup_urls], activation_api_url: x.activation_api_url || null })) }, cors);
      }
      if (p === "/api/public/activate" && req.method === "POST") return activateRoute(req, res, cors);
      return send(res, 404, { error: "not found" }, cors);
    }
    if (p === "/config/servers.json") return send(res, 200, serversJson(), cors);
    if (p === "/config/app-release.json") { const s = db.settings; return send(res, 200, signed({ latestVersion: s.latest_version, minVersion: s.min_version, updateUrl: s.update_url || "" }), cors); }
    if (p === "/config/public.pem") return send(res, 200, fs.readFileSync(PUB, "utf8"), cors);
    if (p === "/api/activate" && req.method === "POST") return activateRoute(req, res, cors);
    if (p === "/health") return send(res, 200, { ok: true, version: VERSION });
    if (p.startsWith("/uploads/")) { const f = path.join(UPLOADS, path.basename(p)); return serveFile(res, f, true); }

    // ----- auth -----
    if (p === "/api/login" && req.method === "POST") {
      const ip = req.socket.remoteAddress; const a = attempts.get(ip) || { n: 0, t: Date.now() };
      if (a.n >= 8 && Date.now() - a.t < 10 * 60_000) return send(res, 429, { error: "محاولات كثيرة، انتظر 10 دقائق" });
      const b = await body(req, 10000);
      const u = db.users.find((x) => x.username === str(b.username, 60).toLowerCase());
      if (!u || !checkPw(u, String(b.password || ""))) { attempts.set(ip, { n: a.n + 1, t: a.n ? a.t : Date.now() }); return send(res, 401, { error: "اسم المستخدم أو كلمة المرور غير صحيحة" }); }
      attempts.delete(ip);
      const sid = crypto.randomBytes(32).toString("hex");
      db.sessions[sid] = { user: u.username, exp: Date.now() + 7 * 86400_000 };
      for (const [k, v] of Object.entries(db.sessions)) if (v.exp < Date.now()) delete db.sessions[k];
      save();
      return send(res, 200, { ok: true }, { "set-cookie": `sid=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800` });
    }
    if (p.startsWith("/api/")) {
      const s = session(req);
      if (!s) return send(res, 401, { error: "سجّل الدخول" });
      const who = s.user;
      const feature = p.startsWith("/api/servers") ? "servers" : p.startsWith("/api/notifications") ? "notify" : p.startsWith("/api/codes") ? "activation" : ["/api/backups","/api/backup","/api/restore","/api/backup-test"].includes(p) ? "backup" : p==="/api/upload" ? "brand" : null;
      if(feature && !featureEnabled(feature)) return send(res,403,{error:"الميزة غير متاحة لهذا التطبيق"});
      if (p === "/api/logout") { delete db.sessions[s.sid]; save(); return send(res, 200, { ok: true }, { "set-cookie": "sid=; Path=/; Max-Age=0" }); }
      if (p === "/api/logout-all") { for (const [k, v] of Object.entries(db.sessions)) if (v.user === who) delete db.sessions[k]; save(); return send(res, 200, { ok: true }); }
      if (p === "/api/me") return send(res, 200, { user: who, version: VERSION, users: db.users.map((u) => u.username) });
      if (p === "/api/state") return send(res, 200, { settings: db.settings, servers: featureEnabled("servers") ? db.servers : [], notifications: featureEnabled("notify") ? db.notifications : [], codes: featureEnabled("activation") ? db.codes.map(({ id, hint, mode, source_id, username, device, enabled, created_at, activated_at }) => ({ id, hint, mode, source_id, username, bound: !!device, enabled, created_at, activated_at: activated_at || null })) : [], features: manifest?.features ?? null, hosts_used: hostsUsed() });
      if (p === "/api/changes") return send(res, 200, db.changes);
      if (p === "/api/backups") return send(res, 200, fs.readdirSync(BACKUPS).filter((x) => x.startsWith("db-")).sort().reverse());

      if (p === "/api/settings" && req.method === "PUT") {
        const b = await body(req); if(!rules.settingsAllowed(manifest,b)) return send(res,403,{error:"هذه الإعدادات تخص الإدارة أو لم تعتمد للتطبيق"}); const s0 = db.settings; const next = { ...s0 };
        for (const k of ["name", "whatsapp", "telegram", "facebook", "website", "email", "phone", "store_url", "notice", "update_url", "theme"]) if (k in b) next[k] = str(b[k], k === "notice" ? 3000 : 300);
        for (const k of ["latest_version", "min_version"]) if (k in b) { if (!/^\d+\.\d+\.\d+$/.test(b[k])) return send(res, 400, { error: "صيغة النسخة 1.0.0" }); next[k] = b[k]; }
        if (b.colors) { for (const v of Object.values(b.colors)) if (!isHex(v)) return send(res, 400, { error: "كود لون غير صحيح" }); next.colors = { ...DEFAULT_COLORS, ...b.colors }; }
        if ("logo" in b) next.logo = b.logo === null ? null : str(b.logo, 200);
        if ("banner" in b) next.banner = b.banner === null ? null : str(b.banner, 200);
        db.settings = next; log(who, str(b._section, 40) || "الإعدادات", str(b._summary, 200) || "تحديث الإعدادات");
        return send(res, 200, { ok: true });
      }
      if (p === "/api/upload" && req.method === "POST") {
        const b = await body(req, 6 * 1024 * 1024);
        const m = /^data:image\/(png|jpeg|webp);base64,(.+)$/.exec(String(b.data || ""));
        if (!m) return send(res, 400, { error: "صورة غير مدعومة" });
        const name = `${Date.now()}-${id()}.${m[1] === "jpeg" ? "jpg" : m[1]}`;
        fs.writeFileSync(path.join(UPLOADS, name), Buffer.from(m[2], "base64"));
        return send(res, 200, { url: `/uploads/${name}` });
      }
      // servers
      if (p === "/api/servers" && req.method === "POST") {
        if (db.servers.length >= 50) return send(res, 400, { error: "الحد الأقصى 50 سيرفر" });
        const sv = { id: id(), created_at: now(), ...cleanServer({ name: `سيرفر ${db.servers.length + 1}`, url: "http://", login_code: String(db.servers.length + 1) }) };
        if (hostsUsed() + 1 > db.settings.max_hosts) return send(res, 400, { error: "تجاوزت الحد المسموح من الهوستات" });
        db.servers.push(sv); log(who, "السيرفرات", `إضافة ${sv.name}`); return send(res, 200, sv);
      }
      let m = /^\/api\/servers\/([a-f0-9]+)(\/check)?$/.exec(p);
      if (m) {
        const i = db.servers.findIndex((x) => x.id === m[1]); if (i < 0) return send(res, 404, { error: "غير موجود" });
        if (m[2]) {
          const sv = db.servers[i]; const results = await Promise.all([sv.url, ...sv.backup_urls].map(checkUrl));
          sv.last_check_ok = results.some((r) => r.ok); sv.last_check_at = now(); save(); return send(res, 200, { ok: sv.last_check_ok, results });
        }
        if (req.method === "DELETE") { const [x] = db.servers.splice(i, 1); log(who, "السيرفرات", `حذف ${x.name}`); return send(res, 200, { ok: true }); }
        if (req.method === "PUT") {
          const next = cleanServer(await body(req, 50000), db.servers[i]);
          const others = hostsUsed() - 1 - db.servers[i].backup_urls.length;
          if (others + 1 + next.backup_urls.length > db.settings.max_hosts) return send(res, 400, { error: "تجاوزت الحد المسموح من الهوستات" });
          if (next.login_code && db.servers.some((x, j) => j !== i && x.login_code === next.login_code)) return send(res, 400, { error: "كود الدخول مستخدم لسيرفر آخر" });
          db.servers[i] = next; log(who, "السيرفرات", `تعديل ${next.name}`); return send(res, 200, next);
        }
      }
      // notifications
      if (p === "/api/notifications" && req.method === "POST") {
        const b = await body(req, 50000); if (!str(b.title)) return send(res, 400, { error: "العنوان مطلوب" });
        const days = Number(b.days) || 0;
        const n = { id: id(), title: str(b.title, 150), body: str(b.body, 3000), image_url: b.image_url ? str(b.image_url, 200) : null, kind: str(b.kind, 20) || "info", active: true, created_at: now(), expires_at: days ? new Date(Date.now() + days * 86400_000).toISOString() : null };
        db.notifications.unshift(n); log(who, "الإشعارات", `إرسال: ${n.title}`); return send(res, 200, n);
      }
      m = /^\/api\/notifications\/([a-f0-9]+)$/.exec(p);
      if (m) {
        const i = db.notifications.findIndex((x) => x.id === m[1]); if (i < 0) return send(res, 404, { error: "غير موجود" });
        if (req.method === "DELETE") { db.notifications.splice(i, 1); save(); return send(res, 200, { ok: true }); }
        if (req.method === "PUT") { const b = await body(req, 10000); db.notifications[i].active = !!b.active; save(); return send(res, 200, { ok: true }); }
      }
      // backup
      if (p === "/api/backup" && req.method === "POST") {
        const b = await body(req, 10000); const pass = String(b.password || "");
        if (pass.length < 8) return send(res, 400, { error: "كلمة حماية النسخة 8 أحرف على الأقل" });
        const { sessions, ...rest } = db; log(who, "النسخ الاحتياطي", "تحميل نسخة مشفرة");
        return send(res, 200, encrypt(JSON.stringify({ ...rest, uploads: fs.readdirSync(UPLOADS).map((f) => [f, fs.readFileSync(path.join(UPLOADS, f)).toString("base64")]) }), pass), { "content-type": "application/json", "content-disposition": `attachment; filename="panel-backup-${new Date().toISOString().slice(0, 10)}.bhsat"` });
      }
      if (p === "/api/restore" && req.method === "POST") {
        const b = await body(req, 60 * 1024 * 1024);
        let j; try { j = JSON.parse(decrypt(String(b.file || ""), String(b.password || ""))); } catch { return send(res, 400, { error: "كلمة الحماية غير صحيحة أو الملف تالف" }); }
        if (!j.settings || !Array.isArray(j.servers)) return send(res, 400, { error: "ملف غير صالح" });
        if(!rules.restoreAllowed(manifest,db,j)) return send(res,403,{error:"النسخة تغير هوية التطبيق أو ميزاته المقفلة"});
        fs.copyFileSync(DB_FILE, path.join(BACKUPS, `before-restore-${Date.now()}.json`));
        for (const [f, data] of j.uploads || []) fs.writeFileSync(path.join(UPLOADS, path.basename(f)), Buffer.from(data, "base64"));
        db = { settings: j.settings, servers: j.servers, notifications: j.notifications || [], changes: j.changes || [], users: j.users?.length ? j.users : db.users, sessions: {} };
        log(who, "النسخ الاحتياطي", "استعادة نسخة"); return send(res, 200, { ok: true });
      }
      if (p === "/api/backup-test") {
        const f = fs.readdirSync(BACKUPS).filter((x) => x.startsWith("db-")).sort().pop();
        try { const j = JSON.parse(fs.readFileSync(path.join(BACKUPS, f), "utf8")); return send(res, 200, { ok: !!j.settings, file: f, servers: j.servers.length }); }
        catch { return send(res, 200, { ok: false }); }
      }
      // security
      if (p === "/api/password" && req.method === "POST") {
        const b = await body(req, 10000); const u = db.users.find((x) => x.username === who);
        if (!checkPw(u, String(b.current || ""))) return send(res, 400, { error: "كلمة المرور الحالية غير صحيحة" });
        const np = String(b.password || ""); if (np.length < 10) return send(res, 400, { error: "كلمة المرور 10 أحرف على الأقل" });
        Object.assign(u, hashPw(np));
        const nu = str(b.username, 40).toLowerCase();
        if (nu && nu !== u.username) { if (!/^[a-z0-9._-]{3,40}$/.test(nu)) return send(res, 400, { error: "اسم الدخول: حروف إنجليزية وأرقام فقط" }); u.username = nu; for (const v of Object.values(db.sessions)) if (v.user === who) v.user = nu; }
        try { fs.unlinkSync(path.join(DATA, "initial-login.txt")); } catch {}
        log(nu || who, "الأمان", "تغيير بيانات الدخول"); return send(res, 200, { ok: true });
      }
      if (p === "/api/users" && req.method === "POST") {
        const b = await body(req, 10000); const un = str(b.username, 40).toLowerCase(); const pw = String(b.password || "");
        if (!/^[a-z0-9._-]{3,40}$/.test(un) || pw.length < 10) return send(res, 400, { error: "اسم صحيح وكلمة مرور 10 أحرف" });
        if (db.users.some((x) => x.username === un)) return send(res, 400, { error: "الاسم موجود" });
        db.users.push({ username: un, ...hashPw(pw) }); log(who, "الأمان", `إضافة موظف ${un}`); return send(res, 200, { ok: true });
      }
      m = /^\/api\/users\/([a-z0-9._-]+)$/.exec(p);
      if (m && req.method === "DELETE") {
        if (m[1] === who) return send(res, 400, { error: "لا يمكنك حذف حسابك" });
        db.users = db.users.filter((x) => x.username !== m[1]); for (const [k, v] of Object.entries(db.sessions)) if (v.user === m[1]) delete db.sessions[k];
        log(who, "الأمان", `حذف موظف ${m[1]}`); return send(res, 200, { ok: true });
      }
      return send(res, 404, { error: "not found" });
    }
    // ----- static UI -----
    const f = path.join(ROOT, "public", p === "/" ? "index.html" : path.normalize(p).replace(/^(\.\.[/\\])+/, ""));
    if (f.startsWith(path.join(ROOT, "public")) && fs.existsSync(f) && fs.statSync(f).isFile()) return serveFile(res, f, false);
    return serveFile(res, path.join(ROOT, "public", "index.html"), false);
  } catch (e) {
    send(res, 500, { error: e.message || "خطأ" });
  }
});
server.listen(PORT, process.env.HOST || "0.0.0.0", () => console.log(`Bahrain Satellite Panel v${VERSION} → http://localhost:${PORT}`));
module.exports = server;
