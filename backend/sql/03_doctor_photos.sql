-- ============================================================================
-- JanjiCare — Migrasi 03: Foto profil dokter (Supabase Storage)
-- Jalankan SETELAH 01_schema_and_rls.sql dan 02_security_status_queue.sql.
-- Aman dijalankan ulang (idempotent). Tidak menghapus data apa pun.
--
-- Prinsip:
--  * File foto disimpan di Storage (bucket "doctor-photos"), BUKAN sebagai binary di PostgreSQL.
--  * Database hanya menyimpan path objek (mis. "<doctor_id>/1731050000000-<uuid>.jpg"),
--    bukan URL penyedia — sehingga pindah ke Amazon S3 cukup mengganti konfigurasi backend.
--  * Kolom profiles.avatar_url (sudah ada, generik untuk semua pengguna) TIDAK diduplikasi;
--    foto dokter memakai doctor_details.photo_path karena isinya path, bukan URL.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Kolom foto pada doctor_details
-- ----------------------------------------------------------------------------
ALTER TABLE public.doctor_details ADD COLUMN IF NOT EXISTS photo_path TEXT;
ALTER TABLE public.doctor_details ADD COLUMN IF NOT EXISTS photo_updated_at TIMESTAMPTZ;

-- Path wajib berada di folder milik dokter itu sendiri: "<user_id>/<nama-file>.<jpg|jpeg|png|webp>"
ALTER TABLE public.doctor_details DROP CONSTRAINT IF EXISTS doctor_details_photo_path_check;
ALTER TABLE public.doctor_details ADD CONSTRAINT doctor_details_photo_path_check CHECK (
  photo_path IS NULL OR (
    photo_path LIKE user_id::text || '/%'
    AND photo_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}\.(jpg|jpeg|png|webp)$'
  )
);

-- Hanya admin (atau backend dengan service role) yang boleh mengubah foto.
-- Dokter tetap boleh mengubah bio/spesialisasinya sendiri lewat RLS yang ada, tetapi tidak fotonya.
CREATE OR REPLACE FUNCTION public.protect_doctor_photo()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' AND NEW.photo_path IS NOT NULL THEN
      RAISE EXCEPTION 'Hanya admin yang dapat mengatur foto dokter.' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.photo_path IS DISTINCT FROM OLD.photo_path THEN
      RAISE EXCEPTION 'Hanya admin yang dapat mengubah foto dokter.' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.photo_path IS DISTINCT FROM OLD.photo_path THEN
    NEW.photo_updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_doctor_details_protect_photo ON public.doctor_details;
CREATE TRIGGER trg_doctor_details_protect_photo BEFORE INSERT OR UPDATE ON public.doctor_details
  FOR EACH ROW EXECUTE FUNCTION public.protect_doctor_photo();

-- ----------------------------------------------------------------------------
-- 2. Bucket Storage "doctor-photos" + RLS Storage Policy
--    Bucket publik: foto profil dokter memang ditampilkan ke pengunjung.
--    Batas 2 MB dan tipe JPEG/PNG/WebP juga ditegakkan oleh Storage itu sendiri.
--    Unggah/ganti/hapus hanya admin. Backend memakai service role (melewati RLS)
--    setelah memverifikasi admin; policy di bawah adalah lapisan pertahanan kedua
--    bila ada yang mencoba langsung ke Storage API dengan token pengguna.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NULL THEN
    RAISE NOTICE 'Schema storage tidak ditemukan (bukan Supabase) — bagian Storage dilewati.';
    RETURN;
  END IF;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('doctor-photos', 'doctor-photos', TRUE, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "doctor_photos_public_read" ON storage.objects';
    EXECUTE 'CREATE POLICY "doctor_photos_public_read" ON storage.objects FOR SELECT
             USING (bucket_id = ''doctor-photos'')';

    EXECUTE 'DROP POLICY IF EXISTS "doctor_photos_admin_insert" ON storage.objects';
    EXECUTE 'CREATE POLICY "doctor_photos_admin_insert" ON storage.objects FOR INSERT TO authenticated
             WITH CHECK (bucket_id = ''doctor-photos'' AND public.is_admin())';

    EXECUTE 'DROP POLICY IF EXISTS "doctor_photos_admin_update" ON storage.objects';
    EXECUTE 'CREATE POLICY "doctor_photos_admin_update" ON storage.objects FOR UPDATE TO authenticated
             USING (bucket_id = ''doctor-photos'' AND public.is_admin())
             WITH CHECK (bucket_id = ''doctor-photos'' AND public.is_admin())';

    EXECUTE 'DROP POLICY IF EXISTS "doctor_photos_admin_delete" ON storage.objects';
    EXECUTE 'CREATE POLICY "doctor_photos_admin_delete" ON storage.objects FOR DELETE TO authenticated
             USING (bucket_id = ''doctor-photos'' AND public.is_admin())';
  EXCEPTION WHEN insufficient_privilege THEN
    -- Beberapa proyek Supabase tidak mengizinkan SQL Editor membuat policy di storage.objects.
    -- Tanpa policy, pengguna biasa tetap TIDAK bisa menulis (RLS aktif = tolak), jadi tetap aman.
    RAISE NOTICE 'Tidak dapat membuat policy storage.objects (%). Buat lewat Dashboard > Storage > Policies bila diperlukan.', SQLERRM;
  END;
END $$;
