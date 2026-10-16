// إنشاء مفتاح توقيع Android (PKCS12) وحفظه كأسرار مشفّرة في مستودع GitHub — خادم فقط.
import forge from "node-forge";
import nacl from "tweetnacl";
import { blake2b } from "blakejs";

export const SIGN_KEYS = ["ANDROID_KEYSTORE_BASE64", "ANDROID_KEYSTORE_PASSWORD", "ANDROID_KEY_ALIAS", "ANDROID_KEY_PASSWORD"] as const;

const b64 = (u: Uint8Array) => { let s = ""; for (const c of u) s += String.fromCharCode(c); return btoa(s); };
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

function randPass(n = 32) {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const r = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(r, (x) => A[x % A.length]).join("");
}

/** libsodium crypto_box_seal (المطلوب من GitHub لتشفير الأسرار) */
function seal(message: string, publicKeyB64: string) {
  const pk = unb64(publicKeyB64);
  const eph = nacl.box.keyPair();
  const nonce = blake2b(new Uint8Array([...eph.publicKey, ...pk]), undefined, 24);
  const boxed = nacl.box(new TextEncoder().encode(message), nonce, pk, eph.secretKey);
  return b64(new Uint8Array([...eph.publicKey, ...boxed]));
}

async function makeKeystore(org: string) {
  const kp = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 4096, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", kp.privateKey));
  const pem = `-----BEGIN PRIVATE KEY-----\n${b64(pkcs8).match(/.{1,64}/g)!.join("\n")}\n-----END PRIVATE KEY-----`;
  const priv = forge.pki.privateKeyFromPem(pem) as forge.pki.rsa.PrivateKey;
  const pub = forge.pki.setRsaPublicKey(priv.n, priv.e);
  const cert = forge.pki.createCertificate();
  cert.publicKey = pub;
  cert.serialNumber = "01" + forge.util.bytesToHex(forge.random.getBytesSync(15));
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(Date.now() + 30 * 365 * 864e5);
  const attrs = [{ name: "commonName", value: org }, { name: "organizationName", value: org }, { name: "countryName", value: "BH" }];
  cert.setSubject(attrs); cert.setIssuer(attrs);
  cert.sign(priv, forge.md.sha256.create());
  const alias = "release";
  const pass = randPass();
  const p12 = forge.pkcs12.toPkcs12Asn1(priv, [cert], pass, { algorithm: "aes256", friendlyName: alias });
  const der = forge.asn1.toDer(p12).getBytes();
  const fp = forge.md.sha256.create().update(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes()).digest().toHex();
  return { keystoreB64: forge.util.encode64(der), pass, alias, sha256: fp.toUpperCase().match(/.{2}/g)!.join(":") };
}

type GhFn = (method: "GET" | "POST" | "PUT", path: string, body?: unknown) => Promise<{ ok: boolean; status: number; json: any; text: string }>;

export async function setupSigning(gh: GhFn, repo: string, org: string) {
  const existing = await gh("GET", `/repos/${repo}/actions/secrets?per_page=50`);
  if (!existing.ok) throw new Error(`تعذّر قراءة أسرار المستودع (${existing.status}) — الاتصال يحتاج صلاحية إدارة الأسرار`);
  const names: string[] = (existing.json?.secrets ?? []).map((s: any) => s.name);
  if (SIGN_KEYS.every((k) => names.includes(k))) throw new Error("مفتاح التوقيع موجود مسبقًا — لا يُستبدل حتى لا تتعطل تحديثات التطبيقات");
  const pk = await gh("GET", `/repos/${repo}/actions/secrets/public-key`);
  if (!pk.ok) throw new Error(`تعذّر جلب مفتاح التشفير من GitHub (${pk.status})`);
  const ks = await makeKeystore(org);
  const values: Record<string, string> = {
    ANDROID_KEYSTORE_BASE64: ks.keystoreB64, ANDROID_KEYSTORE_PASSWORD: ks.pass, ANDROID_KEY_ALIAS: ks.alias, ANDROID_KEY_PASSWORD: ks.pass,
  };
  for (const k of SIGN_KEYS) {
    const r = await gh("PUT", `/repos/${repo}/actions/secrets/${k}`, { encrypted_value: seal(values[k] ?? "", pk.json.key), key_id: pk.json.key_id });
    if (!r.ok) throw new Error(`رفض GitHub حفظ ${k} (${r.status}) — الاتصال يحتاج صلاحية إدارة الأسرار`);
  }
  return { keystoreB64: ks.keystoreB64, password: ks.pass, alias: ks.alias, sha256: ks.sha256 };
}
