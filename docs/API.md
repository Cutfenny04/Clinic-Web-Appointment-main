# Dokumentasi API JanjiCare

Prefix URL: `http://localhost:3000/api/v1` · Semua pesan berbahasa Indonesia · Header auth: `Authorization: Bearer <access_token Supabase>`

## Ringkasan endpoint (versi terbaru)

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/auth/register` | Publik | Selalu membuat role `patient` (field `role` diabaikan; dipaksa juga oleh trigger DB) |
| GET | `/auth/me` | Login | Profil + role dari tabel `profiles` |
| PUT | `/auth/profile` | Login | `full_name`, `phone` |
| GET | `/admin/stats` | admin | Statistik dasbor (RPC `admin_dashboard_stats`) |
| GET | `/admin/reports?from&to` | admin | Rekap per hari / dokter / status |
| GET | `/users?role=patient&search=` | admin | Daftar pengguna + ringkasan janji temu |
| PATCH | `/users/:id/status` | admin | `{ is_active }` aktif/nonaktifkan akun |
| GET | `/doctors` · `/doctors/:id` · `/doctors/:id/schedules` | Publik (admin melihat data lengkap) | |
| POST | `/doctors` | admin | Buat akun dokter baru (`email,password,full_name,specialty,...`) — butuh `SUPABASE_SERVICE_ROLE_KEY` |
| PUT | `/doctors/:id` | admin / dokter ybs | Profil & detail praktik; `is_active` hanya admin |
| DELETE | `/doctors/:id` | admin | Nonaktifkan (soft delete); ditolak bila ada janji temu aktif |
| PUT | `/doctors/:id/photo` | admin | Unggah/ganti foto. Body = isi file mentah, `Content-Type: image/jpeg\|image/png\|image/webp`, maks 2 MB. 413 bila terlalu besar, 415 bila format/isi tidak valid |
| DELETE | `/doctors/:id/photo` | admin | Hapus foto (referensi dikosongkan, lalu file dihapus) |

Setiap objek dokter memuat `photo_url` (URL publik atau `null` → frontend menampilkan avatar default).
Untuk non-admin, `GET /doctors` dan `GET /doctors/:id` juga memuat `next_available_date` (tanggal terdekat dalam 30 hari
yang masih punya sisa kuota) dan `available_sessions`, dihitung server. Dokter nonaktif → 404 untuk publik/pasien.
| GET | `/schedules?doctor_id&date&from&to&upcoming&mine` | Publik | Termasuk `booked_count`, `remaining`, `is_full` |
| POST/PUT/DELETE | `/schedules[/:id]` | admin / dokter (miliknya) | Cek tabrakan jadwal, tanggal lampau, kapasitas ≥ booking aktif |
| POST | `/appointments` | patient | Booking atomik (RPC `book_appointment_atomic`) |
| GET | `/appointments/mine` | patient | |
| GET | `/appointments?status&date&from&to&doctor_id&patient_id` | admin / dokter (miliknya) | |
| GET | `/appointments/:id` | peserta / admin | Termasuk `status_history` |
| PATCH | `/appointments/:id/cancel` | patient / doctor / admin | `{ reason }`; pasien ≥ 1 jam sebelum praktik |
| PATCH | `/appointments/:id/status` | admin / doctor | `{ status, note?, diagnosis?, consultation_notes? }` lewat RPC `transition_appointment` |
| POST | `/appointments/:id/check-in` | admin / patient (hari praktik) | Check-in + buat nomor antrean (idempoten) |
| GET | `/queue/display` | Publik | Data layar TV (tanpa nama lengkap pasien) |
| GET | `/queue/mine` | patient | Tiket + posisi antrean |
| GET | `/queue/today?doctor_id` | doctor / admin | Tiket & statistik hari ini |
| POST | `/queue/call` | doctor / admin | Panggil berikutnya (yang tidak hadir → `skipped`) |
| PATCH | `/queue/:ticketId/status` | doctor (miliknya) / admin | `waiting|calling|serving|done|skipped` |

Alur status janji temu: `pending → confirmed → checked_in → in_progress → completed` (serta `→ cancelled` dari pending/confirmed/checked_in). Transisi lain ditolak oleh database (kode `P0020`).

Queue Microservice (`:3002/api/v1/queue`) bersifat **internal** dan mewajibkan header `X-Internal-Token`; frontend tidak memanggilnya langsung.

---

## Detail endpoint (dokumentasi awal)

---

## 1. Authentication Endpoints (`/auth`)

### 1.1. Registrasi Pengguna
- **Method:** `POST`
- **URL:** `/auth/register`
- **Akses:** Publik
- **Body JSON:**
```json
{
  "full_name": "Budi Santoso",
  "email": "budi@example.com",
  "password": "Password123!",
  "phone": "08123456789"
}
```
- **Response (201):**
```json
{
  "success": true,
  "message": "Registrasi berhasil.",
  "data": {
    "user": {
      "id": "uuid-...",
      "email": "budi@example.com"
    },
    "session": {
      "access_token": "ey...",
      "expires_at": 1700000000
    }
  }
}
```

### 1.2. Login Pengguna
- **Method:** `POST`
- **URL:** `/auth/login`
- **Akses:** Publik
- **Body JSON:**
```json
{
  "email": "budi@example.com",
  "password": "Password123!"
}
```
- **Response (200):**
```json
{
  "success": true,
  "message": "Login berhasil.",
  "data": {
    "user": { "id": "uuid-...", "email": "budi@example.com" },
    "session": { "access_token": "ey...", "expires_at": 1700000000 }
  }
}
```

### 1.3. Current User (`/auth/me`)
- **Method:** `GET`
- **URL:** `/auth/me`
- **Header:** `Authorization: Bearer <token>`
- **Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-...",
    "email": "budi@example.com",
    "full_name": "Budi Santoso",
    "role": "patient",
    "phone": "08123456789"
  }
}
```

