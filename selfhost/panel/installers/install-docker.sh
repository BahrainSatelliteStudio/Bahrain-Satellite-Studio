#!/usr/bin/env bash
# Docker install. Offline: loads the bundled image file instead of downloading.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -f runtime/bhsat-panel-image.tar ]; then
  docker load -i runtime/bhsat-panel-image.tar
else
  docker build -t bhsat-panel:1.0.0 .
fi
mkdir -p data
docker compose up -d 2>/dev/null || docker-compose up -d
sleep 3
echo "✓ اللوحة تعمل على المنفذ 8090"
cat data/initial-login.txt 2>/dev/null || true
