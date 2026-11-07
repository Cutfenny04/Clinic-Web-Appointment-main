# Laporan Audit Fase 1 — JanjiCare

Tanggal audit: 8 November 2026 · Commit: `67380166` (branch `main`, working tree bersih)
Lingkup: `janjicare-frontend/`, `backend/`, `services/queue-service/`, `backend/sql/`, serta kesiapan penghapusan `clinic-app/` (Laravel).

> Belum ada perubahan kode. Satu-satunya file baru adalah laporan ini.

---

## 0. Ringkasan eksekutif

| Area | Kondisi | Tingkat |
|---|---|---|
| Login & role | Tidak ada proteksi nyata: pengguna default = **admin demo**; `ProtectedRoute` **mengganti role otomatis** agar halaman apa pun bisa dibuka | Kritis |
| Data halaman | **0 dari 50+ halaman** memanggil backend Express. Semua data berasal dari `mockData.js` lewat HOC `withPageProps` | Kritis |
| Aksi tombol | Semua submit memakai nama route Laravel (`route("admin.doctors.store")`) → URL tebakan → **404** di Express | Kritis |
| Keamanan DB | RPC booking bisa dipanggil untuk pasien lain; pasien bisa mengubah status janji temunya sendiri lewat Supabase langsung | Tinggi |
| Nomor antrean | Bisa **duplikat** setelah ada pembatalan (rumus `COUNT + 1`) | Tinggi |
| Queue service | Data hanya di memori (hilang saat restart), **tanpa autentikasi**, tanggal memakai UTC | Tinggi |
| Build Linux/AWS | `npm run build` **gagal di Linux** karena 9 import salah huruf besar-kecil (lolos di Windows) | Tinggi |
| Bahasa | Sebagian besar sudah Bahasa Indonesia; sisa ada di data spesialisasi, beberapa fallback, dan format waktu `en-US` | Sedang |

---

## 1. Hasil pengujian baseline

| Perintah | Hasil | Catatan |
|---|---|---|
| `backend: npm test` | 13 lulus, **2 gagal** | `GET /doctors` dan `GET /schedules` → 500 `fetch failed`. Tes ini memanggil Supabase sungguhan; lingkungan audit tidak punya akses jaringan ke Supabase. Perlu diulang di komputer dengan internet, dan sebaiknya tes dipisah menjadi unit test (mock) + integration test. |
| `queue-service: npm test` | 8/8 lulus | Hanya menguji penyimpanan in-memory. |
| `frontend: npm run build` | **Gagal di Linux** | `Could not resolve "./Partials/DeleteUserForm"`. Setelah 9 path diperbaiki (di salinan uji, bukan di repo), build **berhasil** dengan peringatan chunk > 500 kB. |

Import yang salah huruf (wajib diperbaiki sebelum deploy ke EC2/CodeBuild):

```
src/pages/profile/Edit.jsx            ./Partials/*        → ./partials/*   (5 import)
src/pages/patient/Schedules.jsx       ../../Utils/time    → ../../utils/time
src/pages/patient/Appointments.jsx    ../../Utils/time    → ../../utils/time
src/pages/doctor/Schedules.jsx        ../../Utils/time    → ../../utils/time
src/pages/doctor/Appointments.jsx     ../../Utils/time    → ../../utils/time
```

---

## 2. Autentikasi & role (frontend)

File: `src/contexts/AuthContext.tsx`, `src/routes/ProtectedRoute.jsx`, `src/utils/withPageProps.jsx`, `src/utils/inertiaBridge.jsx`

