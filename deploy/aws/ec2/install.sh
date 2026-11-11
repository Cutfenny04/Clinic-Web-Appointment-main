#!/usr/bin/env bash
# ============================================================================
# JanjiCare — instalasi di EC2 Amazon Linux 2023 (AWS Academy Learner Lab)
#
#   sudo bash install.sh app     # EC2 "app"  : Nginx + Supabase Auth + PostgREST + backend
#   sudo bash install.sh queue   # EC2 "queue": queue microservice saja
#
# Repo harus sudah di-clone ke /opt/janjicare/app (lihat docs/DEPLOY_AWS.md).
# Aman dijalankan ulang.
# ============================================================================
set -euo pipefail
ROLE="${1:-}"
[[ "$ROLE" == "app" || "$ROLE" == "queue" ]] || { echo "Pakai: sudo bash install.sh app|queue"; exit 1; }
APP=/opt/janjicare/app
[[ -d "$APP/backend" ]] || { echo "Repo belum ada di $APP"; exit 1; }

AUTH_VER=v2.164.0
AUTH_SHA=d6cb2e7a2aa375dba2cd944b5a004d4c74b6894a3047a0c0dce3dbee9945e4a0
PGRST_VER=v12.2.3
PGRST_SHA=9f71269e61ac3a940281e93ff415760f5957e430e475ba4c3889f3ede7d5527c

echo "==> Paket sistem"
dnf install -y -q git tar xz
if ! command -v node >/dev/null || [[ "$(node -v)" != v22* ]]; then
  curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
  dnf install -y -q nodejs
fi
command -v pm2 >/dev/null || npm install -g pm2 >/dev/null
mkdir -p /opt/janjicare/{bin,config} /var/log/janjicare
chown -R ec2-user:ec2-user /opt/janjicare /var/log/janjicare

if [[ "$ROLE" == "app" ]]; then
  # swap 2 GB agar build frontend (Vite) tidak kehabisan memori di instance kecil
  if ! swapon --show | grep -q /swapfile; then
    dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
    grep -q /swapfile /etc/fstab || echo "/swapfile swap swap defaults 0 0" >> /etc/fstab
  fi
  dnf install -y -q nginx postgresql16 || dnf install -y -q nginx postgresql15

  echo "==> Supabase Auth (GoTrue) $AUTH_VER"
  if [[ ! -x /opt/janjicare/auth/auth ]]; then
    curl -fsSL -o /tmp/auth.tgz "https://github.com/supabase/auth/releases/download/$AUTH_VER/auth-$AUTH_VER-x86.tar.gz"
    echo "$AUTH_SHA  /tmp/auth.tgz" | sha256sum -c -
    mkdir -p /opt/janjicare/auth && tar xzf /tmp/auth.tgz -C /opt/janjicare/auth
  fi

  echo "==> PostgREST $PGRST_VER"
  if [[ ! -x /opt/janjicare/bin/postgrest ]]; then
    curl -fsSL -o /tmp/pgrst.txz "https://github.com/PostgREST/postgrest/releases/download/$PGRST_VER/postgrest-$PGRST_VER-linux-static-x64.tar.xz"
    echo "$PGRST_SHA  /tmp/pgrst.txz" | sha256sum -c -
    tar xJf /tmp/pgrst.txz -C /opt/janjicare/bin
  fi

  echo "==> Nginx"
  cp "$APP/deploy/aws/ec2/nginx-janjicare.conf" /etc/nginx/conf.d/janjicare.conf
  # matikan server bawaan Amazon Linux agar tidak bentrok dengan default_server
  sed -i 's/listen       80;/listen       8080;/; s/listen       \[::\]:80;/listen       [::]:8080;/' /etc/nginx/nginx.conf
  nginx -t && systemctl enable --now nginx && systemctl reload nginx

  for f in gotrue.env postgrest.conf; do
    [[ -f /opt/janjicare/config/$f ]] || cp "$APP/deploy/aws/ec2/$f.example" "/opt/janjicare/config/$f"
  done
  [[ -f "$APP/backend/.env" ]] || cp "$APP/deploy/aws/ec2/backend.env.example" "$APP/backend/.env"
  sudo -u ec2-user bash -c "cd $APP/backend && npm ci --omit=dev --no-audit --no-fund"
  sudo -u ec2-user bash -c "cd $APP/janjicare-frontend && npm ci --no-audit --no-fund"
else
  [[ -f "$APP/services/queue-service/.env" ]] || cp "$APP/deploy/aws/ec2/queue.env.example" "$APP/services/queue-service/.env"
  sudo -u ec2-user bash -c "cd $APP/services/queue-service && npm ci --omit=dev --no-audit --no-fund"
fi
chown -R ec2-user:ec2-user /opt/janjicare

# PM2 hidup otomatis setelah reboot (Learner Lab menghentikan EC2 tiap sesi berakhir)
env PATH="$PATH" pm2 startup systemd -u ec2-user --hp /home/ec2-user >/dev/null

echo
echo "Selesai. Langkah berikutnya (lihat docs/DEPLOY_AWS.md):"
if [[ "$ROLE" == "app" ]]; then
  echo "  1. Isi /opt/janjicare/config/gotrue.env, /opt/janjicare/config/postgrest.conf, $APP/backend/.env"
  echo "  2. pm2 start $APP/deploy/aws/ec2/ecosystem.config.cjs --only auth,postgrest,backend && pm2 save"
else
  echo "  1. Isi $APP/services/queue-service/.env"
  echo "  2. pm2 start $APP/deploy/aws/ec2/ecosystem.config.cjs --only queue && pm2 save"
fi
