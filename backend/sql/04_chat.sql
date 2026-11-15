-- ============================================================================
-- JanjiCare — Migrasi 04: Fitur Pesan (chat pasien ↔ dokter, pasien ↔ admin)
-- Jalankan SETELAH 01, 02, 03. Aman dijalankan ulang. Tidak mengubah tabel lama.
-- Di Amazon RDS: jalankan juga ulang deploy/aws/rds/99_service_role_policies.sql sesudahnya.
--
-- Aturan (ditegakkan di database, bukan hanya di tampilan):
--  * Chat DOKTER: hanya antara pasien & dokter yang PERNAH punya janji temu
--    (status apa pun selain 'cancelled'). Dimulai oleh pasien atau dokter itu.
--  * Chat ADMIN: pasien mana pun ↔ kotak masuk bersama semua admin.
--    Dimulai oleh pasien atau admin.
--  * Admin TIDAK dapat membaca chat dokter–pasien (privasi medis).
--  * Hanya teks, 1–2000 karakter. Semua penulisan lewat fungsi chat_* di bawah.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabel
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('doctor', 'admin')),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  CONSTRAINT chat_conversations_kind_doctor CHECK (
    (kind = 'doctor' AND doctor_id IS NOT NULL) OR (kind = 'admin' AND doctor_id IS NULL)
  )
);
-- Satu percakapan per pasangan pasien–dokter, dan satu percakapan admin per pasien
CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_doctor ON public.chat_conversations (patient_id, doctor_id) WHERE kind = 'doctor';
CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_admin  ON public.chat_conversations (patient_id) WHERE kind = 'admin';
CREATE INDEX IF NOT EXISTS idx_chat_conv_doctor ON public.chat_conversations (doctor_id) WHERE kind = 'doctor';

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON public.chat_messages (conversation_id, id);

-- Penanda "sudah dibaca" per pengguna (kotak masuk admin: tiap admin punya penanda sendiri)
CREATE TABLE IF NOT EXISTS public.chat_reads (
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_id BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (conversation_id, user_id)
);

-- ----------------------------------------------------------------------------
-- 2. Fungsi bantu aturan
-- ----------------------------------------------------------------------------
-- Pasien & dokter pernah punya janji temu yang tidak dibatalkan?
CREATE OR REPLACE FUNCTION public.chat_has_relationship(p_patient UUID, p_doctor UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.appointments
    WHERE patient_id = p_patient AND doctor_id = p_doctor AND status <> 'cancelled'
  );
$$;

-- Apakah pengguna saat ini boleh melihat percakapan ini?
CREATE OR REPLACE FUNCTION public.chat_can_access(p_conversation UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = p_conversation AND (
      c.patient_id = auth.uid()
      OR (c.kind = 'doctor' AND c.doctor_id = auth.uid() AND public.is_doctor())
      OR (c.kind = 'admin'  AND public.is_admin())
    )
  );
$$;

-- ----------------------------------------------------------------------------
-- 3. RLS — baca hanya peserta; tulis HANYA lewat fungsi chat_* (SECURITY DEFINER)
-- ----------------------------------------------------------------------------
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_conversations_select ON public.chat_conversations;
CREATE POLICY chat_conversations_select ON public.chat_conversations FOR SELECT TO authenticated
  USING (public.chat_can_access(id));

DROP POLICY IF EXISTS chat_messages_select ON public.chat_messages;
CREATE POLICY chat_messages_select ON public.chat_messages FOR SELECT TO authenticated
  USING (public.chat_can_access(conversation_id));

DROP POLICY IF EXISTS chat_reads_select_own ON public.chat_reads;
CREATE POLICY chat_reads_select_own ON public.chat_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.chat_conversations, public.chat_messages, public.chat_reads FROM anon, authenticated;
REVOKE ALL ON public.chat_conversations, public.chat_messages, public.chat_reads FROM anon;

