# Panduan Instalasi JanjiCare

## Prasyarat
- **Node.js 20+** (disarankan 22) dan npm
- Akun **Supabase** (gratis) — dipakai untuk Auth dan PostgreSQL sementara
- Git

## 1. Siapkan database (Supabase)
1. Buat project di Supabase.
2. **Authentication → Sign In / Providers → Email**: aktifkan *Enable email provider*. Selama pengujian, matikan *Confirm email*.
3. **SQL Editor**: jalankan berurutan
   - `backend/sql/01_schema_and_rls.sql`
   - `backend/sql/02_security_status_queue.sql`
   - `backend/sql/03_doctor_photos.sql` — kolom foto dokter + bucket Storage `doctor-photos` (publik, maks 2 MB, JPEG/PNG/WebP) dan policy-nya

   Ketiganya aman dijalankan ulang dan tidak menghapus data. Jika SQL Editor menampilkan NOTICE
   "Tidak dapat membuat policy storage.objects", bucket tetap aman (pengguna biasa tidak bisa menulis);
   unggahan dilakukan backend dengan service role setelah memeriksa role admin.

## 2. Isi file environment

| File | Salin dari | Isi penting |
|---|---|---|
| `backend/.env` | `backend/.env.example` | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (*Secret key* `sb_secret_…`, juga dipakai untuk unggah foto dokter), `QUEUE_SERVICE_URL`, `QUEUE_INTERNAL_TOKEN` |
| `services/queue-service/.env` | `services/queue-service/.env.example` | `DATABASE_URL` (Supabase → **Connect** → URI), `DATABASE_SSL=true`, `QUEUE_INTERNAL_TOKEN` (sama persis dengan backend) |
| `janjicare-frontend/.env.local` | `janjicare-frontend/.env.example` | `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` |

Buat token internal acak:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Catatan:
- Karakter khusus pada password database di `DATABASE_URL` harus di-encode (`@` → `%40`).
- **Jangan** menaruh secret/service role key di frontend. File `.env*` sudah diabaikan Git.

## 3. Instal dependensi
```bash
cd backend && npm install
cd ../services/queue-service && npm install
cd ../../janjicare-frontend && npm install
```

## 4. Buat akun staf
Registrasi publik selalu membuat akun **pasien**. Admin pertama dibuat lewat skrip:
```bash
cd backend
node scripts/create-staff-user.js --role admin --email admin@klinik.id --name "Admin Klinik" --password "KataSandiKuat123"
```
Akun dokter dibuat admin dari menu **Data Dokter**, atau:
```bash
node scripts/create-staff-user.js --role doctor --email dokter@klinik.id --name "dr. Nama" --password "KataSandiKuat123" --specialty "Dokter Umum"
```

## 5. Jalankan
**Windows:** klik dua kali `dev.bat` — tiga jendela terbuka (queue, backend, frontend) dan browser membuka `http://localhost:5173`.

**Manual** (tiga terminal, masing-masing sekali saja):
```bash
cd services/queue-service && npm run dev    # http://localhost:3002
cd backend && npm run dev                   # http://localhost:3000
cd janjicare-frontend && npm run dev        # http://localhost:5173
```

Cek kesehatan: `http://localhost:3000/api/health` dan `http://localhost:3002/api/v1/queue/health`. Di aplikasi: **Admin → Pengaturan → Status Layanan**.

## Pemecahan masalah

| Gejala | Penyebab & solusi |
|---|---|
| `Port 3000 sudah dipakai` | Ada server lama yang masih berjalan. Tutup terminalnya atau `Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force` |
| Login: "Tidak dapat terhubung ke backend" | Backend belum berjalan, atau frontend berjalan di port selain yang ada di `FRONTEND_URL` |
| Daftar: "Email signups are disabled" | Aktifkan *Enable email provider* di Supabase |
| Login: "Email belum dikonfirmasi" | Klik tautan di email, atau jalankan `update auth.users set email_confirmed_at = now() where email = '...';` |
| Check-in gagal membuat nomor antrean | Queue service belum berjalan, atau `QUEUE_INTERNAL_TOKEN` berbeda di kedua `.env` |
| `relation "queue_tickets" does not exist` | Migrasi `02_security_status_queue.sql` belum dijalankan |
