# دليل تركيب لوحة الزبون — Bahrain Satellite

اختر الطريقة حسب المكان الذي ستعمل عليه اللوحة. كل الطرق تعطي نفس اللوحة ونفس رابط الإعدادات الذي يقرأه التطبيق:
`http://عنوان-السيرفر:8090/api/public/config`

| المكان | الطريقة | يصلح للإنترنت العام؟ |
|---|---|---|
| كمبيوتر محلي (Windows) | 1 | داخل الشبكة فقط، أو عبر نفق |
| كمبيوتر محلي (Mac/Linux) | 2 | داخل الشبكة فقط، أو عبر نفق |
| VPS لينكس (Ubuntu/Debian) | 3 | نعم — الأفضل |
| أي سيرفر عليه Docker | 4 | نعم |
| Windows Server | 5 | نعم |
| استضافة cPanel | 6 | نعم |

> المتطلب الوحيد: Node.js 18 أو أحدث. حزمة offline تحتوي نسخة Node جاهزة لمن لا يملك إنترنت.

---

## قبل البدء (لكل الطرق)
1. فك ضغط الملف `bhsat-panel-offline-1.0.0.zip`.
2. المنفذ الافتراضي **8090** (يمكن تغييره أثناء التثبيت).
3. عند أول تشغيل تظهر بيانات الدخول، وتُحفظ في `data/initial-login.txt`. **غيّر كلمة المرور بعد أول دخول** وسيُحذف الملف تلقائيًا.

---

## 1) كمبيوتر محلي — Windows 10/11
1. اضغط يمين على `installers\install-windows.bat` ← **Run as administrator**.
2. أدخل رقم المنفذ واسم المستخدم.
3. افتح المتصفح: `http://localhost:8090`
4. لتصل إليها أجهزة أخرى بنفس الشبكة: `http://IP-الكمبيوتر:8090` (اعرف الـIP بالأمر `ipconfig`) واسمح بالمنفذ في جدار الحماية.

⚠️ إذا انطفأ الكمبيوتر يتوقف التطبيق عن قراءة الإعدادات الجديدة، ويرجع للإعدادات السحابية الاحتياطية.

## 2) كمبيوتر محلي — Mac / Linux
```bash
cd bhsat-panel
PORT=8090 node server.js
```
افتح `http://localhost:8090`. التشغيل الدائم على لينكس: استخدم الطريقة 3.

### جعل الكمبيوتر المحلي متاحًا من الإنترنت (اختياري)
- **Cloudflare Tunnel** (مجاني، بدون فتح منافذ):
  `cloudflared tunnel --url http://localhost:8090` ← يعطيك رابط https عام.
- أو افتح المنفذ في الراوتر (Port Forwarding) مع IP ثابت أو DDNS.

---

## 3) VPS لينكس — Ubuntu / Debian (الأنسب)
```bash
unzip bhsat-panel-offline-1.0.0.zip && cd bhsat-panel
sudo bash installers/install-linux.sh
```
- يثبّت اللوحة في `/opt/bhsat-panel` كخدمة تعمل تلقائيًا بعد إعادة التشغيل.
- أوامر مفيدة:
  ```bash
  sudo systemctl status bhsat-panel      # الحالة
  sudo systemctl restart bhsat-panel     # إعادة تشغيل
  sudo journalctl -u bhsat-panel -f      # السجل
  ```
- فتح المنفذ: `sudo ufw allow 8090/tcp`
- الإزالة: `sudo bash installers/uninstall-linux.sh` (البيانات تبقى).

### ربط دومين + HTTPS (موصى به)
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```
ملف `/etc/nginx/sites-available/panel`:
```nginx
server {
  server_name panel.example.com;
  client_max_body_size 20m;
  location / { proxy_pass http://127.0.0.1:8090; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $remote_addr; }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/panel /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d panel.example.com
```
الرابط النهائي: `https://panel.example.com`

---

## 4) Docker (أي نظام)
```bash
cd bhsat-panel
sudo bash installers/install-docker.sh
# أو يدويًا:
docker compose up -d --build
```
- البيانات محفوظة في مجلد `./data` بجانب الملف.
- التحديث: استبدل الملفات ثم `docker compose up -d --build`.
- السجل: `docker logs -f bhsat-panel`

## 5) Windows Server
نفس الطريقة 1 (`install-windows.bat` كمسؤول)، ثم:
- افتح المنفذ: `netsh advfirewall firewall add rule name="BHSAT Panel" dir=in action=allow protocol=TCP localport=8090`
- للدومين وHTTPS: استخدم IIS مع **URL Rewrite + ARR** كـReverse Proxy إلى `http://127.0.0.1:8090`، أو Cloudflare Tunnel.

## 6) استضافة cPanel
1. ارفع الملفات إلى مجلد مثل `~/bhsat-panel`.
2. cPanel ← **Setup Node.js App** ← Create Application:
   - Node.js version: 18 أو أحدث
   - Application root: `bhsat-panel`
   - Application URL: الدومين أو `panel.example.com`
   - Application startup file: `app.js`
3. اضغط **Create** ثم **Start**. المنفذ يحدده cPanel تلقائيًا.
4. فعّل SSL من **SSL/TLS Status** أو AutoSSL.

---

## بعد التركيب: ربط التطبيق باللوحة
1. تأكد أن الرابط يعمل من خارج السيرفر:
   `https://panel.example.com/api/public/config` ← يجب أن يظهر نص إعدادات.
2. في لوحة الإدارة: صفحة الزبون ← **لوحة الزبون المستقلة** ← الصق الرابط ← **فحص الاتصال**.
3. ابنِ الـAPK؛ التطبيق سيقرأ إعداداته من لوحة الزبون، ويرجع للسحابة تلقائيًا إذا كانت اللوحة متوقفة.

## النسخ الاحتياطي
- كل البيانات في مجلد `data/` (ملف `db.json` + `uploads/` + `backups/`).
- من داخل اللوحة: زر **نسخة احتياطية** و**استرجاع**.
- عند نقل السيرفر: انسخ مجلد `data/` كاملًا إلى السيرفر الجديد.

## حل المشاكل الشائعة
| المشكلة | الحل |
|---|---|
| الصفحة لا تفتح من الخارج | افتح المنفذ في جدار الحماية/مزود الـVPS |
| `EADDRINUSE` | المنفذ مستخدم — اختر منفذًا آخر |
| نسيت كلمة المرور | أوقف اللوحة، احذف `users` من `data/db.json`، شغّلها فتظهر بيانات دخول جديدة |
| التطبيق لا يقرأ الإعدادات | استخدم HTTPS، وتأكد أن رابط config يفتح من الجوال |
| Node غير موجود | استخدم حزمة offline أو ثبّت Node 18+ |
