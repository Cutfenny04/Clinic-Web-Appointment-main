# Deploy JanjiCare ke AWS (AWS Academy Learner Lab)

Panduan langkah demi langkah untuk men-deploy JanjiCare ke **AWS Academy Learner Lab** dengan database di **Amazon RDS**.
Semua perintah sudah diuji pada lingkungan tiruan: PostgreSQL dengan master user non-superuser seperti RDS, GoTrue + PostgREST + Nginx yang dijalankan PM2 seperti di EC2, S3 tiruan, dan proxy berpola path seperti CloudFront. Hasilnya: 61/61 alur admin–dokter–pasien lolos, serta unggah/ganti/hapus foto ke S3 lolos.
Yang **belum** bisa diuji dari sini adalah konsol AWS sungguhan. Jadi bila ada nama menu yang sedikit berbeda, ikuti maksud langkahnya.

---

## 1. Arsitektur

```
                         Pengguna (browser)
                                │ HTTPS
                                ▼
                   ┌──────── Amazon CloudFront ────────┐   satu domain: https://dxxxx.cloudfront.net
                   │  /*               → S3 frontend   │
                   │  /doctor-photos/* → S3 foto       │
                   │  /api/*, /auth/v1/* → EC2 app     │
                   └───────┬──────────────┬────────────┘
                           │              │ HTTP :80 (hanya dari CloudFront)
          ┌────────────────┘              ▼
          ▼                    ┌──────── EC2 "app" (t3.small) ─────────┐
   S3: frontend (React)        │ Nginx                                 │
   S3: foto dokter  ◄──────────┤  ├─ /api      → Backend Express :3000 │
     (unggah via LabRole)      │  ├─ /auth/v1  → Supabase Auth  :9999  │
                               │  └─ /rest/v1  → PostgREST      :3001  │──┐
                               └───────────────┬───────────────────────┘  │
                                               │ HTTP :3002 + X-Internal-Token
                                               ▼                          │
                               ┌──── EC2 "queue" (t3.micro) ────┐         │
                               │ Queue Microservice             │         │
                               └───────────────┬────────────────┘         │
                                               ▼                          ▼
                               ┌──────── Amazon RDS PostgreSQL 16 ─────────┐
                               │ schema auth (login) + public (data klinik) │
                               └────────────────────────────────────────────┘
                    Log & metrik semua EC2 → Amazon CloudWatch
```

| Layanan AWS | Dipakai untuk |
|---|---|
| **Amazon EC2** (2 instance) | `app`: Nginx, backend Express, Supabase Auth (GoTrue), PostgREST. `queue`: Queue Microservice, terpisah sebagai layanan tersendiri |
| **Amazon RDS for PostgreSQL** | Database tunggal: akun login (schema `auth`) dan seluruh data klinik (schema `public`) |
| **Amazon S3** (2 bucket) | Hosting file frontend dan penyimpanan foto profil dokter |
| **Amazon CloudFront** | HTTPS gratis, CDN, dan satu domain untuk frontend + API + foto (tanpa CORS, tanpa beli domain) |
| **Amazon CloudWatch** | Log aplikasi, metrik memori/disk, dan alarm CPU |
| **VPC Security Group** | Firewall antar komponen: RDS hanya dari EC2, queue hanya dari EC2 app, EC2 app hanya dari CloudFront |
| **Elastic IP** | Alamat EC2 app tetap walau instance di-stop tiap sesi lab berakhir |
| **IAM (LabRole / LabInstanceProfile)** | EC2 mengakses S3 dan CloudWatch tanpa access key di `.env` |

**Kenapa login tetap "Supabase Auth"?** Supabase Auth adalah software open source (GoTrue). Software itu dijalankan sendiri di EC2 dan menyimpan akun di RDS. Jadi **tidak ada lagi layanan Supabase cloud** yang dipakai, dan kode frontend/backend hampir tidak berubah. Satu-satunya perubahan kode adalah provider S3 untuk foto.