-- Perbarui waktu pesan terakhir pada percakapan
CREATE OR REPLACE FUNCTION public.chat_touch_conversation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.chat_conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_chat_touch ON public.chat_messages;
CREATE TRIGGER trg_chat_touch AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.chat_touch_conversation();

-- ----------------------------------------------------------------------------
-- 4. Fungsi untuk backend (semua memeriksa auth.uid())
-- ----------------------------------------------------------------------------

-- Mulai (atau buka kembali) percakapan.
--   Pasien: p_kind='doctor' + p_other=id dokter, atau p_kind='admin' (p_other diabaikan)
--   Dokter: p_kind='doctor' + p_other=id pasien
--   Admin : p_kind='admin'  + p_other=id pasien
CREATE OR REPLACE FUNCTION public.chat_start(p_kind TEXT, p_other UUID DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT;
  v_patient UUID;
  v_doctor UUID;
  v_id UUID;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid AND is_active;
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Akun tidak aktif atau tidak ditemukan.' USING ERRCODE = 'P0030';
  END IF;

  IF p_kind = 'doctor' THEN
    IF v_role = 'patient' THEN v_patient := v_uid; v_doctor := p_other;
    ELSIF v_role = 'doctor' THEN v_patient := p_other; v_doctor := v_uid;
    ELSE RAISE EXCEPTION 'Admin tidak dapat membuka chat dokter dengan pasien.' USING ERRCODE = 'P0030';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_doctor AND role = 'doctor' AND is_active) THEN
      RAISE EXCEPTION 'Dokter tidak ditemukan atau tidak aktif.' USING ERRCODE = 'P0002';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_patient AND role = 'patient') THEN
      RAISE EXCEPTION 'Pasien tidak ditemukan.' USING ERRCODE = 'P0002';
    END IF;
    IF NOT public.chat_has_relationship(v_patient, v_doctor) THEN
      RAISE EXCEPTION 'Chat dengan dokter hanya tersedia bila pasien pernah membuat janji temu dengan dokter tersebut.'
        USING ERRCODE = 'P0030';
    END IF;
    SELECT id INTO v_id FROM public.chat_conversations
      WHERE kind = 'doctor' AND patient_id = v_patient AND doctor_id = v_doctor;
    IF v_id IS NULL THEN
      INSERT INTO public.chat_conversations (kind, patient_id, doctor_id, created_by)
      VALUES ('doctor', v_patient, v_doctor, v_uid)
      ON CONFLICT DO NOTHING RETURNING id INTO v_id;
      IF v_id IS NULL THEN
        SELECT id INTO v_id FROM public.chat_conversations
          WHERE kind = 'doctor' AND patient_id = v_patient AND doctor_id = v_doctor;
      END IF;
    END IF;

  ELSIF p_kind = 'admin' THEN
    IF v_role = 'patient' THEN v_patient := v_uid;
    ELSIF v_role = 'admin' THEN v_patient := p_other;
    ELSE RAISE EXCEPTION 'Dokter tidak memakai kotak masuk admin.' USING ERRCODE = 'P0030';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_patient AND role = 'patient') THEN
      RAISE EXCEPTION 'Pasien tidak ditemukan.' USING ERRCODE = 'P0002';
    END IF;
    SELECT id INTO v_id FROM public.chat_conversations WHERE kind = 'admin' AND patient_id = v_patient;
    IF v_id IS NULL THEN
      INSERT INTO public.chat_conversations (kind, patient_id, created_by)
      VALUES ('admin', v_patient, v_uid)
      ON CONFLICT DO NOTHING RETURNING id INTO v_id;
      IF v_id IS NULL THEN
        SELECT id INTO v_id FROM public.chat_conversations WHERE kind = 'admin' AND patient_id = v_patient;
      END IF;
    END IF;
  ELSE
    RAISE EXCEPTION 'Jenis percakapan tidak dikenal.' USING ERRCODE = 'P0031';
  END IF;

  RETURN v_id;
END;
$$;

