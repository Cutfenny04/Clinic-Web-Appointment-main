#!/usr/bin/env bash
# Build frontend lalu unggah ke S3 + bersihkan cache CloudFront. Jalankan di EC2 "app" (sudah punya LabRole).
#   bash deploy/aws/scripts/deploy-frontend.sh <BUCKET_FRONTEND> <ID_DISTRIBUSI_CLOUDFRONT> <ANON_KEY>
set -euo pipefail
BUCKET="$1"; DIST="$2"; ANON="$3"
cd "$(dirname "$0")/../../../janjicare-frontend"
cat > .env.production.local <<ENV
VITE_API_BASE_URL=/api/v1
VITE_SUPABASE_URL=same-origin
VITE_SUPABASE_PUBLISHABLE_KEY=$ANON
ENV
npm run build
# aset ber-hash boleh di-cache lama; index.html selalu dicek ulang
aws s3 sync dist/ "s3://$BUCKET/" --delete --exclude index.html --cache-control "public, max-age=31536000, immutable"
aws s3 cp dist/index.html "s3://$BUCKET/index.html" --cache-control "no-cache"
aws cloudfront create-invalidation --distribution-id "$DIST" --paths "/index.html" "/" >/dev/null
echo "Frontend terunggah ke s3://$BUCKET dan cache CloudFront dibersihkan."