---

## 2. Biaya & batasan Learner Lab (baca dulu)

- Budget **$100** untuk seluruh lab. Kalau habis, akun dinonaktifkan dan semua hilang.
- Hanya region **us-east-1** (pakai ini) atau us-west-2. Key pair `vockey` hanya ada di us-east-1.
- EC2 hanya ukuran nano–large. RDS hanya nano–medium, **tanpa Multi-AZ**. Anda tidak bisa membuat IAM role, jadi selalu pakai **LabRole / LabInstanceProfile**.
- Saat sesi lab berakhir, **EC2 otomatis di-stop**, tetapi **RDS tetap berjalan dan terus memakan budget**. Stop RDS manual bila tidak dipakai beberapa hari (RDS → Actions → Stop temporarily). AWS menyalakannya lagi otomatis setelah 7 hari.

Perkiraan biaya (On-Demand us-east-1, kisaran):

| Komponen | Kira-kira |
|---|---|
| RDS db.t3.micro + 20 GB | ± $0,02/jam (± $15/bulan bila nyala terus) |
| EC2 t3.small + t3.micro | ± $0,03/jam, hanya saat sesi lab berjalan |
| Elastic IP / IPv4 publik | ± $0,005/jam per alamat |
| S3, CloudFront, CloudWatch | hampir $0 untuk skala tugas |

---

## 3. Persiapan di laptop

1. Pastikan semua perubahan sudah di-**push ke GitHub**. Bila repo privat, siapkan *Personal Access Token* (GitHub → Settings → Developer settings) untuk `git clone` di EC2.
2. Buat semua rahasia:
   ```bash
   node deploy/aws/scripts/generate-keys.mjs > rahasia.env
   ```
   Isinya: `JWT_SECRET`, `ANON_KEY` (untuk frontend), `SERVICE_ROLE_KEY` (hanya backend), `QUEUE_INTERNAL_TOKEN`, `AUTH_DB_PASSWORD`, `API_DB_PASSWORD`.
   **Jangan commit `rahasia.env`** (sudah ada di `.gitignore`).
3. Tentukan juga **password master RDS** sendiri (minimal 8 karakter, hindari `@ / " '`).

---

## 4. Buat Security Group (VPC → Security groups, VPC default)

| Nama | Inbound | Keterangan |
|---|---|---|
| `jc-app` | HTTP 80 dari **managed prefix list** `com.amazonaws.global.cloudfront.origin-facing`; SSH 22 dari *My IP* | EC2 app hanya bisa diakses CloudFront |
| `jc-queue` | TCP 3002 dari security group `jc-app`; SSH 22 dari *My IP* | Queue service tidak publik |
| `jc-rds` | PostgreSQL 5432 dari `jc-app` dan dari `jc-queue` | Database tidak publik |

---

## 5. Buat database Amazon RDS

RDS → **Create database**:
- *Standard create* → **PostgreSQL**, versi 16.x
- Templates: **Free tier** atau *Dev/Test*
- DB instance identifier: `janjicare-db`
- Master username: **`postgres`** (wajib nama ini, karena migrasi Auth memberi hak ke role `postgres`). Isi Master password.
- Instance class: **db.t3.micro**. Storage: gp2 20 GB, matikan *storage autoscaling*.
- Availability: **Single-AZ** (Multi-AZ tidak didukung Learner Lab)
- Connectivity: VPC default, **Public access: No**, security group **`jc-rds`**
- Additional configuration → **Initial database name: `janjicare`**. Matikan *Performance Insights* dan *Enhanced monitoring*.

Tunggu status *Available*, lalu catat **Endpoint**-nya (mis. `janjicare-db.xxxx.us-east-1.rds.amazonaws.com`).

---

## 6. Buat bucket S3

S3 → **Create bucket** (us-east-1), *Block all public access* **tetap dicentang** (akses publik lewat CloudFront):
1. `janjicare-web-<nim-atau-acak>`: file frontend
2. `janjicare-foto-<nim-atau-acak>`: foto dokter (objek disimpan di folder `doctor-photos/`)