1. **Pengguna default adalah admin.** State awal `user` = `DEMO_USERS.admin`, token awal `"demo_token_123"`. Provider juga mengembalikan `user || DEMO_USERS.admin`, sehingga `isAuthenticated` praktis selalu benar.
2. **`ProtectedRoute` tidak memblokir.** Jika role tidak cocok, ia memanggil `switchRole()` lalu tetap me-render halaman. Pasien bisa membuka `/admin/dashboard`.
3. **`withPageProps` memaksa identitas berdasarkan URL.** `/doctor/*` selalu dianggap `dr. Sarah Jenkins`, `/patient/*` selalu `Budi Santoso`, apa pun akun yang login.
4. **Form login tidak memakai password.** `useForm().post('/login')` di `inertiaBridge` memanggil `auth.login(email)` tanpa password → jalur demo; hasilnya bahkan sebuah Promise yang dibaca seperti objek (`user.role` = `undefined`), sehingga redirect selalu ke `/patient/dashboard`.
5. **Demo Quick Login** (`Login.jsx` baris 31–75) tampil tanpa pengecekan `import.meta.env.PROD`.
6. Role dibaca dari Supabase `profiles` langsung di browser; jika profil tidak ada, fallback `"patient"`. Backend sebenarnya sudah punya `/auth/me` yang memverifikasi token — belum dipakai.
7. Tidak ada penanganan token kedaluwarsa / 401 global, tidak ada halaman "Akses Ditolak".
8. Ada **dua** AuthContext (`context/` re-export ke `contexts/`), **dua** api client (`api.js` base `localhost:5000/api` vs `api.ts` base `localhost:3000/api/v1`). `inertiaBridge` memakai `api.js` (port salah).
9. `src/lib/supabase.ts` dan `lib/supabase.ts` (di luar `src`) duplikat.
10. `.env.example` frontend berisi baris non-standar `Project URL=...` dan `Publishable Key=...` (nilai asli). Publishable key memang boleh publik, tetapi formatnya harus `VITE_SUPABASE_URL=` / `VITE_SUPABASE_PUBLISHABLE_KEY=` dengan nilai contoh.

## 3. Ketergantungan Laravel/Inertia di frontend

Frontend **tidak lagi butuh server PHP untuk berjalan**, tetapi kodenya masih berbentuk Inertia:

| Ketergantungan | Lokasi | Dampak |
|---|---|---|
| `@inertiajs/react` (di-alias ke `utils/inertiaBridge.jsx` lewat `vite.config.js`) | 60 file | `useForm`, `router`, `usePage`, `Link`, `Head` palsu; `router.reload({only:[...]})` tidak melakukan apa-apa |
| `ziggy-js` / `route()` Laravel (di-alias ke `utils/route.js`, juga dipasang ke `window.route`) | ~55 file, 82 nama route | Nama route yang tidak terdaftar ditebak jadi URL (`admin.doctors.store` → `/admin/doctors/store`) |
| `window.Echo` (Laravel Echo/Reverb) | stub di `main.jsx`; dipakai `NotificationBell`, dashboard dokter & pasien, `patient/Schedules` | Realtime mati diam-diam |
| `axios` global tanpa import | `admin/AI.jsx`, `admin/Dashboard.jsx`, `AIChatbot.jsx` | `ReferenceError` saat tombol dipakai |
| Bentuk data Eloquent | hampir semua halaman (`doctor.user.name`, `doctor.specialty.name`, `schedule.date`, `schedule.time`, `slot_duration`, `apt.time_slot`) | Tidak cocok dengan respons Express (`name`, `specialty`, `schedule_date`, `start_time`) **maupun** dengan `mockData.js` (`name`, `specialization`) → nama dokter kosong di banyak tabel |

Catatan penting: file `.jsx` di `src/pages` adalah **hasil transpile** dari sumber TypeScript asli di `clinic-app/resources/js/**/*.tsx` (73 file) — terlihat dari komentar `/* @__PURE__ */` dan 262 baris > 400 karakter. Artinya stack frontend saat ini **JSX, bukan TypeScript**, dan sumber TS yang mudah dibaca hanya ada di folder Laravel.

## 4. Status per halaman

Semua halaman di bawah: data = mock, aksi = endpoint Laravel (404).

| Kelompok | Halaman | Catatan khusus |
|---|---|---|
| Auth | Login, Register, ForgotPassword, ResetPassword, ConfirmPassword, VerifyEmail, Verify2FA | Register tidak memanggil `auth.register`. 2FA & verifikasi OTP adalah fitur Laravel yang tidak ada di backend baru. |
| Admin | Dashboard, Doctors, Patients, Schedules, Appointments, Reports, Analytics, Pharmacy, AI, Security | Statistik hardcoded (12 dokter, 254 pasien, 89 janji). Menu **Pengaturan** dan **Antrean** yang diminta belum ada; Pharmacy/AI/Security tidak diminta di spesifikasi. |
| Dokter | Dashboard, Appointments, Patients, PatientEMR, Schedules, History, Analytics | Tidak ada "Antrean Hari Ini", "Panggil berikutnya", "Mulai pemeriksaan". Vitals/EMR tidak punya backend. |
| Pasien | Dashboard, Doctors, Schedules (booking), Appointments, History | Booking memakai model `time_slot` Laravel, bukan `schedule_id` + kapasitas. Belum ada halaman Nomor Antrean & Profil khusus pasien. |
| Bersama | Profile/Edit (+5 partial), queue/TV, telehealth/Room, Welcome, Error, NotFound | `queue/TV` memakai Supabase realtime ke tabel `appointments`, bukan queue service. Telehealth butuh token LiveKit dari backend yang belum ada. |

