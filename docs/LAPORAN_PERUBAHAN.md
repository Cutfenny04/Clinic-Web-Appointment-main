# Laporan Perubahan Fase 1–10 — JanjiCare

Tanggal: 8 November 2026 · Basis: commit `67380166` · **Belum di-commit** (semua perubahan ada di working tree).
Laporan audit awal: `docs/AUDIT_FASE1.md`.

## Ringkasan hasil pengujian

| Pengujian | Lingkungan | Hasil |
|---|---|---|
| `backend: npm test` (tanpa DB) | Linux | **33/33 lulus** (2 tes integrasi Supabase dilewati kecuali `RUN_SUPABASE_TESTS=1`) |
| `backend: npm test` + `TEST_DATABASE_URL` | Linux + PostgreSQL 18 | **48/48 lulus** (termasuk 15 tes SQL: RLS, booking atomik, 10 booking bersamaan pada kuota 3) |
| `queue-service: npm test` (tanpa DB) | Linux | **5/5 lulus** (11 tes DB dilewati) |
| `queue-service: npm test` + `TEST_DATABASE_URL` | Linux + PostgreSQL 18 | **16/16 lulus** (persistensi, idempotensi 10 permintaan bersamaan, nomor unik) |
| `frontend: npm run build` | Linux | **Berhasil**, tanpa peringatan ukuran chunk |
| E2E API (14 skenario + keamanan) | Stack lokal: GoTrue (Supabase Auth) + PostgREST + PostgreSQL 16 + backend + queue | **39/39 lulus** pada database baru |
| E2E browser (Playwright, Chromium) | Stack yang sama + Vite | **23/23** + **10/10** alur antrean lengkap lulus; **0 error console** aplikasi |

Pemetaan ke daftar uji Fase 10: (1–3) login 3 role ✔ · (4) redirect sesuai role & `?next=` ✔ · (5) akses lintas role → 403 di UI dan API ✔ · (6) CRUD dokter ✔ · (7) pembuatan jadwal (+ tabrakan, tanggal lampau) ✔ · (8) booking ✔ · (9) kapasitas penuh (+ uji konkuren) ✔ · (10) pembatalan sesuai aturan ✔ · (11) check-in ✔ · (12) nomor antrean unik & idempoten ✔ · (13) pembaruan antrean di dasbor dokter, pasien, dan layar TV ✔ (polling 5–15 detik) · (14) logout → token lama ditolak 401 ✔.

> Catatan jujur: E2E dijalankan pada **stack Supabase lokal** (GoTrue v2.164 + PostgREST v12), bukan pada project Supabase Anda — lingkungan kerja saya tidak dapat menjangkau Supabase cloud. Lihat "Langkah Anda" di bawah.

---

## Fase 1 — Audit
- File: `docs/AUDIT_FASE1.md` (baru).

## Fase 2 — Autentikasi & role
- Frontend: `contexts/AuthContext.tsx` (ditulis ulang: role dari `/auth/me`, tanpa pengguna demo/`switchRole`), `routes/ProtectedRoute.jsx` (`ProtectedRoute`, `RoleBasedRoute`, `GuestRoute`, `DashboardRedirect`), `pages/errors/AccessDenied.jsx` (baru, `/403`), `services/api.js` (satu klien; 401 → sesi diakhiri), `services/api.ts` (re-export), `lib/supabase.ts`, `pages/auth/Login.jsx`, `Register.jsx` (hanya pasien), `ForgotPassword.jsx`, `ResetPassword.jsx` (Supabase), `utils/withPageProps.jsx` (tanpa mock), `utils/inertiaBridge.jsx`, `App.jsx`, `main.jsx` (stub `window.Echo`/`window.route` dihapus).
- Masuk cepat demo: hanya `npm run dev` + akun uji sungguhan (`VITE_DEMO_*`); terverifikasi **tidak ada** di bundle production.
- Backend: `middleware/authenticate.js` (akun nonaktif ditolak, pesan Indonesia, dapat diuji), `authorize.js`, `modules/auth/*`, `scripts/create-staff-user.js` (baru — membuat admin/dokter secara administratif).
- Database: trigger proteksi kolom `role/is_active/email` pada `profiles`.