-- Kirim pesan
CREATE OR REPLACE FUNCTION public.chat_send(p_conversation UUID, p_body TEXT)
RETURNS public.chat_messages LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_conv public.chat_conversations;
  v_msg public.chat_messages;
  v_body TEXT := btrim(coalesce(p_body, ''));
BEGIN
  IF NOT public.chat_can_access(p_conversation) THEN
    RAISE EXCEPTION 'Percakapan tidak ditemukan.' USING ERRCODE = 'P0002';
  END IF;
  IF char_length(v_body) = 0 THEN
    RAISE EXCEPTION 'Pesan tidak boleh kosong.' USING ERRCODE = 'P0031';
  END IF;
  IF char_length(v_body) > 2000 THEN
    RAISE EXCEPTION 'Pesan maksimal 2000 karakter.' USING ERRCODE = 'P0031';
  END IF;
  SELECT * INTO v_conv FROM public.chat_conversations WHERE id = p_conversation;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid AND is_active) THEN
    RAISE EXCEPTION 'Akun tidak aktif.' USING ERRCODE = 'P0030';
  END IF;
  -- Chat dokter: hubungan janji temu harus tetap berlaku
  IF v_conv.kind = 'doctor' AND NOT public.chat_has_relationship(v_conv.patient_id, v_conv.doctor_id) THEN
    RAISE EXCEPTION 'Chat ditutup karena tidak ada janji temu aktif dengan dokter ini.' USING ERRCODE = 'P0030';
  END IF;

  INSERT INTO public.chat_messages (conversation_id, sender_id, body)
  VALUES (p_conversation, v_uid, v_body) RETURNING * INTO v_msg;

  INSERT INTO public.chat_reads (conversation_id, user_id, last_read_id)
  VALUES (p_conversation, v_uid, v_msg.id)
  ON CONFLICT (conversation_id, user_id) DO UPDATE SET last_read_id = GREATEST(public.chat_reads.last_read_id, EXCLUDED.last_read_id);
  RETURN v_msg;
END;
$$;