---

## 7. EC2 "app"

EC2 → **Launch instance**:
- Name `janjicare-app`, AMI **Amazon Linux 2023**, type **t3.small**, key pair **vockey**
- Network: VPC default, subnet publik, *Auto-assign public IP: Enable*, security group **`jc-app`**
- Storage 20 GB gp3
- Advanced details → **IAM instance profile: `LabInstanceProfile`**

Lalu **Elastic IPs → Allocate → Associate** ke `janjicare-app`. Catat **Public IPv4 DNS** instance (mis. `ec2-44-1-2-3.compute-1.amazonaws.com`).

Masuk lewat **EC2 Instance Connect** atau SSH (`ssh -i labsuser.pem ec2-user@<elastic-ip>`):

```bash
sudo dnf install -y git
sudo mkdir -p /opt/janjicare && sudo chown ec2-user /opt/janjicare
git clone https://github.com/<akun>/Clinic-Web-Appointment-main.git /opt/janjicare/app
sudo bash /opt/janjicare/app/deploy/aws/ec2/install.sh app
```

Skrip ini memasang Node.js 22, Nginx, PM2, klien PostgreSQL, Supabase Auth v2.164.0, dan PostgREST v12.2.3 (checksum diverifikasi), lalu menyalin template konfigurasi.

### 7a. Siapkan database (sekali saja)

Salin isi `rahasia.env` ke EC2 (mis. `nano ~/rahasia.env`), lalu:

```bash
cd /opt/janjicare/app && source ~/rahasia.env
export RDS=<endpoint-rds>
export PGPASSWORD='<password-master-rds>'
DB="host=$RDS port=5432 dbname=janjicare user=postgres sslmode=require"

# 1) role & schema yang biasanya disediakan Supabase
psql "$DB" -v auth_pw="$AUTH_DB_PASSWORD" -v api_pw="$API_DB_PASSWORD" -f deploy/aws/rds/00_bootstrap.sql
```

### 7b. Isi konfigurasi

Ganti setiap `<...>` di tiga file berikut. `<DOMAIN_CLOUDFRONT>` diisi nanti di langkah 9. Untuk sementara biarkan, atau isi `localhost`.

| File | Isi dari |
|---|---|
| `/opt/janjicare/config/gotrue.env` | `AUTH_DB_PASSWORD`, `JWT_SECRET`, endpoint RDS |
| `/opt/janjicare/config/postgrest.conf` | `API_DB_PASSWORD`, `JWT_SECRET`, endpoint RDS |
| `/opt/janjicare/app/backend/.env` | `ANON_KEY`, `SERVICE_ROLE_KEY`, `QUEUE_INTERNAL_TOKEN`, IP privat EC2 queue (langkah 8), nama bucket foto |

### 7c. Migrasi & jalankan

```bash
# 2) tabel Supabase Auth (54 migrasi)
set -a; source /opt/janjicare/config/gotrue.env; set +a
/opt/janjicare/auth/auth migrate

# 3) skema JanjiCare + akses service_role
for f in backend/sql/01_schema_and_rls.sql backend/sql/02_security_status_queue.sql \
         backend/sql/03_doctor_photos.sql deploy/aws/rds/99_service_role_policies.sql; do
  psql "$DB" -v ON_ERROR_STOP=1 -f "$f"
done

# 4) jalankan semua proses (otomatis hidup lagi setelah EC2 restart)
pm2 start deploy/aws/ec2/ecosystem.config.cjs --only auth,postgrest,backend && pm2 save
curl -s localhost/api/health && curl -s localhost/auth/v1/health
```

### 7d. Isi data awal