## Fase 3–5 — Dasbor per role
- Navigasi (`layouts/SidebarLayout.jsx`) persis sesuai menu spesifikasi; AIChatbot, lonceng notifikasi, dan timeout sesi Laravel dilepas.
- Komponen bersama baru: `components/ui/index.jsx`, `components/shared/{ScheduleManager,AppointmentDetailModal,ProfileSettings,MiniCalendar,QueueBoard}.jsx`, `components/{Head,FullPageLoader}.jsx`, `hooks/useApi.js`, `lib/toast.js`.
- Admin: `pages/admin/{Dashboard,Doctors,Patients,Schedules,Appointments,Reports}.jsx` (ditulis ulang), `Queue.jsx`, `Settings.jsx` (baru).
- Dokter: `pages/doctor/{Dashboard,Schedules,Patients,History}.jsx` (ditulis ulang), `Queue.jsx`, `Consultation.jsx`, `Profile.jsx` (baru).
- Pasien: `pages/patient/{Dashboard,Doctors,Appointments,History}.jsx` (ditulis ulang), `Book.jsx`, `Queue.jsx`, `Profile.jsx` (baru).
- Halaman yang ditulis ulang tetap memakai layout, `Modal`, `Toast`, warna, font, dan ikon yang sama. Versi lamanya ada di riwayat Git dan sumber TSX di `clinic-app/resources/js`.

## Fase 6 — Booking
- `backend/sql/02_security_status_queue.sql` (baru): `book_appointment_atomic` kini memeriksa `auth.uid()` (celah booking atas nama pasien lain ditutup), dokter aktif, jadwal lewat menurut **Asia/Jakarta**, nomor urut `MAX+1` (tidak dipakai ulang), indeks unik booking aktif; `transition_appointment` (otorisasi per role + aturan pembatalan 1 jam + check-in di hari praktik); riwayat `appointment_status_history`; trigger validasi transisi; RLS: pasien tidak dapat mengubah/menyisipkan appointment langsung.
- Backend: `modules/appointments/*` (jalur insert non-atomik **dihapus**), `utils/dbError.js` (pemetaan error, pesan DB mentah tidak bocor), `modules/schedules/*` (kuota terisi, tabrakan, larangan hapus jadwal berisi booking), `modules/doctors/*`, `modules/users/users.routes.js`, `modules/admin/admin.routes.js` (baru).

## Fase 7 — Antrean
- `services/queue-service`: penyimpanan **PostgreSQL** (`queue_tickets`, `queue_counters`), transaksi + advisory lock, `UNIQUE(appointment_id)` dan `UNIQUE(doctor_id, queue_date, queue_number)`, token internal `X-Internal-Token` (perbandingan waktu-konstan), tanggal Asia/Jakarta, endpoint `/display` tanpa nama lengkap, CORS dimatikan. Kontrak `POST /ticket`, `POST /call`, `PATCH /:id/status`, `GET /`, `/stats`, `/current/:doctorId` dipertahankan.
- Konsistensi: trigger DB menyelaraskan tiket dengan status appointment (`in_progress→serving`, `completed→done`, `cancelled→cancelled`).
- Backend gateway `modules/queue/queue.routes.js` + `services/queueClient.js`; check-in idempoten.
- Layar TV `pages/queue/TV.jsx`: desain lama dipertahankan, data dari `/queue/display` (polling 5 detik).

## Fase 8 — Bahasa Indonesia
- Semua teks UI, validasi, error backend, dan pesan queue service berbahasa Indonesia; terjemahan error Supabase Auth.
- `utils/format.js`: perbaikan pergeseran tanggal zona waktu, jam ISO, plus `formatTimeRange`, `formatDateTime`, `todayJakarta`, dll. (locale `id-ID`, `Asia/Jakarta`).

## Fase 9 — UI/UX
- Loading / empty / error state di setiap halaman data, dialog konfirmasi untuk semua tindakan penting, validasi form di sisi klien dan server, sidebar responsif (diuji 390 px), tabel dengan aksi jelas, tautan footer dekoratif diganti tautan nyata.

