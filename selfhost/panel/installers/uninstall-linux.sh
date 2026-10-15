#!/usr/bin/env bash
set -e
systemctl disable --now bhsat-panel 2>/dev/null || true
rm -f /etc/systemd/system/bhsat-panel.service && systemctl daemon-reload
echo "تم إيقاف اللوحة. البيانات باقية في /opt/bhsat-panel/data — احذفها يدويًا إذا أردت."
