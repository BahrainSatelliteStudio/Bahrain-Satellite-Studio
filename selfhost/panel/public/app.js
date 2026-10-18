"use strict";
const $ = (s, el = document) => el.querySelector(s);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let S = null, ME = null, SEC = "home";

function toast(msg, bad) { const t = $("#toast"); t.textContent = msg; t.className = "show" + (bad ? " bad" : ""); clearTimeout(t._t); t._t = setTimeout(() => (t.className = ""), 3000); }
async function api(path, opts = {}) {
  const r = await fetch(path, { method: opts.method || (opts.body ? "POST" : "GET"), headers: opts.body ? { "content-type": "application/json" } : {}, body: opts.body ? JSON.stringify(opts.body) : undefined, credentials: "same-origin" });
  if (r.status === 401 && path !== "/api/login") { showLogin(); throw new Error("سجّل الدخول"); }
  const ct = r.headers.get("content-type") || "";
  const data = ct.includes("json") ? await r.json() : await r.text();
  if (!r.ok) throw new Error((data && data.error) || "خطأ");
  return data;
}
const run = (fn) => async (...a) => { try { await fn(...a); } catch (e) { toast(e.message, true); } };
const fileToData = (f) => new Promise((ok, bad) => { if (f.size > 4 * 1024 * 1024) return bad(new Error("الحد الأقصى 4MB")); const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = bad; r.readAsDataURL(f); });
const upload = async (f) => (await api("/api/upload", { body: { data: await fileToData(f) } })).url;
const fmt = (d) => (d ? new Date(d).toLocaleString("ar") : "—");

const SECTIONS = [["home", "الرئيسية", "▦"], ["servers", "السيرفرات والهوستات", "▤"], ["codes", "أكواد التفعيل", "⚷"], ["brand", "هوية التطبيق والألوان", "◆"], ["contact", "روابط التواصل والدعم", "☎"], ["notify", "الإشعارات الجماعية", "🔔"], ["updates", "تحديثات التطبيق", "↓"], ["changes", "سجل التغييرات", "⟲"], ["backup", "النسخ الاحتياطي", "⛁"], ["security", "أمان حسابي", "⚿"]];

function showLogin() { $("#app").classList.add("hidden"); $("#login").classList.remove("hidden"); }
$("#loginForm").onsubmit = async (e) => {
  e.preventDefault(); const f = new FormData(e.target); $("#loginErr").textContent = "";
  try { await api("/api/login", { body: { username: f.get("username"), password: f.get("password") } }); boot(); } catch (er) { $("#loginErr").textContent = er.message; }
};
$("#logout").onclick = run(async () => { await api("/api/logout", { body: {} }); showLogin(); });
$("#menuBtn").onclick = () => $("#side").classList.toggle("open");

async function load() { S = await api("/api/state"); applyBrand(); }
function applyBrand() {
  const c = S.settings.colors; const r = document.documentElement.style;
  r.setProperty("--p", c.primary); r.setProperty("--a", c.accent);
  $("#sideName").textContent = S.settings.name; $("#eyebrow").textContent = S.settings.name;
  for (const id of ["#sideLogo", "#loginLogo"]) { const i = $(id); if (S.settings.logo) { i.src = S.settings.logo; i.classList.remove("hidden"); } else i.classList.add("hidden"); }
  document.title = `${S.settings.name} — لوحة الإدارة`;
}
async function boot() {
  try { ME = await api("/api/me"); } catch { return; }
  $("#login").classList.add("hidden"); $("#app").classList.remove("hidden");
  $("#who").textContent = ME.user; $("#ver").textContent = ME.version;
  await load(); go(SEC);
}
function go(sec) {
  const sections = SECTIONS.filter(([k])=>{const fk=k==='codes'?'activation':k;return !S.features || ['home','changes','security'].includes(k) || S.features.includes(fk) && !['brand','themes'].includes(k);});
  if(!sections.some(([k])=>k===sec))sec='home';
  SEC = sec; $("#side").classList.remove("open");
  $("#nav").innerHTML = sections.map(([k, l, i]) => `<button data-k="${k}" class="${k === sec ? "on" : ""}"><span>${i}</span>${l}</button>`).join("");
  $("#nav").querySelectorAll("button").forEach((b) => (b.onclick = () => go(b.dataset.k)));
  $("#title").textContent = SECTIONS.find((s) => s[0] === sec)[1];
  VIEWS[sec]($("#view"));
}
const reload = async () => { await load(); go(SEC); };
const sw = (on, attr) => `<label class="switch" style="margin:0"><input type="checkbox" ${attr} ${on ? "checked" : ""}><span></span></label>`;
async function saveSettings(patch, section, summary) { await api("/api/settings", { method: "PUT", body: { ...patch, _section: section, _summary: summary } }); toast("تم الحفظ — يظهر في التطبيقات فورًا"); await reload(); }