## Fase 10 — Integrasi & kompatibilitas AWS
- Perbaikan khusus Linux: 9 import huruf besar-kecil; glob `npm test` yang di Linux diam-diam melewatkan tes.
- `trust proxy`, CORS multi-origin, rate limit login/registrasi tidak lagi mengenai `/auth/me`.
- Dokumen: `docs/API.md` (ringkasan endpoint), `docs/AWS_DEPLOYMENT.md` (strategi Supabase → RDS, SQS/Lambda), `docs/ROADMAP.md` (fitur disembunyikan).
- `.env.example` diperbarui (backend, queue, frontend — nilai asli dihapus dari contoh frontend).

---

## Error / keterbatasan yang masih tersisa
1. **Migrasi 02 belum dijalankan di Supabase Anda** — sebelum itu, fitur baru akan gagal (backend memberi pesan "Jalankan migrasi SQL terbaru" untuk booking).
2. Pembaruan "realtime" memakai **polling** (TV 5 dtk, antrean 5–10 dtk, dasbor 15–30 dtk), bukan push — dipilih agar portabel ke AWS tanpa Supabase Realtime.
3. Lapisan data backend masih supabase-js; jalur ke RDS sudah didokumentasikan.
4. Jika Supabase mewajibkan konfirmasi email, pasien baru diarahkan ke halaman masuk dengan pesan untuk memeriksa email (sudah ditangani), dan email harus benar-benar terkirim dari Supabase.
5. File lama yang tidak lagi dirutekan masih ada di repo (dikecualikan dari bundle): `pages/doctor/{Appointments,PatientEMR,Analytics}.jsx`, `pages/patient/Schedules.jsx`, `pages/profile/*`, `pages/{Dashboard,Error}.jsx`, `layouts/AuthenticatedLayout.jsx`, `utils/{inertiaBridge,route,withPageProps}.jsx`, `services/mockData.js`, alias Inertia/Ziggy di `vite.config.js`, serta komponen fitur roadmap. Disarankan dibersihkan pada commit penghapusan Laravel.
6. `README.md` masih mendeskripsikan Laravel/Inertia — perbarui bersamaan dengan penghapusan `clinic-app/`.
7. Arsip uji sementara `janjicare-frontend/node_modules/.cache/jc-e2e.tgz` dan `jc-src.tgz` (diabaikan Git) boleh dihapus.

## Langkah Anda (urut)
1. Supabase → SQL Editor: jalankan `backend/sql/02_security_status_queue.sql` (aman diulang, tidak menghapus data).
2. `backend/.env`: tambahkan `SUPABASE_SERVICE_ROLE_KEY`, `QUEUE_SERVICE_URL`, `QUEUE_INTERNAL_TOKEN`. `services/queue-service/.env`: `DATABASE_URL` (URI Postgres Supabase), `QUEUE_INTERNAL_TOKEN` (sama persis).
3. `npm install` di `backend/` dan `services/queue-service/` (dependensi baru: `pg`).
4. Buat admin pertama: `cd backend && node scripts/create-staff-user.js --role admin --email ... --name "..." --password "..."`.
5. Jalankan ketiga layanan, uji login 3 role di browser.
6. Jika semua sesuai: commit perubahan, buat tag `legacy-laravel`, lalu hapus `clinic-app/` + skrip lama di commit terpisah (lihat checklist di `docs/AUDIT_FASE1.md` §9).

---

## Pembaruan 8 November 2026 — Penghapusan Laravel
- Tag `legacy-laravel` dibuat di commit `117b2884` (versi terakhir yang masih memuat `clinic-app/`).
- Dihapus: `clinic-app/`, `run.bat`, `deploy.ps1`, `janjicare-frontend/scripts/migrate.cjs`, `janjicare-frontend/diagnose.mjs`, `janjicare-frontend/lib/supabase.ts` (duplikat).
- `dev.bat` kini menjalankan ketiga layanan sekaligus; `.github/workflows/test.yml` diganti ke Node.js + PostgreSQL.
- `README.md`, `INSTALLATION.md`, `CHANGELOG.md`, dan screenshot di `assets/` diperbarui.

## Pembaruan 8 November 2026 — Foto profil & direktori dokter

### Audit awal
- Sudah ada `profiles.avatar_url` (URL generik untuk semua pengguna, tidak pernah diisi untuk dokter). **Tidak diduplikasi.**
  Foto dokter memakai kolom baru `doctor_details.photo_path` karena yang disimpan adalah *path* objek Storage, bukan URL penyedia.
