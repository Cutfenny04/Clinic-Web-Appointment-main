# JanjiCare — Sistem Janji Temu & Antrean Klinik

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Supabase Auth](https://img.shields.io/badge/Auth-Supabase-3FCF8E?logo=supabase&logoColor=white)
![AWS](https://img.shields.io/badge/Target-AWS-FF9900?logo=amazonaws&logoColor=white)
![CI](https://github.com/Cutfenny04/Clinic-Web-Appointment-main/actions/workflows/test.yml/badge.svg)

JanjiCare adalah aplikasi web klinik untuk **admin**, **dokter**, dan **pasien**: pasien memesan sesi praktik dokter, check-in di hari praktik, lalu memantau nomor antrean; dokter memanggil dan memeriksa pasien; admin mengelola dokter, jadwal, janji temu, dan antrean. Dibuat sebagai proyek akhir mata kuliah **Sistem Terdistribusi**.

![Halaman depan](./assets/landing-page.png)

## Arsitektur

```
Browser (React + Vite)
   │  REST /api/v1 + Bearer token
   ▼
Backend API (Node.js + Express)  ──── X-Internal-Token ────▶  Queue Service (Node.js + Express)
   │  supabase-js (RLS)                                          │  pg (transaksi)
   ▼                                                             ▼
                  PostgreSQL (Supabase sekarang → Amazon RDS)
                  Supabase Auth (identitas & token)
```

| Komponen | Folder | Port | Peran |
|---|---|---|---|
| Frontend | `janjicare-frontend/` | 5173 | Tiga dasbor berbeda per role, layar antrean TV |
| Backend API | `backend/` | 3000 | Autentikasi, role, dokter, jadwal, booking, check-in, gateway antrean |
| Queue Service | `services/queue-service/` | 3002 | Microservice internal: nomor antrean persisten & idempoten |
| Database | `backend/sql/` | — | Skema, Row Level Security, fungsi booking atomik, trigger status |

## Mekanisme sistem terdistribusi

- **Booking atomik** — fungsi `book_appointment_atomic` mengunci baris jadwal (`SELECT … FOR UPDATE`), sehingga 10 booking bersamaan pada kuota 3 hanya menghasilkan 3 (diuji otomatis).
- **Antrean idempoten** — satu janji temu = satu tiket (`UNIQUE(appointment_id)` + advisory lock); permintaan ganda/ulang aman, siap untuk *at-least-once delivery* (Amazon SQS).
- **Nomor antrean unik** — `UNIQUE(doctor_id, queue_date, queue_number)` dengan penghitung transaksional per dokter per hari (Asia/Jakarta).
- **Konsistensi status** — transisi status janji temu divalidasi di database dan tiket antrean disinkronkan oleh trigger; setiap perubahan tercatat di `appointment_status_history`.
- **Keamanan antar-layanan** — Queue Service hanya menerima permintaan dari backend dengan token internal; tidak dapat diakses langsung dari browser.
- **Otorisasi berlapis** — role diambil dari database, dicek di frontend (route guard), backend (middleware), dan PostgreSQL (RLS).

## Fitur per role

| Admin | Dokter | Pasien |
|---|---|---|
| Ringkasan statistik dari database | Ringkasan & janji temu menunggu konfirmasi | Beranda & janji temu berikutnya |
| Data dokter (buat akun, ubah, nonaktifkan) | Jadwal praktik sendiri | Cari dokter & detail jadwal |
| Data pasien & riwayatnya | Daftar pasien sendiri | Buat janji temu (kalender & sesi) |
| Jadwal praktik semua dokter | Antrean hari ini: panggil, lewati | Janji temu saya: batal, check-in |
| Janji temu: konfirmasi, check-in, batal | Konsultasi: diagnosis & catatan | Nomor antrean & posisi |
| Antrean semua dokter, layar TV | Riwayat pemeriksaan | Riwayat konsultasi |
| Laporan & pengaturan | Profil praktik | Profil |

| Admin | Pasien |
|---|---|
| ![Dasbor admin](./assets/admin-dashboard.png) | ![Booking pasien](./assets/patient-booking.png) |
| ![Jadwal praktik](./assets/admin-schedules.png) | ![Layar antrean TV](./assets/queue-tv.png) |

## Menjalankan secara lokal

Langkah lengkap ada di **[INSTALLATION.md](./INSTALLATION.md)**. Ringkasnya:

```bash
# 1. Jalankan backend/sql/01_schema_and_rls.sql, 02_security_status_queue.sql, lalu 03_doctor_photos.sql di Supabase SQL Editor
# 2. Salin .env.example → .env di backend/ dan services/queue-service/, .env.example → .env.local di janjicare-frontend/
# 3. Instal dependensi
cd backend && npm install && cd ../services/queue-service && npm install && cd ../../janjicare-frontend && npm install
# 4. Buat admin pertama
cd ../backend && node scripts/create-staff-user.js --role admin --email admin@klinik.id --name "Admin Klinik" --password "KataSandiKuat123"
# 5. Jalankan ketiga layanan (Windows: klik dua kali dev.bat)
```

## Pengujian

```bash
cd backend && npm test                      # API, role & akses (tanpa jaringan)
cd services/queue-service && npm test       # keamanan & validasi
# Tes database (RLS, booking atomik, antrean) — butuh PostgreSQL kosong khusus tes:
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/janjicare_test npm test
cd janjicare-frontend && npm run build
```

GitHub Actions menjalankan semuanya (termasuk tes database dengan PostgreSQL) setiap push ke `main`.

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [docs/API.md](./docs/API.md) | Daftar endpoint REST |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Arsitektur sistem |
| [docs/AWS_DEPLOYMENT.md](./docs/AWS_DEPLOYMENT.md) | Rencana deployment AWS & migrasi Supabase → RDS |
| [docs/LAPORAN_PERUBAHAN.md](./docs/LAPORAN_PERUBAHAN.md) | Laporan pengerjaan fase 1–10 & hasil uji |
| [docs/ROADMAP.md](./docs/ROADMAP.md) | Fitur yang direncanakan berikutnya |

> Versi lama berbasis Laravel + Inertia tersimpan di tag Git **`legacy-laravel`** (`git checkout legacy-laravel`).

## Lisensi

[MIT](./LICENSE)