const VIEWS = {
  home(v) {
    const live = S.notifications.filter((n) => n.active && (!n.expires_at || new Date(n.expires_at) > new Date()));
    const max = S.settings.max_hosts;
    v.innerHTML = `
    <div class="grid g3">
      <div class="card stat"><p class="muted">السيرفرات</p><div class="n">${S.servers.length}<small>/ 50</small></div><p class="muted">${S.servers.filter((s) => s.enabled).length} مفعّل</p></div>
      <div class="card stat"><p class="muted">الهوستات المستخدمة</p><div class="n" style="color:var(--p)">${S.hosts_used}<small>/ ${max}</small></div><div class="bar"><i style="width:${Math.min(100, (S.hosts_used / max) * 100)}%"></i></div></div>
      <div class="card stat"><p class="muted">التطبيق</p><div class="n" style="font-size:20px">${esc(S.settings.name)}</div><p class="muted">v${esc(S.settings.latest_version)} · ${esc(S.settings.email || "")}</p></div>
    </div>
    <div class="card"><h2>رابط ربط التطبيق</h2><p class="muted">هذا الرابط يُكتب في التطبيق عند البناء ليقرأ إعداداتك من سيرفرك:</p>
      <div class="row"><code class="sp" dir="ltr" style="background:var(--sf2);padding:12px;border-radius:10px">${location.origin}/api/public/config</code><button class="btn" id="cp">نسخ</button></div></div>
    <div class="row" style="margin-bottom:18px"><button class="btn primary" data-go="servers">إدارة الهوستات</button><button class="btn" data-go="notify">إرسال إشعار</button><button class="btn" data-go="brand">تغيير الثيم</button></div>
    <div class="card"><h2>الإشعارات الفعّالة</h2>${live.length ? live.map((n) => `<p><b>${esc(n.title)}</b><br><span class="muted">${esc(n.body)}</span></p>`).join("") : '<p class="muted center">لا توجد إشعارات منشورة حاليًا.</p>'}</div>`;
    $("#cp").onclick = () => { navigator.clipboard?.writeText(`${location.origin}/api/public/config`); toast("تم النسخ"); };
    v.querySelectorAll("[data-go]").forEach((b) => { if(S.features && (!S.features.includes(b.dataset.go) || b.dataset.go==="brand"))b.remove(); else b.onclick = () => go(b.dataset.go); });
  },

  servers(v) {
    v.innerHTML = `<div class="grid g3"><div class="card stat"><p class="muted">السيرفرات</p><div class="n">${S.servers.length}<small>/ 50</small></div></div><div class="card stat"><p class="muted">المفعّلة</p><div class="n">${S.servers.filter((s) => s.enabled).length}</div></div><div class="card stat"><p class="muted">الهوستات لكل سيرفر</p><div class="n">8<small>أساسي و7 احتياطية</small></div></div></div>
    <div class="row" style="margin-bottom:18px"><input id="q" placeholder="ابحث بالاسم أو كود الدخول" style="max-width:360px;margin:0"><span class="sp"></span><button class="btn primary" id="add">+ إضافة سيرفر</button></div><div id="list"></div>`;
    const draw = () => {
      const q = $("#q").value.trim();
      $("#list").innerHTML = S.servers.filter((s) => !q || s.name.includes(q) || (s.login_code || "").includes(q)).map((s, i) => `
      <div class="card" data-id="${s.id}">
        <div class="srv-head"><span class="tag">#${i + 1}</span><b>${esc(s.name)}</b>${s.last_check_at ? `<small class="${s.last_check_ok ? "ok" : "err"}">● ${s.last_check_ok ? "متصل" : "لا يستجيب"}</small>` : ""}<span class="sp"></span>${sw(s.enabled, 'data-en')}<span>${s.enabled ? "مفعّل" : "متوقف"}</span><button class="link" style="color:var(--er)" data-del>حذف</button></div>
        <div class="grid g3"><label>اسم السيرفر<input data-f="name" value="${esc(s.name)}"></label>
          <label>النوع<select data-f="type">${["xtream", "m3u", "mac"].map((t) => `<option value="${t}" ${s.type === t ? "selected" : ""}>${{ xtream: "Xtream Codes", m3u: "M3U", mac: "MAC Portal" }[t]}</option>`).join("")}</select></label>
          <label>كود الدخول في التطبيق<input dir="ltr" data-f="login_code" value="${esc(s.login_code)}"></label></div>
        <label>الهوست الأساسي<input dir="ltr" data-f="url" value="${esc(s.url)}" placeholder="http://server.com:8080"></label>
        <p class="muted" style="font-size:13px">المشترك يكتب كود الدخول، أو يتركه فارغًا ويبحث التطبيق بالاسم وكلمة المرور.</p>
        <div class="row"><b>الهوستات الاحتياطية <span data-cnt>${s.backup_urls.length}</span> / 7</b><span class="sp"></span><button class="btn sm" data-addb>+ إضافة احتياطي</button></div>
        <div data-backups>${s.backup_urls.map((u) => `<div class="row"><input dir="ltr" data-b value="${esc(u)}" class="sp"><button class="btn sm danger" data-rmb>✕</button></div>`).join("")}</div>
        <label style="margin-top:14px">رابط API لتفعيل الأكواد (اختياري)<input dir="ltr" data-f="activation_api_url" value="${esc(s.activation_api_url)}" placeholder="https://provider.example/api/activate"></label>
        <div class="row"><button class="btn primary" data-save>حفظ السيرفر</button><button class="btn" data-check>↻ فحص الاتصال</button><small class="muted">الفحص لا يتحقق من صلاحية الاشتراك</small></div><div data-res></div>
      </div>`).join("") || '<div class="card center muted">لا توجد سيرفرات. اضغط «إضافة سيرفر».</div>';
      $("#list").querySelectorAll(".card[data-id]").forEach((el) => {
        const sid = el.dataset.id;
        const bwrap = $("[data-backups]", el);
        const bind = () => bwrap.querySelectorAll("[data-rmb]").forEach((b) => (b.onclick = () => { b.parentElement.remove(); $("[data-cnt]", el).textContent = bwrap.children.length; }));
        bind();
        $("[data-addb]", el).onclick = () => { if (bwrap.children.length >= 7) return toast("الحد 7 احتياطية", true); bwrap.insertAdjacentHTML("beforeend", '<div class="row"><input dir="ltr" data-b class="sp" placeholder="http://backup.com:8080"><button class="btn sm danger" data-rmb>✕</button></div>'); $("[data-cnt]", el).textContent = bwrap.children.length; bind(); };
        $("[data-save]", el).onclick = run(async () => {
          const b = {}; el.querySelectorAll("[data-f]").forEach((i) => (b[i.dataset.f] = i.value));
          b.backup_urls = [...el.querySelectorAll("[data-b]")].map((i) => i.value.trim()).filter(Boolean);
          await api(`/api/servers/${sid}`, { method: "PUT", body: b }); toast("تم حفظ السيرفر"); await reload();
        });
        $("[data-en]", el).onchange = run(async (e) => { await api(`/api/servers/${sid}`, { method: "PUT", body: { enabled: e.target.checked } }); await reload(); });
        $("[data-del]", el).onclick = run(async () => { if (!confirm("حذف السيرفر؟")) return; await api(`/api/servers/${sid}`, { method: "DELETE" }); await reload(); });
        $("[data-check]", el).onclick = run(async (e) => {
          e.target.disabled = true; e.target.textContent = "جاري الفحص...";
          const r = await api(`/api/servers/${sid}/check`, { body: {} });
          $("[data-res]", el).innerHTML = r.results.map((x) => `<p dir="ltr" class="${x.ok ? "ok" : "err"}">${x.ok ? "✓" : "✗"} ${esc(x.url)} · ${x.ms}ms</p>`).join("");
          e.target.disabled = false; e.target.textContent = "↻ فحص الاتصال";
        });
      });
    };
    $("#q").oninput = draw;
    $("#add").onclick = run(async () => { await api("/api/servers", { body: {} }); await reload(); });
    draw();
  },

  brand(v) {
    const PRESETS = {
      "Bahrain Satellite": ["bhsat", { primary: "#FBBD23", secondary: "#303540", accent: "#DCA518", background: "#14181F", surface: "#20242C", text: "#F8F8F6", button: "#20242C" }],
      "Dark Purple VIP": ["default", { primary: "#8B5CF6", secondary: "#2E2545", accent: "#C084FC", background: "#120E1C", surface: "#1E1830", text: "#F5F3FF", button: "#2E2545" }],
      "Cyber Neon": ["default", { primary: "#22C55E", secondary: "#1F2937", accent: "#06B6D4", background: "#0A0F0D", surface: "#141C18", text: "#ECFDF5", button: "#1F2937" }],
      "Classic Gold": ["cinema", { primary: "#F59E0B", secondary: "#3A2A12", accent: "#FCD34D", background: "#140F08", surface: "#221A10", text: "#FFFBEB", button: "#3A2A12" }],
      "Ocean Blue": ["blue", { primary: "#0EA5E9", secondary: "#1E3A5F", accent: "#38BDF8", background: "#0B1220", surface: "#132036", text: "#F0F9FF", button: "#1E3A5F" }],
    };
    const F = [["primary", "اللون الأساسي"], ["secondary", "اللون الثانوي"], ["accent", "اللون المميز"], ["background", "الخلفية"], ["surface", "البطاقات"], ["text", "النص"], ["button", "الأزرار"]];
    let col = { ...S.settings.colors }, theme = S.settings.theme;
    const s = S.settings;
    v.innerHTML = `
    <div class="card"><h2>الشعار والبنر والاسم</h2><div class="grid g2">
      <div><label>الشعار (PNG شفاف 512×512)</label>${s.logo ? `<img class="logo-prev" src="${esc(s.logo)}">` : '<p class="muted">لا يوجد شعار</p>'}<input type="file" id="logoF" accept="image/png,image/jpeg,image/webp"></div>
      <div><label>البنر (1920×1080)</label>${s.banner ? `<img class="img-prev" src="${esc(s.banner)}">` : '<div class="img-prev"></div>'}<div class="row"><input type="file" id="banF" accept="image/*" class="sp">${s.banner ? '<button class="btn" id="banDel">حذف</button>' : ""}</div></div></div>
      <div class="row" style="margin-top:14px"><input id="nm" value="${esc(s.name)}" class="sp" style="margin:0"><button class="btn primary" id="nmS">حفظ الاسم</button></div></div>
    <div class="card"><h2>الثيم والألوان</h2>
      <div class="grid g5" id="presets">${Object.entries(PRESETS).map(([k, [, c]]) => `<button class="btn preset" data-p="${esc(k)}"><div class="dots">${[c.primary, c.background, c.accent].map((x) => `<i style="background:${x}"></i>`).join("")}</div>${esc(k)}</button>`).join("")}</div>
      <div class="card" style="background:var(--sf2);margin-top:14px"><b>توليد ثيم كامل من لونين</b><div class="row" style="margin-top:8px"><input id="g1" dir="ltr" value="${col.primary}" style="max-width:140px;margin:0" placeholder="Main"><input id="g2" dir="ltr" value="${col.background}" style="max-width:140px;margin:0" placeholder="Second"><button class="btn" id="gen">توليد</button></div></div>
      <div class="grid g2" id="cols"></div>
      <label>معاينة</label><div id="prev" style="border-radius:16px;padding:16px"></div>
      <button class="btn primary" id="saveTheme" style="margin-top:14px">حفظ الثيم</button></div>`;
    const valid = (x) => /^#[0-9A-Fa-f]{6}$/.test(x);
    const mix = (hex, amt) => { const n = parseInt(hex.slice(1), 16); const f = (x) => Math.round(amt < 0 ? x * (1 + amt) : x + (255 - x) * amt); return "#" + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase(); };
    const drawCols = () => {
      $("#cols").innerHTML = F.map(([k, l]) => `<label>${l}<div class="swatch"><input type="color" data-c="${k}" value="${valid(col[k]) ? col[k] : "#000000"}"><input dir="ltr" data-h="${k}" value="${col[k]}"></div></label>`).join("");
      $("#cols").querySelectorAll("[data-c]").forEach((i) => (i.oninput = () => { col[i.dataset.c] = i.value.toUpperCase(); drawCols(); }));
      $("#cols").querySelectorAll("[data-h]").forEach((i) => (i.onchange = () => { col[i.dataset.h] = i.value.trim(); drawCols(); }));
      $("#prev").style.background = col.background; $("#prev").style.color = col.text;
      $("#prev").innerHTML = `<b style="color:${col.primary}">${esc($("#nm").value)}</b><div class="grid g3" style="margin-top:10px">${["مباشر", "أفلام", "مسلسلات"].map((x, i) => `<div style="background:${i ? col.surface : col.primary};color:${i ? col.text : col.background};padding:16px;border-radius:12px;text-align:center;font-weight:700">${x}</div>`).join("")}</div><div style="background:${col.button};color:${col.accent};padding:10px;border-radius:10px;text-align:center;margin-top:10px;font-weight:700">زر</div>`;
    };
    drawCols();
    $("#presets").querySelectorAll("[data-p]").forEach((b) => (b.onclick = () => { [theme, col] = [PRESETS[b.dataset.p][0], { ...PRESETS[b.dataset.p][1] }]; drawCols(); }));
    $("#gen").onclick = () => { const a = $("#g1").value.trim(), b = $("#g2").value.trim(); if (!valid(a) || !valid(b)) return toast("اكتب كود لون صحيح مثل #FBBD23", true); col = { primary: a.toUpperCase(), accent: mix(a, -0.12), background: b.toUpperCase(), surface: mix(b, 0.06), secondary: mix(b, 0.14), button: mix(b, 0.06), text: "#F8F8F6" }; theme = "bhsat"; drawCols(); };
    $("#saveTheme").onclick = run(async () => { if (Object.values(col).some((x) => !valid(x))) throw new Error("في كود لون غير صحيح"); await saveSettings({ colors: col, theme }, "الهوية", "تحديث الثيم والألوان"); });
    $("#nmS").onclick = run(() => saveSettings({ name: $("#nm").value }, "الهوية", "تغيير الاسم"));
    $("#logoF").onchange = run(async (e) => saveSettings({ logo: await upload(e.target.files[0]) }, "الهوية", "تغيير الشعار"));
    $("#banF").onchange = run(async (e) => saveSettings({ banner: await upload(e.target.files[0]) }, "الهوية", "تغيير البنر"));
    if ($("#banDel")) $("#banDel").onclick = run(() => saveSettings({ banner: null }, "الهوية", "حذف البنر"));
  },

  contact(v) {
    const s = S.settings;
    const F = [["whatsapp", "واتساب (رقم أو رابط)", "+97333000000"], ["telegram", "تيليجرام (قناة أو معرّف)", "@username"], ["facebook", "صفحة فيسبوك", "https://facebook.com/..."], ["website", "الموقع الرسمي", "https://..."], ["email", "إيميل الدعم", "support@..."], ["phone", "هاتف", "+973..."], ["store_url", "رابط المتجر / الاشتراك", "https://..."]];
    v.innerHTML = `<div class="card"><p class="muted">هذه الروابط تظهر داخل التطبيق ليتواصل معك المشتركون.</p><div class="grid g2">${F.map(([k, l, ph]) => `<label>${l}<input dir="ltr" data-k="${k}" value="${esc(s[k])}" placeholder="${ph}"></label>`).join("")}</div>
      <label>رسالة للعملاء / ملاحظات التفعيل<textarea rows="5" data-k="notice">${esc(s.notice)}</textarea></label><button class="btn primary wide" id="sv">حفظ روابط التواصل</button></div>`;
    $("#sv").onclick = run(() => { const b = {}; v.querySelectorAll("[data-k]").forEach((i) => (b[i.dataset.k] = i.value)); return saveSettings(b, "التواصل", "تحديث روابط التواصل"); });
  },

  notify(v) {
    const K = { info: "معلومة", maintenance: "صيانة", offer: "عرض", urgent: "عاجل" };
    v.innerHTML = `<form class="card" id="nf"><h2>إرسال إشعار جديد</h2><div class="grid g3"><label>العنوان<input name="title" required></label>
      <label>النوع<select name="kind">${Object.entries(K).map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></label>
      <label>المدة<select name="days"><option value="1">يوم</option><option value="3">3 أيام</option><option value="7" selected>أسبوع</option><option value="30">شهر</option><option value="0">بدون انتهاء</option></select></label></div>
      <label>نص الرسالة<textarea name="body" rows="4"></textarea></label><label>صورة (اختيارية)<input type="file" name="img" accept="image/*"></label><button class="btn primary">🔔 إرسال للجميع</button></form>
      <div class="card" style="overflow-x:auto"><table><thead><tr><th>النوع</th><th>العنوان</th><th>المحتوى</th><th>الإنشاء</th><th>ينتهي</th><th>إجراءات</th></tr></thead><tbody>
      ${S.notifications.map((n) => { const ex = n.expires_at && new Date(n.expires_at) < new Date(); return `<tr data-id="${n.id}"><td><span class="tag">${K[n.kind] || n.kind}</span></td><td><b>${esc(n.title)}</b></td><td class="muted">${esc((n.body || "").slice(0, 80))}</td><td class="muted">${fmt(n.created_at)}</td><td>${ex ? '<span class="err">منتهي</span>' : fmt(n.expires_at)}</td><td><div class="row">${sw(n.active, "data-a")}<button class="btn sm danger" data-d>حذف</button></div></td></tr>`; }).join("") || '<tr><td colspan="6" class="center muted">لا توجد إشعارات بعد.</td></tr>'}
      </tbody></table></div>`;
    $("#nf").onsubmit = run(async (e) => {
      e.preventDefault(); const f = new FormData(e.target); const img = f.get("img");
      const image_url = img && img.size ? await upload(img) : null;
      await api("/api/notifications", { body: { title: f.get("title"), body: f.get("body"), kind: f.get("kind"), days: f.get("days"), image_url } });
      toast("تم الإرسال لكل المشتركين"); await reload();
    });
    v.querySelectorAll("tr[data-id]").forEach((tr) => {
      $("[data-a]", tr).onchange = run(async (e) => { await api(`/api/notifications/${tr.dataset.id}`, { method: "PUT", body: { active: e.target.checked } }); await reload(); });
      $("[data-d]", tr).onclick = run(async () => { await api(`/api/notifications/${tr.dataset.id}`, { method: "DELETE" }); await reload(); });
    });
  },

  updates(v) {
    const s = S.settings;
    v.innerHTML = `<div class="card"><h2>إصدار التطبيق وإجبار التحديث</h2><div class="grid g3">
      <label>أحدث نسخة<input dir="ltr" id="lv" value="${esc(s.latest_version)}"></label><label>أقل نسخة مسموحة<input dir="ltr" id="mv" value="${esc(s.min_version)}"></label><label>رابط تحميل التحديث (APK)<input dir="ltr" id="uu" value="${esc(s.update_url)}" placeholder="https://.../app.apk"></label></div>
      <p class="muted">أي تطبيق نسخته أقل من «أقل نسخة» يطلب من المستخدم التحديث من الرابط.</p><button class="btn primary" id="sv">حفظ</button></div>`;
    $("#sv").onclick = run(() => saveSettings({ latest_version: $("#lv").value.trim(), min_version: $("#mv").value.trim(), update_url: $("#uu").value.trim() }, "التحديثات", `أحدث ${$("#lv").value} / أقل ${$("#mv").value}`));
  },

  async changes(v) {
    v.innerHTML = '<div class="card muted">جاري التحميل...</div>';
    const list = await api("/api/changes");
    v.innerHTML = `<div class="card">${list.map((c) => `<div class="row" style="border-bottom:1px solid var(--bd);padding:10px 0"><span class="tag">${esc(c.section)}</span><b class="sp">${esc(c.summary)}</b><span class="muted">${esc(c.user)}</span><span class="muted">${fmt(c.at)}</span></div>`).join("") || '<p class="center muted">لا توجد تغييرات بعد.</p>'}</div>`;
  },

  async backup(v) {
    const files = await api("/api/backups");
    v.innerHTML = `<div class="card"><h2>نسخة محمية خارج السيرفر</h2><p class="muted">حمّل نسخة مشفرة على جهازك. احتفظ بكلمة الحماية منفصلة — بدونها لا يمكن فتح النسخة.</p>
      <label>كلمة حماية النسخة<input type="password" id="bp"></label><button class="btn primary" id="dl">↓ تحميل نسخة مشفرة</button></div>
      <div class="card"><h2>استعادة نسخة</h2><label>ملف النسخة (.bhsat)<input type="file" id="rf" accept=".bhsat,application/json"></label><label>كلمة الحماية<input type="password" id="rp"></label><button class="btn" id="rs">استعادة</button></div>
      <div class="card"><h2>النسخ اليومية المحلية</h2><p class="muted">آخر نسخة: ${esc(files[0] || "—")} · ${files.length} نسخة (يحتفظ بآخر 14 يوم). ليست حماية من فقدان السيرفر.</p><button class="btn" id="tst">✓ اختبار سلامة النسخة</button> <span id="tr"></span></div>`;
    $("#dl").onclick = run(async () => {
      const r = await fetch("/api/backup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: $("#bp").value }) });
      if (!r.ok) throw new Error((await r.json()).error);
      const a = document.createElement("a"); a.href = URL.createObjectURL(await r.blob()); a.download = `panel-backup-${new Date().toISOString().slice(0, 10)}.bhsat`; a.click(); toast("تم التحميل");
    });
    $("#rs").onclick = run(async () => {
      const f = $("#rf").files[0]; if (!f) throw new Error("اختر الملف");
      if (!confirm("الاستعادة تستبدل كل الإعدادات الحالية. متابعة؟")) return;
      await api("/api/restore", { body: { file: await f.text(), password: $("#rp").value } }); toast("تمت الاستعادة"); await reload();
    });
    $("#tst").onclick = run(async () => { const r = await api("/api/backup-test"); $("#tr").innerHTML = r.ok ? `<span class="ok">سليمة ✓ (${r.servers} سيرفر)</span>` : '<span class="err">تالفة</span>'; });
  },

  security(v) {
    v.innerHTML = `<div class="grid g3"><div class="card stat"><p class="muted">اسم الدخول</p><div class="n" style="font-size:20px" dir="ltr">${esc(ME.user)}</div></div><div class="card stat"><p class="muted">الحسابات</p><div class="n">${ME.users.length}</div></div><div class="card stat"><p class="muted">الصلاحية</p><div class="n" style="font-size:20px">مالك</div></div></div>
      <form class="card" id="pf"><h2>تغيير بيانات الدخول</h2><div class="grid g2"><label>اسم الدخول الجديد (اختياري)<input dir="ltr" name="username" placeholder="${esc(ME.user)}"></label><label>كلمة المرور الحالية<input type="password" name="current" required></label>
      <label>كلمة المرور الجديدة<input type="password" name="password" required minlength="10"></label><label>تأكيد الجديدة<input type="password" name="password2" required></label></div><button class="btn primary">حفظ</button></form>
      <div class="card"><h2>حسابات الموظفين</h2>${ME.users.map((u) => `<div class="row" style="padding:6px 0"><b class="sp" dir="ltr">${esc(u)}</b>${u !== ME.user ? `<button class="btn sm danger" data-u="${esc(u)}">حذف</button>` : '<span class="muted">أنت</span>'}</div>`).join("")}
      <form id="uf" class="row" style="margin-top:12px"><input name="username" dir="ltr" placeholder="اسم الموظف" required class="sp" style="margin:0"><input name="password" type="password" placeholder="كلمة مرور 10 أحرف" required class="sp" style="margin:0"><button class="btn">+ إضافة</button></form></div>
      <div class="card"><h2>الخروج من كل الأجهزة</h2><button class="btn" id="lo">خروج من كل الأجهزة</button></div>`;
    $("#pf").onsubmit = run(async (e) => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); if (f.password !== f.password2) throw new Error("كلمتا المرور غير متطابقتين"); await api("/api/password", { body: f }); toast("تم الحفظ"); ME = await api("/api/me"); go("security"); });
    $("#uf").onsubmit = run(async (e) => { e.preventDefault(); await api("/api/users", { body: Object.fromEntries(new FormData(e.target)) }); toast("تمت الإضافة"); ME = await api("/api/me"); go("security"); });
    v.querySelectorAll("[data-u]").forEach((b) => (b.onclick = run(async () => { if (!confirm("حذف الحساب؟")) return; await api(`/api/users/${b.dataset.u}`, { method: "DELETE" }); ME = await api("/api/me"); go("security"); })));
    $("#lo").onclick = run(async () => { await api("/api/logout-all", { body: {} }); showLogin(); });
  },
};

fetch("/api/public/config").then((r) => r.json()).then((c) => { if (c.logo_url) { $("#loginLogo").src = c.logo_url; $("#loginLogo").classList.remove("hidden"); } document.documentElement.style.setProperty("--p", c.colors.primary); }).catch(() => {});
boot().catch(showLogin);
