# Simankan domain cutover (VPS)

Run after the Simankan rebrand is on `main`. Repo path on server can stay `/home/ubuntu/Zamin2026`.

## A. DNS

- [ ] A `simankan` → `82.112.236.175`
- [ ] A `api.simankan` → `82.112.236.175`
- [ ] `dig +short simankan.rdmp.in` and `api.simankan.rdmp.in`

## B. Pull + env

```bash
cd /home/ubuntu/Zamin2026
git pull
nano .env
```

```env
NEXT_PUBLIC_API_URL=https://api.simankan.rdmp.in
BETTER_AUTH_URL=https://api.simankan.rdmp.in
CORS_ORIGINS=https://simankan.rdmp.in
COOKIE_DOMAIN=.simankan.rdmp.in
EMAIL_FROM_NAME=Simankan
```

Do **not** change Mongo/Redis/MinIO docker hostnames or `projectzamin` DB name.

## C. Rebuild app + recreate

```bash
docker compose -f docker-compose.prod.yml build --no-cache app
docker compose -f docker-compose.prod.yml up -d
curl -sS http://127.0.0.1:7855/health
curl -sS -o /dev/null -w 'app:%{http_code}\n' http://127.0.0.1:7854
```

## D. Nginx + SSL

```bash
cp deploy/nginx/simankan.rdmp.in.conf /etc/nginx/sites-available/simankan.rdmp.in
cp deploy/nginx/api.simankan.rdmp.in.conf /etc/nginx/sites-available/api.simankan.rdmp.in
ln -sf /etc/nginx/sites-available/simankan.rdmp.in /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/api.simankan.rdmp.in /etc/nginx/sites-enabled/
# Optional 301 from old zamin hosts:
cp deploy/nginx/zamin.rdmp.in.conf /etc/nginx/sites-available/zamin.rdmp.in
cp deploy/nginx/api.zamin.rdmp.in.conf /etc/nginx/sites-available/api.zamin.rdmp.in
nginx -t && systemctl reload nginx
certbot --nginx -d simankan.rdmp.in -d api.simankan.rdmp.in
# If old zamin certs exist and you use 301-only on :80, re-run certbot for zamin
# or drop old sites when ready.
curl -sS https://api.simankan.rdmp.in/health
```

## E. Smoke

- [ ] `https://simankan.rdmp.in` shows **Simankan / सीमांकन**
- [ ] Re-login (new cookie domain)
- [ ] Admin + tehsildar flows; no CORS errors

Printable twin: `bash deploy/vps-checklist.sh`
