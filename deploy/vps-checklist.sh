#!/usr/bin/env bash
# projectZamin — copy-paste companion (run step-by-step on the VPS as root).
# Usage: bash deploy/vps-checklist.sh   # prints the checklist; does not auto-run destructive steps
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cat <<'EOF'
════════════════════════════════════════════════════════════
 projectZamin VPS checklist — run each block on the server
 Path: /home/ubuntu/Zamin2026
 Domains: zamin.rdmp.in + api.zamin.rdmp.in
════════════════════════════════════════════════════════════

[1] DNS
  - A  zamin     → 82.112.236.175
  - A  api.zamin → 82.112.236.175
  dig +short zamin.rdmp.in
  dig +short api.zamin.rdmp.in

[2] UFW (safe for other *.rdmp.in nginx apps)
EOF

cat <<EOF
  ufw allow OpenSSH
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
  ufw status numbered
  # smoke: curl -I https://survey.rdmp.in

[3] Env
  cd ${ROOT}
  # nano .env  — must have production HTTPS URLs + secrets
  grep -E '^(NODE_ENV|NEXT_PUBLIC_API_URL|BETTER_AUTH_URL|CORS_ORIGINS|COOKIE_DOMAIN|TRUST_PROXY)' .env

[4] Start stack (always -f docker-compose.prod.yml — bare compose down misses zamin_*)
  cd ${ROOT}
  docker compose -f docker-compose.prod.yml down
  docker ps -aq --filter name=zamin_ | xargs -r docker rm -f
  docker compose -f docker-compose.prod.yml build --no-cache api
  docker compose -f docker-compose.prod.yml up -d --build
  docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E 'zamin|NAMES'
  docker logs zamin_api --tail 40
  curl -sS http://127.0.0.1:7855/health
  curl -sS -o /dev/null -w 'app:%{http_code}\n' http://127.0.0.1:7854

[5] Nginx
  cp ${ROOT}/deploy/nginx/zamin.rdmp.in.conf /etc/nginx/sites-available/zamin.rdmp.in
  cp ${ROOT}/deploy/nginx/api.zamin.rdmp.in.conf /etc/nginx/sites-available/api.zamin.rdmp.in
  ln -sf /etc/nginx/sites-available/zamin.rdmp.in /etc/nginx/sites-enabled/
  ln -sf /etc/nginx/sites-available/api.zamin.rdmp.in /etc/nginx/sites-enabled/
  nginx -t && systemctl reload nginx

[6] SSL
  certbot --nginx -d zamin.rdmp.in -d api.zamin.rdmp.in
  curl -sS https://api.zamin.rdmp.in/health
  curl -sS -o /dev/null -w 'ui:%{http_code}\n' https://zamin.rdmp.in

[7] Smoke
  # browser: https://zamin.rdmp.in  → admin login
  # upload a file; confirm no CORS errors

[8] Laptop tunnel (optional)
  ssh -N \\
    -L 27027:127.0.0.1:27027 \\
    -L 6389:127.0.0.1:6389 \\
    -L 9100:127.0.0.1:9100 \\
    -L 9101:127.0.0.1:9101 \\
    root@82.112.236.175
EOF