```bash
cd /opt/janjicare/app/backend
node scripts/create-staff-user.js --role admin --email admin@klinik.id --name "Admin Klinik" --password "<password-kuat>"
# data 10 dokter: salin backend/scripts/data/dokter-dummy.json dari laptop (file ini tidak ada di Git)
node scripts/seed-doctors.js --jadwal --foto ../janjicare-frontend/public/image
```

Akun dari Supabase lama **tidak ikut pindah**. Buat ulang dengan perintah di atas, dan pasien mendaftar lagi.

---

## 8. EC2 "queue"

Launch instance kedua: `janjicare-queue`, Amazon Linux 2023, **t3.micro**, key `vockey`, security group **`jc-queue`**, instance profile `LabInstanceProfile`. Catat **Private IPv4**-nya lalu isi di `QUEUE_SERVICE_URL` pada `backend/.env` EC2 app.

```bash
sudo dnf install -y git
sudo mkdir -p /opt/janjicare && sudo chown ec2-user /opt/janjicare
git clone https://github.com/<akun>/Clinic-Web-Appointment-main.git /opt/janjicare/app
sudo bash /opt/janjicare/app/deploy/aws/ec2/install.sh queue
nano /opt/janjicare/app/services/queue-service/.env      # endpoint RDS, password master, QUEUE_INTERNAL_TOKEN, IP privat EC2 app
pm2 start /opt/janjicare/app/deploy/aws/ec2/ecosystem.config.cjs --only queue && pm2 save
```

Kembali ke EC2 app: `pm2 restart backend`, lalu cek `curl -s localhost/api/health`.

---

## 9. CloudFront

CloudFront → **Create distribution**:

**Origin 1 (default): bucket frontend.** Origin domain: `janjicare-web-…s3.us-east-1.amazonaws.com`. Origin access: **Origin access control settings** → *Create new OAC*.
- Default behavior: *Redirect HTTP to HTTPS*, cache policy **CachingOptimized**
- Settings: **Default root object `index.html`**
- WAF: *Do not enable*

Setelah distribusi dibuat:

1. **Origins → Create origin**
   - **Origin 2:** bucket foto, juga memakai OAC.
   - **Origin 3:** *Public IPv4 DNS* EC2 app (`ec2-…compute-1.amazonaws.com`), protocol **HTTP only**, port 80.
2. **Behaviors → Create behavior** (urutan ini):

   | Path pattern | Origin | Methods | Cache policy | Origin request policy |
   |---|---|---|---|---|
   | `/api/*` | EC2 app | GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE | **CachingDisabled** | **AllViewerExceptHostHeader** |
   | `/auth/v1/*` | EC2 app | GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE | **CachingDisabled** | **AllViewerExceptHostHeader** |
   | `/doctor-photos/*` | bucket foto | GET, HEAD | CachingOptimized | — |

3. **Error pages → Create custom error response**: 403 dan 404 → response page `/index.html`, HTTP code **200**. Ini diperlukan agar alamat seperti `/patient/doctors` bisa di-refresh.
4. Buka setiap bucket → **Permissions → Bucket policy**, tempel policy yang ditawarkan CloudFront (tombol *Copy policy* pada origin OAC).

Catat domain distribusi (mis. `d1abcd.cloudfront.net`), lalu di EC2 app:

```bash
# ganti <DOMAIN_CLOUDFRONT> di gotrue.env dan backend/.env, lalu:
pm2 restart auth backend
# build & unggah frontend (pakai LabRole, tanpa access key)
bash /opt/janjicare/app/deploy/aws/scripts/deploy-frontend.sh janjicare-web-<…> <ID-distribusi> "$ANON_KEY"
```

Buka `https://<domain>.cloudfront.net` dan login sebagai admin.

---

## 10. CloudWatch (log, metrik, alarm)

Di **setiap** EC2:

```bash
sudo dnf install -y amazon-cloudwatch-agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s \
  -c file:/opt/janjicare/app/deploy/aws/cloudwatch/amazon-cloudwatch-agent.json
```

