# خارطة المهام — Bahrain Satellite

1. [منجز] إعادة بناء لوحة التحكم الحالية (panel.bhsat.me) بتصميم عصري على Lovable Cloud — سيرفرات وهوستات، هوية التطبيق، أرقام دعم، إعدادات موقّعة، نسخ احتياطية.
2. [منجز] تجهيز غلاف أندرويد: Capacitor مثبت + إعدادات capacitor.config.ts + مسارا بناء APK (GitHub Actions في .github/workflows/android-apk.yml وسكربت VPS في scripts/build-apk-vps.sh).
3. [مطلوب من المستخدم] ربط المشروع بـ GitHub (قائمة + ← GitHub ← Connect project) لتفعيل البناء التلقائي، وتغيير server.url في capacitor.config.ts إلى الرابط المنشور النهائي.
4. [مطلوب لاحقًا] نسخة Release موقّعة بمفتاح التوقيع القديم (keystore) حتى تصل كتحديث للمستخدمين الحاليين — يحتاج ملف .jks/.keystore من المستخدم.