## 5. Backend Express (`backend/`)

Sudah baik: struktur modul, helmet, CORS, rate limit, validasi zod berbahasa Indonesia, `authenticate` memverifikasi token ke Supabase lalu membaca role dari `profiles`, `authorize(...roles)`, dokter hanya bisa mengubah jadwal/janji miliknya.

Masalah:

1. **Fallback non-atomik di `createAppointment`.** Jika RPC gagal dengan error yang tidak dikenali (mis. fungsi belum di-deploy), service menjalankan cek + insert manual tanpa lock → race condition & overbooking. Harus dihapus; mekanisme atomik dipertahankan.
2. **Tidak ada state machine status.** `PATCH /appointments/:id/status` menerima transisi apa pun (mis. `completed → pending`).
3. **Status `checked_in` tidak ada**, padahal alur Booking → Konfirmasi → Check-in → Antrean membutuhkannya.
4. **Riwayat perubahan status tidak tercatat** (tidak ada tabel log).
5. **Admin tidak bisa membuat akun dokter.** Backend hanya memakai publishable key; `createDoctor` hanya "mempromosikan" user yang sudah ada. Membuat akun dokter/admin secara administratif butuh `SUPABASE_SERVICE_ROLE_KEY` di server (tidak pernah di frontend).
6. Tidak ada endpoint statistik admin, daftar pasien lengkap, check-in, maupun integrasi ke queue service.
7. `updateProfile` mengabaikan `phone`; `getDoctorsList` memfilter spesialisasi di memori.
8. Pesan error kadang membocorkan pesan Postgres mentah (`"Gagal memuat ...: " + error.message`).
9. Tes `health.test.js` bergantung pada Supabase hidup.

## 6. Database & RLS (`backend/sql/01_schema_and_rls.sql`)

1. **`book_appointment_atomic` (SECURITY DEFINER) menerima `p_patient_id` dari pemanggil** dan tidak mengecek `auth.uid()`. Karena fungsi ini bisa dipanggil langsung lewat Supabase REST dengan publishable key, siapa pun yang login dapat membuat janji atas nama pasien lain. Perbaikan: abaikan parameter, pakai `auth.uid()` (atau izinkan hanya admin), dan `REVOKE EXECUTE ... FROM anon`.
2. **Policy UPDATE `appointments` tanpa `WITH CHECK` dan tanpa batas kolom.** Pasien bisa mengubah `status` menjadi `completed`, mengganti `doctor_id`, atau `queue_number` langsung dari browser. Perbaikan: perubahan status hanya lewat fungsi RPC/backend; pasien hanya boleh membatalkan.
3. **Nomor antrean duplikat.** `queue_number = COUNT(aktif) + 1`; contoh: 3 booking, nomor 2 batal → booking baru dapat nomor 3 lagi. Perbaikan: `MAX(queue_number)+1` di dalam lock, plus `UNIQUE (schedule_id, queue_number)`.
4. Tidak ada `UNIQUE` parsial untuk mencegah booking ganda di level constraint (saat ini hanya dicek di fungsi).
5. Fungsi SECURITY DEFINER tanpa `SET search_path` (peringatan linter Supabase).
6. Perbandingan `schedule_date < CURRENT_DATE` memakai zona waktu server DB (UTC), bukan Asia/Jakarta; jam praktik yang sudah lewat di hari yang sama juga masih bisa dipesan.
7. Belum ada tabel spesialisasi, riwayat status, tiket antrean, maupun rekam medis/konsultasi.

## 7. Queue Microservice (`services/queue-service/`)

1. **Tidak persisten** — tiket disimpan di array memori; restart = antrean hilang. Juga tidak bisa di-scale ke >1 instance.
2. **Tanpa autentikasi** — siapa pun dapat `POST /call` atau mengubah status tiket.
3. Tidak terhubung ke backend utama: tidak ada pemanggilan saat check-in, status tiket tidak menyinkronkan status appointment.
4. Tanggal default memakai `toISOString()` (UTC) → antara 00:00–06:59 WIB tiket tercatat di tanggal kemarin.
5. Idempotency hanya berdasarkan Map di memori; nomor urut per dokter/tanggal dihitung dari panjang array (aman selama satu proses, tidak aman bila multi-instance).
6. Rekomendasi (kompatibel dengan AWS): simpan tiket di PostgreSQL (RDS nanti) dengan `UNIQUE(appointment_id)` dan `UNIQUE(doctor_id, queue_date, queue_number)`; autentikasi antar-layanan dengan token internal; event check-in dapat dipindah ke SQS kemudian tanpa mengubah API.

