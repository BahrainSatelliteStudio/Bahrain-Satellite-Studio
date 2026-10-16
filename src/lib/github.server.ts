// اتصال GitHub للبناء — يمر عبر بوابة الاتصالات (LOVABLE_API_KEY + GITHUB_API_KEY).
// يُستدعى داخل دوال الخادم فقط (await import("./github.server")).

const GATEWAY = "https://connector-gateway.lovable.dev/github";
export const WORKFLOW = "android-apk.yml";

type Gh = { status: number; ok: boolean; json: any; text: string };

export async function gh(method: "GET" | "POST" | "PUT", path: string, body?: unknown): Promise<Gh> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connKey = process.env["GITHUB_API_KEY"];
  const pat = process.env["GITHUB_TOKEN"];
  const gateway = Boolean(lovableKey && connKey);
  if (!gateway && !pat) throw new Error("لم يتم ربط GitHub بعد — اربط اتصال GitHub من إعدادات المشروع");
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "iptv-studio",
    Authorization: `Bearer ${gateway ? lovableKey : pat}`,
  };
  if (gateway && connKey) headers["X-Connection-Api-Key"] = connKey;
  const res = await fetch(gateway ? `${GATEWAY}${path}` : `https://api.github.com${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* الرد ليس JSON */ }
  return { status: res.status, ok: res.ok, json, text };
}

export type RepoInfo = { name: string; hasCode: boolean; workflow: boolean; private: boolean };

export type GitHubStatus = {
  connected: boolean;
  via: "gateway" | "token" | "none";
  account: string;
  repo: string;
  repoFound: boolean;
  defaultBranch: string;
  workflowFound: boolean;
  secrets: string[];
  repos: RepoInfo[];
  error?: string;
};

export async function readStatus(): Promise<GitHubStatus> {
  const repo = (process.env["GITHUB_REPO"] ?? "").trim();
  const out: GitHubStatus = {
    connected: false, via: "none", account: "", repo, repoFound: false,
    defaultBranch: "", workflowFound: false, secrets: [], repos: [],
  };
  try {
    out.via = process.env["GITHUB_API_KEY"] && process.env["LOVABLE_API_KEY"] ? "gateway" : process.env["GITHUB_TOKEN"] ? "token" : "none";
    const me = await gh("GET", "/user");
    if (!me.ok) { out.error = me.status === 401 ? "انتهت صلاحية الاتصال — يلزم إعادة الربط" : `لم نستطع التحقق من الحساب (${me.status})`; return out; }
    out.connected = true;
    out.account = String(me.json?.login ?? "");

    if (repo) {
      const r = await gh("GET", `/repos/${repo}`);
      out.repoFound = r.ok;
      if (r.ok) {
        out.defaultBranch = String(r.json?.default_branch ?? "main");
        out.workflowFound = (await gh("GET", `/repos/${repo}/actions/workflows/${WORKFLOW}`)).ok;
        const s = await gh("GET", `/repos/${repo}/actions/secrets?per_page=50`);
        if (s.ok) out.secrets = (s.json?.secrets ?? []).map((x: any) => String(x.name));
      }
    }

    const list = await gh("GET", "/user/repos?per_page=30&sort=updated");
    if (list.ok) {
      for (const r of (list.json ?? []).slice(0, 10)) {
        const wf = await gh("GET", `/repos/${r.full_name}/contents/.github/workflows`);
        out.repos.push({
          name: r.full_name,
          hasCode: Boolean(r.default_branch),
          workflow: wf.ok && Array.isArray(wf.json) ? wf.json.some((f: any) => f.name === WORKFLOW) : false,
          private: Boolean(r.private),
        });
      }
    }
    return out;
  } catch (e) {
    out.error = e instanceof Error ? e.message : "تعذّر الاتصال بـ GitHub";
    return out;
  }
}

/** يشغّل بناءً على GitHub Actions. يرجع اسم الفرع المستخدم. */
export async function dispatchBuild(repo: string, inputs: Record<string, string>): Promise<string> {
  const r = await gh("GET", `/repos/${repo}`);
  if (!r.ok) throw new Error(r.status === 404 ? `المستودع «${repo}» غير موجود أو غير مرئي لهذا الحساب` : `تعذّر فتح المستودع (${r.status})`);
  const branch = String(r.json?.default_branch ?? "main");
  const wf = await gh("GET", `/repos/${repo}/actions/workflows/${WORKFLOW}`);
  const sec = await gh("GET", `/repos/${repo}/actions/secrets?per_page=50`);
  const names: string[] = sec.ok ? (sec.json?.secrets ?? []).map((x: any) => String(x.name)) : [];
  const { SIGN_KEYS } = await import("./signing.server");
  if (!SIGN_KEYS.every((k) => names.includes(k))) throw new Error("مفتاح التوقيع غير مُعد — أنشئه من لوحة التحكم (شريط GitHub) قبل البناء");
  if (!wf.ok) throw new Error(`لا يوجد ملف البناء (${WORKFLOW}) في فرع «${branch}» — يلزم رفع الكود أولًا`);
  const d = await gh("POST", `/repos/${repo}/actions/workflows/${WORKFLOW}/dispatches`, { ref: branch, inputs });
  if (!d.ok) throw new Error(d.status === 403 ? "الاتصال لا يملك صلاحية تشغيل البناء (Actions)" : `رفض GitHub تشغيل البناء (${d.status})`);
  return branch;
}