- Belum ada kolom `photo_url`/`photo_path`, bucket Storage, endpoint unggah, maupun halaman detail dokter (sebelumnya modal).

### Migrasi database: `backend/sql/03_doctor_photos.sql`
- `doctor_details.photo_path` + `photo_updated_at`; CHECK: path wajib `<user_id>/<nama>.(jpg|jpeg|png|webp)`.
- Trigger `protect_doctor_photo`: hanya admin (atau service role) yang boleh mengubah `photo_path`. Dokter tetap bisa mengubah bio sendiri.
- Bucket `doctor-photos`: publik, `file_size_limit` 2 MB, `allowed_mime_types` JPEG/PNG/WebP.

### Storage policy (`storage.objects`)
| Policy | Operasi | Siapa |
|---|---|---|
| `doctor_photos_public_read` | SELECT | semua orang (foto profil memang publik) |
| `doctor_photos_admin_insert` / `_update` / `_delete` | INSERT/UPDATE/DELETE | `authenticated` **dan** `public.is_admin()` |

Backend mengunggah dengan service role **setelah** memeriksa role admin; policy di atas adalah lapisan kedua. Service role key tidak pernah dikirim ke frontend.

### Backend
- `src/services/storage/doctorPhotoStorage.js`: `uploadDoctorPhoto()`, `getDoctorPhotoUrl()`, `deleteDoctorPhoto()` + validasi ukuran & magic bytes; `supabaseProvider.js` sebagai provider (siap diganti S3, lihat `docs/AWS_DEPLOYMENT.md`).
- `PUT /api/v1/doctors/:id/photo` dan `DELETE /api/v1/doctors/:id/photo` (admin). Urutan ganti foto: unggah file baru (nama unik) → simpan path → hapus file lama. Bila langkah simpan gagal, file baru dihapus dan foto lama tetap.
- Respons dokter memuat `photo_url`; untuk pasien juga `next_available_date` & `available_sessions` (dihitung server). Dokter nonaktif → 404 untuk publik.
- `scripts/seed-doctors.js --foto` mengunggah 10 potret ilustrasi dari `scripts/data/foto-dokter/` (idempoten).

### Frontend
- `services/doctorPhotos.js` (frontend tidak memanggil Storage langsung), komponen `DoctorPhoto`, `DoctorPhotoInput`, `DoctorCard`.
- Admin → Data Dokter: foto di tabel; formulir Tambah/Ubah dengan pratinjau, ganti, hapus, validasi format/ukuran, status unggah.
- `/patient/doctors`: grid 1/2/3–4 kolom, pencarian nama, filter spesialisasi & ketersediaan, "Tampilkan Lebih Banyak", loading/empty/error.
- `/patient/doctors/:id`: foto besar, profil, biaya, jadwal & sisa slot, tombol Buat Janji Temu → `/patient/book?doctor=<id>` (dokter otomatis terpilih; kapasitas tetap divalidasi `book_appointment_atomic`).
- Beranda pasien: "Dokter Pilihan Kami" (4 dokter dari API) + "Lihat Semua Dokter".

### Foto
Potret yang dipakai adalah **ilustrasi orisinal** (`scripts/generate-doctor-portraits.py`) untuk dokter fiktif, berlatar klinik seragam.
Foto di `janjicare-frontend/public/image/` (andi.jpg, nadia.jpg, dst.) **tidak dipakai**: foto tersebut tampak sebagai foto orang sungguhan, bukan hasil AI atau aset berlisensi.

### Hasil pengujian
| Uji | Hasil |
|---|---|
| Backend `npm test` (dengan `TEST_DATABASE_URL`) | **62/62** (10 tes API foto + 4 tes DB/Storage policy baru) |
| Queue service `npm test` (dengan DB) | **16/16** |
| Frontend `vite build` | berhasil |
| E2E foto (Playwright, 12 skenario brief + 15 cek tambahan) | **27/27**, tanpa error konsol |
| Regresi: crawler semua halaman 3 role | 0 temuan |
| Regresi: aksi admin/dokter/pasien | **61/61** |

E2E dijalankan di stack lokal (GoTrue + PostgREST + PostgreSQL 16 + emulator Storage sederhana). **Belum diuji langsung terhadap Supabase Storage asli** — jalankan migrasi 03 di proyek Supabase Anda lalu `node scripts/seed-doctors.js --foto`.