## 8. Bahasa Indonesia & zona waktu

- Teks UI sudah dominan Bahasa Indonesia.
- Sisa: data spesialisasi (`Pediatrics`, `Internal Medicine`, …), fallback `"Doctor"`/`"Patient"` (`admin/Doctors.jsx:23`, `admin/Patients.jsx:20`), `toLocaleTimeString("en-US")` di `admin/AI.jsx`, pesan `"Backend server is not reachable..."` di `api.js`, `"Operation failed"` di `inertiaBridge`, nilai status mentah (`pending`, `waiting`) yang tampil di beberapa badge.
- Belum ada utilitas terpusat untuk `id-ID` + `Asia/Jakarta`; `dayjs` belum diset locale/timezone.

## 9. Kesiapan penghapusan Laravel (`clinic-app/`)

| No | Pemeriksaan | Status | Bukti |
|---|---|---|---|
| 1 | Login Laravel sudah digantikan | **Belum** | Backend auth Express ada, tapi frontend masih login demo tanpa password |
| 2 | Inertia.js tidak dipakai | **Belum** | Paket asli tidak terpasang, tetapi 60 file masih memakai API Inertia via bridge |
| 3 | Business logic controller pindah | **Sebagian** | Pindah: auth, dokter, jadwal, booking. Belum: check-in/antrean (QueueController), EMR & vitals, resep & farmasi, notifikasi, laporan/analitik, AI, telehealth (token LiveKit), security/audit log, backup, reminder email, 2FA |
| 4 | Schema PostgreSQL tersedia | **Sebagian** | 4 tabel inti. Laravel punya 28 migrasi (specialties, vitals, medications, prescriptions, notifications, audit_logs, security_logs, system_settings, chat_*) |
| 5 | Fitur klinik berfungsi | **Belum** | Lihat bagian 4 |
| 6 | Aset sudah dipindah | **Ya** (dengan catatan) | `favicon.*`, `manifest.json` sudah di `janjicare-frontend/public`. Screenshot README ada di `assets/` (root). **Sumber TSX asli** frontend hanya ada di `clinic-app/resources/js` |

Laravel Echo, route helper Ziggy, dan endpoint PHP: frontend tidak memanggil server PHP, tetapi masih memakai **pengganti palsu** ketiganya (lihat bagian 3). Setelah Fase 2–7, ketiganya bisa dihapus dari frontend.

Ukuran: `clinic-app/` di Git = 285 file (~2,7 MB); `vendor/` 113 MB sudah di-`.gitignore`. File lain yang ikut usang: `dev.bat`, `run.bat`, `deploy.ps1`, `livekit-docker-compose.yml` (jika telehealth dihentikan), README dan badge yang masih menyebut Laravel/PHP/Inertia.

**Kesimpulan:** belum aman dihapus sekarang. Aman dihapus setelah Fase 2–7 selesai dan diuji, dengan riwayat tetap tersimpan di Git (mis. tag `legacy-laravel` sebelum penghapusan).

## 10. Usulan urutan kerja

1. Perbaikan cepat: 9 import salah huruf (build Linux), satukan api client & AuthContext.
2. Fase 2: AuthContext nyata (`/auth/me`), `ProtectedRoute` + `RoleBasedRoute` yang memblokir, halaman 403, interceptor 401, Demo Login hanya di `DEV`.
3. Migrasi SQL `02_*`: perbaikan RPC & RLS, `checked_in`, `appointment_status_history`, `queue_tickets`, `specialties`, constraint unik.
4. Backend: endpoint statistik admin, pasien, check-in, transisi status, pembuatan akun dokter (service role).
5. Queue service: persisten di PostgreSQL + autentikasi internal.
6. Fase 3–5: halaman per role disambungkan ke API, mengganti `withPageProps`/`mockData` per halaman tanpa mengubah desain.
7. Fase 8–10: lokalisasi sisa, pengujian, lalu penghapusan Laravel.

## 11. Yang membutuhkan tindakan pemilik project

- **Akses Supabase**: lingkungan kerja Claude tidak dapat menjangkau Supabase. Migrasi SQL harus dijalankan oleh Anda di SQL Editor Supabase, dan tes end-to-end (login 3 role, booking, realtime) harus dijalankan di komputer Anda.
- **`SUPABASE_SERVICE_ROLE_KEY`** perlu ditambahkan sendiri ke `backend/.env` (jangan dibagikan di chat) agar admin bisa membuat akun dokter.
- Akun uji: satu admin, satu dokter, satu pasien di Supabase.
