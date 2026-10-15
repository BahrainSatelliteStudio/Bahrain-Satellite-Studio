#!/usr/bin/env bash
# ينشئ مفتاح توقيع واحد دائم لكل تطبيقات الزبائن. احتفظ بالملف وكلمة المرور بأمان — فقدانهما يمنع تحديث التطبيقات.
set -e
keytool -genkeypair -v -keystore bhsat-release.jks -alias bhsat -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 bhsat-release.jks > bhsat-release.jks.b64
echo "انسخ محتوى bhsat-release.jks.b64 إلى سر GitHub باسم ANDROID_KEYSTORE_BASE64"
