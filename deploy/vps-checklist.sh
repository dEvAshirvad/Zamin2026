#!/usr/bin/env bash
# Simankan — copy-paste companion (run step-by-step on the VPS as root).
# Usage: bash deploy/vps-checklist.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cat <<'EOF'
════════════════════════════════════════════════════════════
 Simankan VPS checklist — run each block on the server
 Path: /home/ubuntu/Zamin2026  (repo folder name unchanged)
 Domains: simankan.rdmp.in + api.simankan.rdmp.in
════════════════════════════════════════════════════════════

[1] DNS
  - A  simankan     → 82.112.236.175
  - A  api.simankan → 82.112.236.175
  dig +short simankan.rdmp.in
  dig +short api.simankan.rdmp.in

[2] UFW (safe for other *.rdmp.in nginx apps)
EOF

cat <<EOF
  ufw allow OpenSSH
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw status numbered

[3] Env (Simankan URLs — keep Mongo/Redis/MinIO internal names)
  cd ${ROOT}
  git pull
  nano .env
  # NEXT_PUBLIC_API_URL=https://api.simankan.rdmp.in
  # BETTER_AUTH_URL=https://api.simankan.rdmp.in
  # CORS_ORIGINS=https://simankan.rdmp.in
  # COOKIE_DOMAIN=.simankan.rdmp.in
  # EMAIL_FROM_NAME=Simankan
  grep -E '^(NODE_ENV|NEXT_PUBLIC_API_URL|BETTER_AUTH_URL|CORS_ORIGINS|COOKIE_DOMAIN|TRUST_PROXY|EMAIL_FROM_NAME)' .env

[4] Rebuild app (NEXT_PUBLIC baked) + recreate stack
  cd ${ROOT}
  docker compose -f docker-compose.prod.yml build --no-cache app
  docker compose -f docker-compose.prod.yml up -d
  docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E 'zamin|NAMES'
  curl -sS http://127.0.0.1:7855/health
  curl -sS -o /dev/null -w 'app:%{http_code}\n' http://127.0.0.1:7854

[5] Nginx (new hosts)
  cp ${ROOT}/deploy/nginx/simankan.rdmp.in.conf /etc/nginx/sites-available/simankan.rdmp.in
  cp ${ROOT}/deploy/nginx/api.simankan.rdmp.in.conf /etc/nginx/sites-available/api.simankan.rdmp.in
  ln -sf /etc/nginx/sites-available/simankan.rdmp.in /etc/nginx/sites-enabled/
  ln -sf /etc/nginx/sites-available/api.simankan.rdmp.in /etc/nginx/sites-enabled/
  # Optional: 301 old zamin hosts
  cp ${ROOT}/deploy/nginx/zamin.rdmp.in.conf /etc/nginx/sites-available/zamin.rdmp.in
  cp ${ROOT}/deploy/nginx/api.zamin.rdmp.in.conf /etc/nginx/sites-available/api.zamin.rdmp.in
  nginx -t && systemctl reload nginx

[6] SSL
  certbot --nginx -d simankan.rdmp.in -d api.simankan.rdmp.in
  curl -sS https://api.simankan.rdmp.in/health
  curl -sS -o /dev/null -w 'ui:%{http_code}\n' https://simankan.rdmp.in

[7] Smoke
  # browser: https://simankan.rdmp.in → brand Simankan / सीमांकन
  # re-login (new COOKIE_DOMAIN); upload a file; no CORS errors

[8] Laptop tunnel (optional)
  ssh -N \\
    -L 27027:127.0.0.1:27027 \\
    -L 6389:127.0.0.1:6389 \\
    -L 9100:127.0.0.1:9100 \\
    -L 9101:127.0.0.1:9101 \\
    root@82.112.236.175
EOF