-- Tandai sudah dibaca sampai pesan terakhir
CREATE OR REPLACE FUNCTION public.chat_mark_read(p_conversation UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_last BIGINT;
BEGIN
  IF NOT public.chat_can_access(p_conversation) THEN
    RAISE EXCEPTION 'Percakapan tidak ditemukan.' USING ERRCODE = 'P0002';
  END IF;
  SELECT coalesce(max(id), 0) INTO v_last FROM public.chat_messages WHERE conversation_id = p_conversation;
  INSERT INTO public.chat_reads (conversation_id, user_id, last_read_id)
  VALUES (p_conversation, auth.uid(), v_last)
  ON CONFLICT (conversation_id, user_id) DO UPDATE SET last_read_id = GREATEST(public.chat_reads.last_read_id, EXCLUDED.last_read_id);
END;
$$;

-- Daftar percakapan milik pengguna saat ini (sesuai role) + pesan terakhir + jumlah belum dibaca
CREATE OR REPLACE FUNCTION public.chat_list()
RETURNS TABLE (
  id UUID, kind TEXT, patient_id UUID, patient_name TEXT, doctor_id UUID, doctor_name TEXT,
  doctor_specialty TEXT, doctor_photo_path TEXT, last_message_at TIMESTAMPTZ,
  last_message TEXT, last_sender_id UUID, unread_count INT, can_send BOOLEAN
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.kind, c.patient_id, pp.full_name, c.doctor_id, dp.full_name,
         dd.specialty, dd.photo_path, c.last_message_at,
         lm.body, lm.sender_id,
         (SELECT count(*)::int FROM public.chat_messages m
            WHERE m.conversation_id = c.id AND m.sender_id IS DISTINCT FROM auth.uid()
              AND m.id > coalesce((SELECT r.last_read_id FROM public.chat_reads r
                                   WHERE r.conversation_id = c.id AND r.user_id = auth.uid()), 0)),
         (c.kind = 'admin' OR public.chat_has_relationship(c.patient_id, c.doctor_id))
  FROM public.chat_conversations c
  JOIN public.profiles pp ON pp.id = c.patient_id
  LEFT JOIN public.profiles dp ON dp.id = c.doctor_id
  LEFT JOIN public.doctor_details dd ON dd.user_id = c.doctor_id
  LEFT JOIN LATERAL (
    SELECT m.body, m.sender_id FROM public.chat_messages m
    WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1
  ) lm ON TRUE
  WHERE public.chat_can_access(c.id)
  ORDER BY coalesce(c.last_message_at, c.created_at) DESC;
$$;

-- Pesan dalam satu percakapan (setelah id tertentu, untuk polling)
CREATE OR REPLACE FUNCTION public.chat_history(p_conversation UUID, p_after BIGINT DEFAULT 0, p_limit INT DEFAULT 200)
RETURNS TABLE (id BIGINT, sender_id UUID, sender_name TEXT, sender_role TEXT, body TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.chat_can_access(p_conversation) THEN
    RAISE EXCEPTION 'Percakapan tidak ditemukan.' USING ERRCODE = 'P0002';
  END IF;
  RETURN QUERY
    SELECT * FROM (
      SELECT m.id, m.sender_id, p.full_name, p.role, m.body, m.created_at
      FROM public.chat_messages m LEFT JOIN public.profiles p ON p.id = m.sender_id
      WHERE m.conversation_id = p_conversation AND m.id > coalesce(p_after, 0)
      ORDER BY m.id DESC LIMIT LEAST(GREATEST(coalesce(p_limit, 200), 1), 500)
    ) t ORDER BY t.id;
END;
$$;

-- Total pesan belum dibaca (untuk badge menu)
CREATE OR REPLACE FUNCTION public.chat_unread_total()
RETURNS INT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(sum(l.unread_count), 0)::int FROM public.chat_list() l;
$$;

-- Kontak yang boleh dihubungi pengguna saat ini
--   Pasien: dokter yang pernah ditemui (kotak masuk admin selalu tersedia di aplikasi)
--   Dokter: pasien yang pernah punya janji temu dengannya
--   Admin : semua pasien (dengan pencarian)
CREATE OR REPLACE FUNCTION public.chat_contacts(p_search TEXT DEFAULT NULL)
RETURNS TABLE (id UUID, full_name TEXT, role TEXT, specialty TEXT, photo_path TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active)
  SELECT p.id, p.full_name, p.role, dd.specialty, dd.photo_path
  FROM public.profiles p
  LEFT JOIN public.doctor_details dd ON dd.user_id = p.id
  WHERE (
      ((SELECT role FROM me) = 'patient' AND p.role = 'doctor' AND p.is_active
        AND public.chat_has_relationship(auth.uid(), p.id))
   OR ((SELECT role FROM me) = 'doctor' AND p.role = 'patient'
        AND public.chat_has_relationship(p.id, auth.uid()))
   OR ((SELECT role FROM me) = 'admin' AND p.role = 'patient')
  )
  AND (p_search IS NULL OR p_search = '' OR p.full_name ILIKE '%' || p_search || '%')
  ORDER BY p.full_name
  LIMIT 50;
$$;

REVOKE ALL ON FUNCTION public.chat_start(TEXT, UUID), public.chat_send(UUID, TEXT), public.chat_mark_read(UUID),
  public.chat_list(), public.chat_history(UUID, BIGINT, INT), public.chat_unread_total(), public.chat_contacts(TEXT),
  public.chat_has_relationship(UUID, UUID), public.chat_can_access(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.chat_start(TEXT, UUID), public.chat_send(UUID, TEXT), public.chat_mark_read(UUID),
  public.chat_list(), public.chat_history(UUID, BIGINT, INT), public.chat_unread_total(), public.chat_contacts(TEXT),
  public.chat_has_relationship(UUID, UUID), public.chat_can_access(UUID) TO authenticated, service_role;
GRANT SELECT ON public.chat_conversations, public.chat_messages, public.chat_reads TO authenticated, service_role;