### 1.4. Update Profile
- **Method:** `PUT`
- **URL:** `/auth/profile`
- **Header:** `Authorization: Bearer <token>`
- **Body JSON:**
```json
{
  "full_name": "Budi Santoso S.Kom"
}
```

---

## 2. Doctors Endpoints (`/doctors`)

### 2.1. Daftar Dokter
- **Method:** `GET`
- **URL:** `/doctors?specialty=Pediatrics&search=Sarah`
- **Akses:** Publik / Terautentikasi
- **Response (200):** Array data dokter.

### 2.2. Detail Dokter
- **Method:** `GET`
- **URL:** `/doctors/:id`
- **Akses:** Publik / Terautentikasi

### 2.3. Tambah Dokter (Admin)
- **Method:** `POST`
- **URL:** `/doctors`
- **Header:** `Authorization: Bearer <admin-token>`
- **Body JSON:**
```json
{
  "user_id": "uuid-user-...",
  "specialty": "Dokter Anak",
  "bio": "Spesialis kesehatan anak berpengalaman 10 tahun."
}
```

### 2.4. Update Dokter
- **Method:** `PUT`
- **URL:** `/doctors/:id`
- **Header:** `Authorization: Bearer <token>` (Admin atau Dokter pemilik)

---

## 3. Schedules Endpoints (`/schedules`)

### 3.1. Daftar Jadwal
- **Method:** `GET`
- **URL:** `/schedules?doctor_id=...&date=2026-11-10`
- **Akses:** Publik

### 3.2. Buat Jadwal Praktik
- **Method:** `POST`
- **URL:** `/schedules`
- **Header:** `Authorization: Bearer <token>` (Admin atau Dokter)
- **Body JSON:**
```json
{
  "doctor_id": "uuid-...",
  "schedule_date": "2026-11-10",
  "start_time": "09:00",
  "end_time": "12:00",
  "capacity": 15
}
```

---

## 4. Appointments Endpoints (`/appointments`)

### 4.1. Buat Janji Temu (Pasien)
- **Method:** `POST`
- **URL:** `/appointments`
- **Header:** `Authorization: Bearer <patient-token>`
- **Body JSON:**
```json
{
  "schedule_id": "uuid-schedule-...",
  "complaint": "Demam tinggi sejak 2 hari yang lalu"
}
```
- **Proteksi:**
  - Double booking ditolak dengan HTTP `409 Conflict`.
  - Jadwal kedaluwarsa ditolak dengan HTTP `400 Bad Request`.
  - Kapasitas penuh ditolak dengan HTTP `409 Conflict`.

### 4.2. Janji Temu Milik Saya (Pasien)
- **Method:** `GET`
- **URL:** `/appointments/mine`
- **Header:** `Authorization: Bearer <patient-token>`

### 4.3. Batalkan Janji Temu
- **Method:** `PATCH`
- **URL:** `/appointments/:id/cancel`
- **Header:** `Authorization: Bearer <patient-token>`

### 4.4. Update Status Pemeriksaan (Dokter/Admin)
- **Method:** `PATCH`
- **URL:** `/appointments/:id/status`
- **Header:** `Authorization: Bearer <doctor-or-admin-token>`
- **Body JSON:**
```json
{
  "status": "in_progress"
}
```

---

## 5. Queue Microservice Endpoints (Port 3002)

Prefix URL: `http://localhost:3002/api/v1/queue`

| Endpoint | Method | Deskripsi |
|---|---|---|
| `/health` | `GET` | Health check microservice |
| `/ticket` | `POST` | Terbitkan tiket antrean (idempotent via `appointment_id`) |
| `/` | `GET` | Ambil antrean hari ini (`doctor_id`, `date`, `status`) |
| `/current/:doctorId` | `GET` | Ambil pasien yang sedang aktif dilayani |
| `/call` | `POST` | Panggil antrean berikutnya |
| `/:ticketId/status` | `PATCH` | Ubah status tiket (`waiting`, `calling`, `serving`, `done`, `skipped`) |
| `/stats` | `GET` | Ringkasan statistik antrean hari ini |
