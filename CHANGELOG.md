# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2026-11-11

### Added
- Deploy AWS Academy Learner Lab (`deploy/aws/`, `docs/DEPLOY_AWS.md`): EC2 (app + queue), Amazon RDS PostgreSQL, S3 + CloudFront, CloudWatch.
- Supabase Auth (GoTrue) & PostgREST dijalankan sendiri di EC2 dengan database RDS — kode aplikasi tidak berubah.
- `deploy/aws/rds/00_bootstrap.sql` & `99_service_role_policies.sql` untuk master user RDS yang bukan superuser.
- Provider Amazon S3 untuk foto dokter (`STORAGE_PROVIDER=s3`) + tes dengan SDK AWS.
- `TRUST_PROXY` (backend) dan `VITE_SUPABASE_URL=same-origin` (frontend) untuk deploy di belakang CloudFront.

## [2.1.0] - 2026-11-08

### Added
- Foto profil dokter: kolom `doctor_details.photo_path`, bucket Supabase Storage `doctor-photos` (publik, maks 2 MB, JPEG/PNG/WebP) dengan RLS Storage Policy (hanya admin menulis).
- Endpoint admin `PUT/DELETE /api/v1/doctors/:id/photo` dengan validasi tipe (magic bytes) & ukuran; penggantian foto aman (foto lama dihapus setelah foto baru tersimpan).
- Lapisan abstraksi storage (`uploadDoctorPhoto`, `getDoctorPhotoUrl`, `deleteDoctorPhoto`) agar mudah dipindah ke Amazon S3.
- Komponen foto pada formulir Tambah/Ubah Dokter (pratinjau, ganti, hapus, validasi, status unggah).
- Direktori dokter pasien (`/patient/doctors`) dengan kartu berfoto, pencarian nama, filter spesialisasi & ketersediaan jadwal, dan "Tampilkan Lebih Banyak".
- Halaman profil dokter `/patient/doctors/:id` (foto besar, profil, jadwal & sisa slot, tombol Buat Janji Temu yang memilih dokter otomatis).
- Bagian "Dokter Pilihan Kami" di beranda pasien (data dari API).
- 10 potret ilustrasi orisinal untuk dokter fiktif (`backend/scripts/data/foto-dokter/`) dan opsi `--foto` pada `seed-doctors.js`.

### Security
- Trigger database menolak perubahan `photo_path` oleh selain admin; path wajib berada di folder milik dokter tersebut.

## [2.0.0] - 2026-11-08

### Changed
- Backend Laravel/PHP + Inertia digantikan sepenuhnya oleh Node.js (Express) + REST API, React Router, dan Supabase Auth.
- Antrean dipindahkan ke Queue Microservice dengan penyimpanan PostgreSQL (persisten & idempoten).
- Tiga dasbor terpisah (admin, dokter, pasien) dengan menu baru; seluruh antarmuka berbahasa Indonesia.
- Tampilan baru dengan palet Back in Black / Funkie Friday / Moonscape / Decanting / Mountain Heather dan tipografi serif.
- CI GitHub Actions kini menjalankan tes Node.js (termasuk tes database PostgreSQL) dan build frontend.

### Removed
- Folder `clinic-app/` (Laravel) beserta `run.bat`, `deploy.ps1`, dan skrip migrasi frontend lama. Versi terakhirnya tersimpan di tag `legacy-laravel`.

### Security
- Booking atas nama pasien lain, perubahan status langsung oleh pasien, dan eskalasi role ditutup di level database (RLS & fungsi SECURITY DEFINER).

## [1.x] - Laravel (arsip)

### Added
- Initial setup for JanjiCare Web Appointment System.
- Admin, Doctor, and Patient dashboards with tailored metrics.
- Appointment scheduling workflow with conflict validation.
- Notification system for real-time status updates.
- Tailwind CSS styling for a responsive and modern user interface.
- Export to PDF functionality for system reports.
- Advanced Analytics Dashboard showing appointment trends.
- **AI Configuration UI**: New admin settings page for configuring external AI models, featuring an adaptive terminal UI with real-time connection logging and status badges.
- **Universal AI Chatbot**: Expanded the JanjiCare AI Assistant beyond the patient portal, making it available to Doctors and Administrators across all authenticated dashboards.

### Fixed
- **OWASP A10 Vulnerability**: Fixed an information disclosure leak in the AI connection test endpoint by preventing raw backend exceptions and stack traces from being exposed to the client.
- **CI Pipeline Stabilized**: Fixed GitHub Actions failing on empty Reverb environment variables and missing Redis containers by correctly provisioning fallback values and updating default caching drivers to use `database`.
- Addressed mobile view padding issues in Analytics and Reports dashboards.
- Resolved text wrapping and truncation issues for long doctor specialties.
- Fixed sidebar collapse bug on mobile screens.
- Corrected missing table syntax tags in Reports overview.

### Changed
- Refactored mobile list views for enhanced readability and performance.
