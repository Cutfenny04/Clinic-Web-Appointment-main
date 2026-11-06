# Dokumentasi API JanjiCare

Prefix URL: `http://localhost:3000/api/v1`

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
