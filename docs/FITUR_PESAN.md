# Fitur Pesan (Chat)

Chat teks antara **pasien ↔ dokter** dan **pasien ↔ admin klinik**. Fitur ini berdiri sendiri: alur booking, antrean, konsultasi, dan pembayaran tidak berubah.

## Aturan

| Aturan | Keterangan |
|---|---|
| Chat dokter | Hanya bila pasien pernah punya janji temu (status apa pun selain *dibatalkan*) dengan dokter itu. Diperiksa ulang setiap kali pesan dikirim. |
| Siapa memulai | Pasien, dokter, maupun admin boleh memulai percakapan. |
| Kotak masuk admin | Satu percakapan admin per pasien, dipakai bersama oleh semua admin. Status "sudah dibaca" dihitung per admin. |
| Privasi | Admin **tidak** dapat melihat atau membuka chat dokter–pasien. Dokter tidak dapat melihat chat dokter lain atau kotak masuk admin. |
| Isi | Teks saja, 1–2000 karakter. Maks. 30 pesan per menit per pengguna. |
| Pembaruan | Polling (daftar 8 detik, percakapan 4 detik, badge menu 20 detik), berhenti saat tab tidak aktif. |

Semua aturan ditegakkan di database (RLS + fungsi `SECURITY DEFINER`), bukan hanya di frontend. Tabel chat tidak bisa ditulis langsung oleh `anon`/`authenticated`; penulisan hanya lewat fungsi `chat_*`.

## Berkas

| Berkas | Isi |
|---|---|
| `backend/sql/04_chat.sql` | Tabel `chat_conversations`, `chat_messages`, `chat_reads`, RLS, fungsi `chat_start`, `chat_send`, `chat_mark_read`, `chat_list`, `chat_history`, `chat_unread_total`, `chat_contacts`. Idempoten. |
| `backend/src/modules/chat/chat.routes.js` | Endpoint `/api/v1/chat/*` |
| `backend/src/utils/dbError.js` | Kode error P0030 → 403, P0031 → 400 |
| `backend/src/app.js` | Mendaftarkan rute; polling GET chat dikecualikan dari limiter global per IP (diganti limiter per pengguna 240/menit) |
| `janjicare-frontend/src/pages/shared/Messages.jsx` | Halaman Pesan untuk ketiga peran |
| `janjicare-frontend/src/layouts/SidebarLayout.jsx` | Menu "Pesan" + badge belum dibaca |
| `janjicare-frontend/src/routes/AppRoutes.jsx` | `/patient/messages`, `/doctor/messages`, `/admin/messages` |
| `janjicare-frontend/src/services/api.js` | `apiService.chat.*` |

## API

Semua endpoint butuh header `Authorization: Bearer <token>`.

| Metode | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/v1/chat/conversations` | Daftar percakapan saya (judul, pratinjau, `unread_count`) |
| GET | `/api/v1/chat/unread` | `{ unread }` total belum dibaca |
| GET | `/api/v1/chat/contacts?search=` | Pasien: dokter yang pernah ditemui. Dokter: pasiennya. Admin: semua pasien. |
| POST | `/api/v1/chat/conversations` | `{ kind: "doctor" \| "admin", other_id }` — membuka/membuat percakapan (pasien ke admin tidak perlu `other_id`) |
| GET | `/api/v1/chat/conversations/:id/messages?after=<id>` | Pesan setelah id tertentu |
| POST | `/api/v1/chat/conversations/:id/messages` | `{ body }` — kirim pesan |
| POST | `/api/v1/chat/conversations/:id/read` | Tandai sudah dibaca |

Kode status: 403 bila tidak berhak (mis. dokter belum pernah ditemui), 404 bila percakapan bukan milik Anda, 400 untuk input tidak valid, 429 bila terlalu banyak pesan.

## Memasang

**Lokal / Supabase:** jalankan `backend/sql/04_chat.sql` di SQL Editor setelah `03_doctor_photos.sql`, lalu restart backend.

**AWS (RDS):** lihat `docs/DEPLOY_AWS.md` langkah 12 butir 5 — jalankan `04_chat.sql` lalu ulangi `99_service_role_policies.sql`, `git pull`, `pm2 restart backend`, dan `deploy-frontend.sh`.

## Pengujian

- `backend/tests/db/migrations.db.test.js` — 7 tes database (aturan kelayakan, privasi, unread per admin, penolakan tulis langsung, booking tetap jalan).
- `backend/tests/api.rbac.test.js` — 5 tes endpoint.
- Uji browser end-to-end: 19 skenario lulus (pasien ↔ admin, pasien ↔ dokter, privasi, badge, tampilan ponsel), regresi 61 aksi lama tetap lulus.
