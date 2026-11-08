# Rencana Deployment AWS & Migrasi Supabase → Amazon RDS

## Peta komponen

| Sekarang | AWS | Catatan |
|---|---|---|
| Frontend Vite (`npm run build` → `dist/`) | S3 + CloudFront | SPA: arahkan error 403/404 ke `/index.html`. Isi `VITE_*` saat build (CodeBuild). |
| Backend Express (`backend/`) | EC2 (atau ECS) di belakang ALB | `app.set("trust proxy", 1)` sudah aktif; `FRONTEND_URL` mendukung banyak origin (pisahkan koma). Health check ALB: `GET /api/health`. |
| Queue Service (`services/queue-service/`) | EC2/ECS di subnet privat | Tidak boleh publik. Hanya backend yang memanggil, dengan header `X-Internal-Token`. Health: `GET /api/v1/queue/health`. |
| Supabase PostgreSQL | Amazon RDS PostgreSQL 15+ | Lihat langkah migrasi di bawah. |
| Supabase Storage bucket `doctor-photos` | Amazon S3 (+ CloudFront) | Lihat bagian "Foto dokter → S3". |
| Rahasia `.env` | SSM Parameter Store / Secrets Manager | `SUPABASE_SERVICE_ROLE_KEY`, `QUEUE_INTERNAL_TOKEN`, `DATABASE_URL`. |
| Log `morgan` | CloudWatch Logs (agent / awslogs driver) | |
| Panggilan HTTP backend → queue | (opsional) SQS + Lambda | Lihat bagian SQS. |

Semua uji otomatis berjalan di Linux (lihat `docs/LAPORAN_PERUBAHAN.md`), termasuk perbaikan import huruf besar-kecil yang sebelumnya hanya lolos di Windows.

## Migrasi database Supabase → RDS

Skema JanjiCare berada di schema `public` dan sengaja dibuat portabel. Bagian yang bergantung pada Supabase hanya:

1. `auth.users` (referensi FK `profiles.id`) dan trigger `on_auth_user_created`.
2. Fungsi `auth.uid()` yang dipakai RLS dan fungsi RPC.
3. Role `anon`, `authenticated`, `service_role`.

Langkah yang disarankan:

1. **Bekukan penulisan** (mode pemeliharaan), lalu `pg_dump --schema=public --no-owner` dari Supabase (URI koneksi "Session", port 5432).
2. Di RDS buat role dan schema pengganti:
   - Buat schema `auth` dengan tabel `auth.users(id uuid primary key, email text, raw_user_meta_data jsonb, created_at timestamptz)` — atau ganti FK `profiles.id` ke tabel pengguna milik penyedia auth baru (mis. `sub` dari Amazon Cognito).
   - Buat fungsi `auth.uid()` yang membaca `current_setting('request.jwt.claim.sub', true)` (contoh lengkap di `backend/tests/db/supabase_stub.sql`). Backend/queue mengisi setting ini per transaksi.
   - Buat role `anon`, `authenticated`, `service_role` (agar `GRANT` dan RLS tetap berlaku).
3. Jalankan `backend/sql/01_schema_and_rls.sql`, `02_security_status_queue.sql`, lalu `03_doctor_photos.sql` di RDS (bagian Storage otomatis dilewati bila schema `storage` tidak ada), kemudian `pg_restore --data-only` hasil dump.
4. **Queue Service**: cukup ganti `DATABASE_URL` ke endpoint RDS (`DATABASE_SSL=true`). Tidak ada perubahan kode — layanan ini memakai driver `pg` biasa, bukan Supabase.
5. **Backend utama**: saat ini memakai supabase-js (PostgREST + Supabase Auth). Untuk RDS ada dua jalur:
   - *Jalur cepat*: tetap pakai Supabase Auth, pindahkan data saja → jalankan PostgREST sendiri di depan RDS.
   - *Jalur penuh*: ganti lapisan data backend ke `pg` (pola yang sama seperti queue service: transaksi + `set_config('request.jwt.claim.sub', userId, true)` + `SET LOCAL ROLE authenticated` agar RLS tetap aktif) dan Auth ke Cognito. Kontrak REST `/api/v1/*` untuk frontend **tidak berubah**.
6. Validasi: jalankan `TEST_DATABASE_URL=<db RDS uji kosong> npm test` di backend dan queue service — tes DB membangun skema dari nol dan menguji RLS, booking atomik, dan antrean.

## Foto dokter: Supabase Storage → Amazon S3

Database hanya menyimpan **path** objek (`doctor_details.photo_path`, mis. `<doctor_id>/<timestamp>-<uuid>.jpg`), bukan URL penyedia.
Seluruh akses storage di backend melewati `backend/src/services/storage/doctorPhotoStorage.js`
(`uploadDoctorPhoto`, `getDoctorPhotoUrl`, `deleteDoctorPhoto`); frontend hanya membaca `photo_url` dari API dan mengunggah lewat
`PUT /api/v1/doctors/:id/photo`, sehingga **tidak perlu diubah**.

1. Buat bucket S3 privat + distribusi CloudFront (Origin Access Control) untuk baca publik.
2. Salin objek: unduh isi bucket `doctor-photos` dari Supabase lalu `aws s3 sync ./doctor-photos s3://<bucket>/` (struktur folder tetap sama, jadi `photo_path` di database tidak berubah).
3. Tambahkan provider S3 (`put` = `PutObjectCommand`, `remove` = `DeleteObjectCommand` dari `@aws-sdk/client-s3`) di folder `services/storage/` dengan antarmuka yang sama seperti `supabaseProvider.js`, lalu daftarkan untuk `STORAGE_PROVIDER=s3`. Kredensial lewat IAM Role EC2, bukan access key di `.env`.
4. Set `PUBLIC_PHOTO_BASE_URL=https://<domain-cloudfront>` — `photo_url` otomatis mengarah ke CloudFront.
5. Validasi batas 2 MB & tipe file tetap dilakukan backend (magic bytes), tidak bergantung pada penyedia.

Catatan: provider S3 **belum** diimplementasikan/diuji di repositori ini; yang berjalan dan teruji saat ini adalah Supabase Storage.

## Integrasi SQS / Lambda (opsional, tanpa mengubah frontend)

Backend saat ini memanggil queue service secara sinkron (`backend/src/services/queueClient.js`). Pembuatan tiket sudah **idempoten** (UNIQUE `appointment_id` + advisory lock), sehingga aman untuk *at-least-once delivery*:

1. Backend mengirim pesan `{ type: "CHECKED_IN", appointment_id, actor_id }` ke SQS setelah check-in.
2. Lambda (atau worker queue service) mengonsumsi pesan dan menjalankan `QueueService.generateTicket` — pesan ganda tidak menghasilkan tiket ganda.
3. Frontend tetap membaca status lewat `GET /api/v1/queue/mine` dan `/queue/display`.

## Konfigurasi wajib di production

- Backend: `NODE_ENV=production`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `QUEUE_SERVICE_URL`, `QUEUE_INTERNAL_TOKEN`, `FRONTEND_URL`, serta opsional `STORAGE_PROVIDER`, `DOCTOR_PHOTO_BUCKET`, `PUBLIC_PHOTO_BASE_URL`.
- Queue: `NODE_ENV=production`, `DATABASE_URL`, `QUEUE_INTERNAL_TOKEN` (layanan menolak start bila kosong).
- Frontend build: `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Jangan isi `VITE_DEMO_*`.
