#!/usr/bin/env bash
# Bahrain Satellite Panel — Ubuntu/Debian installer (works fully offline).
set -euo pipefail
[ "$(id -u)" = "0" ] || { echo "شغّل الأمر بصلاحية root:  sudo bash install-linux.sh"; exit 1; }
SRC="$(cd "$(dirname "$0")/.." && pwd)"
DEST=/opt/bhsat-panel
read -rp "رقم المنفذ (Port) [8090]: " PORT; PORT=${PORT:-8090}
read -rp "اسم المستخدم للوحة [admin]: " AUSER; AUSER=${AUSER:-admin}

mkdir -p "$DEST"
cp -r "$SRC/server.js" "$SRC/public" "$SRC/package.json" "$DEST/"
mkdir -p "$DEST/data"
echo "{\"port\": $PORT}" > "$DEST/data/config.json"

NODE_BIN="$(command -v node || true)"
if [ -z "$NODE_BIN" ] || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 18 ]; then
  ARCH=$(uname -m); case "$ARCH" in x86_64) A=x64;; aarch64|arm64) A=arm64;; *) echo "معمارية غير مدعومة: $ARCH"; exit 1;; esac
  TAR=$(ls "$SRC"/runtime/node-*-linux-$A.tar.xz 2>/dev/null | head -1)
  [ -n "$TAR" ] || { echo "Node.js غير موجود ولا توجد نسخة offline لهذا الجهاز ($A)"; exit 1; }
  mkdir -p "$DEST/node" && tar -xJf "$TAR" -C "$DEST/node" --strip-components=1
  NODE_BIN="$DEST/node/bin/node"
  echo "✓ تم تثبيت Node.js من الحزمة (بدون إنترنت)"
fi

id bhsat >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin bhsat
chown -R bhsat:bhsat "$DEST"

cat > /etc/systemd/system/bhsat-panel.service <<EOF
[Unit]
Description=Bahrain Satellite Panel
After=network.target
[Service]
Type=simple
User=bhsat
WorkingDirectory=$DEST
Environment=PORT=$PORT
Environment=PANEL_ADMIN_USER=$AUSER
ExecStart=$NODE_BIN $DEST/server.js
Restart=always
RestartSec=3
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now bhsat-panel
command -v ufw >/dev/null && ufw status | grep -q active && ufw allow "$PORT"/tcp || true
sleep 2
IP=$(hostname -I 2>/dev/null | awk '{print $1}')
echo
echo "=============================================="
echo " ✓ تم التثبيت:  http://$IP:$PORT"
echo " بيانات أول دخول:"
cat "$DEST/data/initial-login.txt" 2>/dev/null || echo " (موجودة مسبقًا — التثبيت السابق محفوظ)"
echo " الأوامر: systemctl status|restart|stop bhsat-panel"
echo "=============================================="
