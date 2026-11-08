# Potret ilustrasi dokter (fiktif)

Sepuluh gambar di folder ini adalah **ilustrasi orisinal** yang dibuat dengan
`backend/scripts/generate-doctor-portraits.py` untuk mengisi data dokter **fiktif**
JanjiCare. Gambar ini **tidak menggambarkan orang sungguhan** dan bukan foto dokter asli.

- Nama file = nama depan dokter pada `dokter-dummy.json` (mis. `andi.jpg`).
- Ukuran 600×750 (4:5, portrait), latar klinik yang seragam.
- Unggah ke Supabase Storage: `node scripts/seed-doctors.js --foto`
- Untuk penggunaan nyata, ganti lewat menu Admin → Data Dokter → Ubah → Foto Profil.
