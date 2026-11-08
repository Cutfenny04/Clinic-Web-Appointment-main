# Roadmap Fitur JanjiCare

Fitur di bawah ini **kode sumbernya tetap ada** di `janjicare-frontend/src`, tetapi **disembunyikan dari navigasi dan tidak dirutekan** karena belum memiliki backend Express. Tidak ada tombol palsu atau data dummy yang ditampilkan ke pengguna.

| Fitur | File frontend (dipertahankan) | Yang dibutuhkan agar aktif kembali |
|---|---|---|
| Apotek / Farmasi | `pages/admin/Pharmacy.jsx` | Tabel `medications`, `stock_adjustments`; modul `/pharmacy` |
| AI Chatbot | `components/AIChatbot.jsx`, `pages/admin/AI.jsx` | Endpoint proxy LLM di server (kunci API tidak boleh di frontend), tabel `chat_sessions/messages` |
| Keamanan & Audit Log | `pages/admin/Security.jsx` | Tabel `audit_logs`, `security_logs`; middleware pencatat (CloudWatch Logs di AWS) |
| Telehealth (LiveKit) | `pages/telehealth/Room.jsx` | Endpoint pembuat token LiveKit bertanda tangan + server LiveKit |
| Rekam Medis / Vitals | `pages/doctor/PatientEMR.jsx`, bagian vitals di `pages/doctor/Appointments.jsx` | Tabel `vitals`, `prescriptions`; RLS dokter-pasien |
| 2FA & verifikasi email OTP | `pages/auth/Verify2FA.jsx`, `VerifyEmail.jsx`, `ConfirmPassword.jsx` | MFA Supabase Auth (atau Amazon Cognito setelah migrasi) |
| Analitik lama | `pages/admin/Analytics.jsx`, `pages/doctor/Analytics.jsx` | Sebagian sudah digantikan menu **Laporan** (`/admin/reports`) |
| Notifikasi | `components/NotificationBell.jsx` | Tabel `notifications` + pengiriman event (SQS → Lambda → email/SMS) |
| Data medis saat registrasi (NIK, golongan darah, alergi) | (dihapus dari form, ada di sumber TSX Laravel) | Kolom profil medis + persetujuan privasi data kesehatan |

Sumber TypeScript asli halaman-halaman ini (dari versi Laravel) dapat diambil dari tag Git `legacy-laravel`, folder `clinic-app/resources/js/`:

```bash
git show legacy-laravel:clinic-app/resources/js/Pages/Admin/Pharmacy.tsx
```