- Log muncul di CloudWatch → Log groups `/janjicare/backend`, `/janjicare/auth`, `/janjicare/queue`, `/janjicare/nginx`.
- Buat alarm: CloudWatch → Alarms → *EC2 CPUUtilization > 80% selama 5 menit* untuk `janjicare-app`, dan *RDS FreeStorageSpace < 2 GB*. Bila ingin notifikasi email, tambahkan topik SNS.

---

## 11. Uji setelah deploy

1. `https://<domain>/api/health` → `"success": true`
2. Daftar akun pasien baru → login → masuk `/patient/dashboard`
3. Admin: Data Dokter tampil berfoto. Ganti foto satu dokter, lalu cek objek baru di bucket foto (`doctor-photos/<id>/…`).
4. Pasien booking → admin konfirmasi → pasien check-in → nomor antrean muncul (memastikan EC2 queue terhubung).
5. Dokter memanggil antrean → layar `/queue/tv` ikut berubah.
6. Refresh di halaman `/patient/doctors` tidak menghasilkan error 403/404.
7. CloudWatch menampilkan log dari kedua EC2.

---

## 12. Setiap kali memulai sesi lab

1. **Start Lab**, tunggu ikon AWS hijau.
2. EC2 menyala lagi dengan sendirinya, dan PM2 menjalankan ulang semua proses. Elastic IP membuat alamat origin CloudFront tetap sama.
3. Bila RDS sempat di-stop: RDS → Actions → **Start**. Tunggu *Available*, lalu `pm2 restart all` di kedua EC2.
4. Memperbarui kode: `cd /opt/janjicare/app && git pull && (cd backend && npm ci --omit=dev) && pm2 restart all`, lalu jalankan ulang `deploy-frontend.sh` bila frontend berubah.

---

## 13. Masalah umum

| Gejala | Penyebab & solusi |
|---|---|
| CloudFront **502** di `/api/...` | EC2 mati / PM2 belum jalan (`pm2 status`), atau security group `jc-app` belum mengizinkan prefix list CloudFront |
| Login gagal "Database error" | `gotrue.env` salah password/endpoint. Cek `pm2 logs auth` |
| `permission denied for table ...` | `99_service_role_policies.sql` belum dijalankan setelah 01–03 |
| Antrean tidak muncul saat check-in | `QUEUE_SERVICE_URL` / token tidak sama, atau port 3002 di `jc-queue` belum dibuka untuk `jc-app` |
| Unggah foto "tidak punya izin ke bucket S3" | EC2 belum memakai `LabInstanceProfile` (Actions → Security → Modify IAM role) |
| Foto 403 | Bucket policy OAC untuk bucket foto belum ditempel |
| Halaman putih / 403 saat refresh | Custom error response 403/404 → `/index.html` belum dibuat |
| `npm run build` berhenti "Killed" | Memori kurang. `install.sh` sudah membuat swap 2 GB; pakai minimal t3.small |

---

## 14. Untuk laporan (konsep sistem terdistribusi)

- **Pemisahan layanan:** frontend statis (S3/CloudFront), API (EC2 app), Auth (GoTrue), dan antrean (EC2 queue) adalah proses terpisah yang berkomunikasi lewat HTTP.
- **Komunikasi antar-layanan aman:** backend ↔ queue memakai token internal dan security group. Queue tidak bisa diakses publik.
- **Konsistensi data:** nomor antrean dibuat dalam transaksi + advisory lock + UNIQUE constraint, sehingga permintaan ganda tidak menghasilkan nomor ganda (idempoten).
- **Ketersediaan:** PM2 menghidupkan ulang proses yang mati. CloudFront menyajikan frontend dari edge location.
- **Observabilitas:** log terpusat dan alarm di CloudWatch.

Pengembangan lanjutan bila diminta dosen:
- Application Load Balancer + Auto Scaling Group untuk EC2 app (backend sudah stateless).
- Amazon SQS antara backend dan queue service, karena pembuatan tiket sudah idempoten sehingga aman untuk *at-least-once delivery*.
