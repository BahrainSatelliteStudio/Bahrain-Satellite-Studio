#!/usr/bin/env bash
# بناء APK على الـ VPS — Bahrain Satellite
# الاستخدام: bash scripts/build-apk-vps.sh
set -euo pipefail

echo "==> التحقق من المتطلبات..."
command -v java >/dev/null || { echo "ثبّت Java 17 أولاً: sudo apt install -y openjdk-17-jdk"; exit 1; }
command -v bun  >/dev/null || { echo "ثبّت bun أولاً: curl -fsSL https://bun.sh/install | bash"; exit 1; }

# Android SDK — عدّل المسار إذا كان مثبتًا في مكان آخر
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
if [ ! -d "$ANDROID_HOME" ]; then
  echo "==> تثبيت Android SDK في $ANDROID_HOME ..."
  mkdir -p "$ANDROID_HOME/cmdline-tools"
  cd /tmp
  curl -fsSLO https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
  unzip -q commandlinetools-linux-11076708_latest.zip -d "$ANDROID_HOME/cmdline-tools"
  mv "$ANDROID_HOME/cmdline-tools/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
  yes | "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --licenses >/dev/null
  "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" "platform-tools" "platforms;android-35" "build-tools;35.0.0"
  cd - >/dev/null
fi

echo "==> تثبيت الحزم..."
bun install

echo "==> إضافة منصة أندرويد ومزامنة الأصول..."
[ -d android ] || bunx cap add android
bunx cap sync android

echo "==> بناء APK (debug)..."
cd android
./gradlew assembleDebug
cd ..

APK="android/app/build/outputs/apk/debug/app-debug.apk"
echo "==> تم! الملف جاهز هنا: $APK"
