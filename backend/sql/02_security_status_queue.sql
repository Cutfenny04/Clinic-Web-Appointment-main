-- ============================================================================
-- JanjiCare — Migration 02: Keamanan RLS, Alur Status, Riwayat, Antrean
-- Jalankan SETELAH 01_schema_and_rls.sql. Aman dijalankan ulang (idempotent).
-- Tidak menghapus data. Kompatibel dengan Supabase PostgreSQL & Amazon RDS
-- (bagian yang memakai auth.uid() / auth.users khusus Supabase ditandai [SUPABASE]).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROFILES: email, status aktif, proteksi kolom role
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(lower(email));

-- [SUPABASE] isi email dari auth.users untuk data lama
UPDATE public.profiles p SET email = u.email
FROM auth.users u WHERE u.id = p.id AND p.email IS DISTINCT FROM u.email;

-- Helper dengan search_path tetap (rekomendasi linter Supabase)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin' AND is_active);
$$;

CREATE OR REPLACE FUNCTION public.is_doctor()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'doctor' AND is_active);
$$;

CREATE OR REPLACE FUNCTION public.current_role_name()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Registrasi publik SELALU membuat role 'patient' + simpan email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, phone, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), 'Pengguna JanjiCare'),
    'patient',
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

-- Hanya admin (atau proses server tanpa sesi pengguna) yang boleh mengubah role/is_active
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Anda tidak diizinkan mengubah role.' USING ERRCODE = '42501';
    END IF;
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      RAISE EXCEPTION 'Anda tidak diizinkan mengubah status akun.' USING ERRCODE = '42501';
    END IF;
    IF NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Email hanya dapat diubah melalui sistem autentikasi.' USING ERRCODE = '42501';
    END IF;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_profiles_protect ON public.profiles;
CREATE TRIGGER trg_profiles_protect BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_columns();

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- ----------------------------------------------------------------------------
-- 2. APPOINTMENTS: status checked_in, timestamp, catatan konsultasi
-- ----------------------------------------------------------------------------
DO $$
DECLARE c TEXT;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.appointments'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.appointments DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('pending', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled'));

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS diagnosis TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS consultation_notes TEXT;

-- Satu booking aktif per pasien per jadwal (dijamin constraint, bukan hanya kode)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.appointments WHERE status <> 'cancelled'
    GROUP BY patient_id, schedule_id HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_active_patient_schedule
      ON public.appointments(patient_id, schedule_id) WHERE status <> 'cancelled';
  ELSE
    RAISE WARNING 'Ada booking ganda lama; indeks unik uq_appointments_active_patient_schedule belum dibuat. Bersihkan datanya lalu jalankan ulang.';
  END IF;
END $$;

-- Nomor urut booking unik per jadwal
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.appointments WHERE queue_number IS NOT NULL
    GROUP BY schedule_id, queue_number HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_schedule_number
      ON public.appointments(schedule_id, queue_number) WHERE queue_number IS NOT NULL;
  ELSE
    RAISE WARNING 'Ada nomor urut booking ganda lama; indeks uq_appointments_schedule_number belum dibuat.';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- ----------------------------------------------------------------------------
-- 3. RIWAYAT STATUS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointment_status_history (
  id BIGSERIAL PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_status_history_appt ON public.appointment_status_history(appointment_id, created_at);

-- Pelaku perubahan: pengguna Supabase, atau app.actor_id yang diset server (backend/queue service)
CREATE OR REPLACE FUNCTION public.current_actor_id()
RETURNS UUID LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(auth.uid(), NULLIF(current_setting('app.actor_id', true), '')::uuid);
$$;

-- Validasi transisi + timestamp otomatis (berlaku untuk SEMUA jalur, termasuk admin & server)
CREATE OR REPLACE FUNCTION public.appointments_before_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status = 'pending'     AND NEW.status IN ('confirmed', 'checked_in', 'cancelled')) OR
      (OLD.status = 'confirmed'   AND NEW.status IN ('checked_in', 'cancelled')) OR
      (OLD.status = 'checked_in'  AND NEW.status IN ('in_progress', 'cancelled')) OR
      (OLD.status = 'in_progress' AND NEW.status IN ('completed'))
    ) THEN
      RAISE EXCEPTION 'Perubahan status dari % ke % tidak diizinkan.', OLD.status, NEW.status
        USING ERRCODE = 'P0020';
    END IF;
    CASE NEW.status
      WHEN 'confirmed'   THEN NEW.confirmed_at  := COALESCE(NEW.confirmed_at, NOW());
      WHEN 'checked_in'  THEN NEW.checked_in_at := COALESCE(NEW.checked_in_at, NOW());
                              NEW.confirmed_at  := COALESCE(NEW.confirmed_at, NOW());
      WHEN 'in_progress' THEN NEW.started_at    := COALESCE(NEW.started_at, NOW());
      WHEN 'completed'   THEN NEW.completed_at  := COALESCE(NEW.completed_at, NOW());
      WHEN 'cancelled'   THEN NEW.cancelled_at  := COALESCE(NEW.cancelled_at, NOW());
      ELSE NULL;
    END CASE;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_appointments_status_guard ON public.appointments;
CREATE TRIGGER trg_appointments_status_guard BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.appointments_before_status_change();

CREATE OR REPLACE FUNCTION public.appointments_log_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.appointment_status_history (appointment_id, old_status, new_status, changed_by, note)
    VALUES (NEW.id, NULL, NEW.status, public.current_actor_id(), 'Janji temu dibuat');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.appointment_status_history (appointment_id, old_status, new_status, changed_by, note)
    VALUES (NEW.id, OLD.status, NEW.status, public.current_actor_id(),
            NULLIF(current_setting('app.status_note', true), ''));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_appointments_log_status ON public.appointments;
CREATE TRIGGER trg_appointments_log_status AFTER INSERT OR UPDATE OF status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.appointments_log_status();

-- ----------------------------------------------------------------------------
-- 4. RLS APPOINTMENTS: perubahan hanya lewat RPC / server
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "appointments_insert_patient" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert_admin_only" ON public.appointments;
CREATE POLICY "appointments_insert_admin_only" ON public.appointments FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "appointments_update_participant_or_admin" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_admin_only" ON public.appointments;
CREATE POLICY "appointments_update_admin_only" ON public.appointments FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.appointment_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "status_history_select_participant" ON public.appointment_status_history;
CREATE POLICY "status_history_select_participant" ON public.appointment_status_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.appointments a WHERE a.id = appointment_id
      AND (a.patient_id = auth.uid() OR a.doctor_id = auth.uid() OR public.is_admin())
  ));

-- ----------------------------------------------------------------------------
-- 5. BOOKING ATOMIK (signature sama dengan versi 01 agar backend tetap kompatibel)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.book_appointment_atomic(
  p_patient_id UUID,
  p_schedule_id UUID,
  p_complaint TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_caller_role TEXT;
  v_patient RECORD;
  v_schedule RECORD;
  v_booked INTEGER;
  v_next INTEGER;
  v_appointment RECORD;
BEGIN
  -- 0. Otorisasi: pasien hanya untuk dirinya sendiri, admin boleh atas nama pasien
  IF v_caller IS NOT NULL THEN
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller AND is_active;
    IF v_caller_role IS NULL THEN
      RAISE EXCEPTION 'Akun Anda tidak aktif.' USING ERRCODE = 'P0010';
    END IF;
    IF v_caller_role <> 'admin' AND p_patient_id <> v_caller THEN
      RAISE EXCEPTION 'Anda tidak diizinkan membuat janji temu atas nama pasien lain.' USING ERRCODE = 'P0010';
    END IF;
    IF v_caller_role NOT IN ('admin', 'patient') THEN
      RAISE EXCEPTION 'Hanya pasien yang dapat membuat janji temu.' USING ERRCODE = 'P0010';
    END IF;
  END IF;

  SELECT id, role, is_active INTO v_patient FROM public.profiles WHERE id = p_patient_id;
  IF NOT FOUND OR v_patient.role <> 'patient' OR NOT v_patient.is_active THEN
    RAISE EXCEPTION 'Data pasien tidak valid.' USING ERRCODE = 'P0011';
  END IF;

  -- 1. Kunci baris jadwal (serialisasi booking pada jadwal yang sama)
  SELECT * INTO v_schedule FROM public.doctor_schedules WHERE id = p_schedule_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jadwal dokter tidak ditemukan.' USING ERRCODE = 'P0002';
  END IF;
  IF NOT v_schedule.is_active THEN
    RAISE EXCEPTION 'Jadwal dokter sedang tidak aktif.' USING ERRCODE = 'P0003';
  END IF;
  IF EXISTS (SELECT 1 FROM public.doctor_details d WHERE d.user_id = v_schedule.doctor_id AND d.is_available = FALSE)
     OR NOT EXISTS (SELECT 1 FROM public.profiles d WHERE d.id = v_schedule.doctor_id AND d.role = 'doctor' AND d.is_active) THEN
    RAISE EXCEPTION 'Dokter sedang tidak menerima janji temu.' USING ERRCODE = 'P0003';
  END IF;

  -- 2. Jadwal yang sudah berakhir (zona waktu Asia/Jakarta)
  IF (v_schedule.schedule_date + v_schedule.end_time) <= (NOW() AT TIME ZONE 'Asia/Jakarta') THEN
    RAISE EXCEPTION 'Tidak dapat membuat janji untuk jadwal yang sudah lewat.' USING ERRCODE = 'P0004';
  END IF;

  -- 3. Booking ganda
  IF EXISTS (
    SELECT 1 FROM public.appointments
    WHERE patient_id = p_patient_id AND schedule_id = p_schedule_id AND status <> 'cancelled'
  ) THEN
    RAISE EXCEPTION 'Anda sudah memiliki janji temu aktif pada jadwal ini.' USING ERRCODE = 'P0005';
  END IF;

  -- 4. Kapasitas
  SELECT COUNT(*) INTO v_booked FROM public.appointments
  WHERE schedule_id = p_schedule_id AND status <> 'cancelled';
  IF v_booked >= v_schedule.capacity THEN
    RAISE EXCEPTION 'Kapasitas jadwal dokter sudah penuh.' USING ERRCODE = 'P0006';
  END IF;

  -- 5. Nomor urut booking: MAX + 1 (tidak pernah dipakai ulang setelah pembatalan)
  SELECT COALESCE(MAX(queue_number), 0) + 1 INTO v_next
  FROM public.appointments WHERE schedule_id = p_schedule_id;

  PERFORM set_config('app.actor_id', COALESCE(v_caller, p_patient_id)::text, true);
  INSERT INTO public.appointments (patient_id, doctor_id, schedule_id, status, complaint, queue_number)
  VALUES (p_patient_id, v_schedule.doctor_id, p_schedule_id, 'pending', NULLIF(trim(p_complaint), ''), v_next)
  RETURNING * INTO v_appointment;

  RETURN to_jsonb(v_appointment);
END;
$$;

REVOKE ALL ON FUNCTION public.book_appointment_atomic(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.book_appointment_atomic(UUID, UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.book_appointment_atomic(UUID, UUID, TEXT) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 6. TRANSISI STATUS DENGAN OTORISASI PER ROLE
--    patient : pending/confirmed -> cancelled (paling lambat 1 jam sebelum praktik)
--              confirmed -> checked_in (check-in mandiri, hanya di hari praktik)
--    doctor  : (miliknya) pending -> confirmed, checked_in -> in_progress,
--              in_progress -> completed, pending/confirmed -> cancelled
--    admin   : semua transisi valid
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transition_appointment(
  p_appointment_id UUID,
  p_new_status TEXT,
  p_note TEXT DEFAULT NULL,
  p_diagnosis TEXT DEFAULT NULL,
  p_consultation_notes TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_role TEXT;
  v_appt RECORD;
  v_sched RECORD;
  v_now_local TIMESTAMP := NOW() AT TIME ZONE 'Asia/Jakarta';
  v_result RECORD;
BEGIN
  SELECT * INTO v_appt FROM public.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Janji temu tidak ditemukan.' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO v_sched FROM public.doctor_schedules WHERE id = v_appt.schedule_id;

  IF v_appt.status = p_new_status THEN
    RETURN to_jsonb(v_appt); -- idempotent
  END IF;

  IF v_caller IS NOT NULL THEN
    SELECT role INTO v_role FROM public.profiles WHERE id = v_caller AND is_active;
    IF v_role IS NULL THEN
      RAISE EXCEPTION 'Akun Anda tidak aktif.' USING ERRCODE = 'P0010';
    ELSIF v_role = 'patient' THEN
      IF v_appt.patient_id <> v_caller THEN
        RAISE EXCEPTION 'Anda tidak memiliki akses ke janji temu ini.' USING ERRCODE = 'P0010';
      END IF;
      IF p_new_status = 'cancelled' THEN
        IF v_appt.status NOT IN ('pending', 'confirmed') THEN
          RAISE EXCEPTION 'Janji temu yang sudah check-in tidak dapat dibatalkan.' USING ERRCODE = 'P0021';
        END IF;
        IF (v_sched.schedule_date + v_sched.start_time) - INTERVAL '1 hour' <= v_now_local THEN
          RAISE EXCEPTION 'Pembatalan hanya dapat dilakukan paling lambat 1 jam sebelum jadwal praktik.' USING ERRCODE = 'P0021';
        END IF;
      ELSIF p_new_status = 'checked_in' THEN
        IF v_appt.status <> 'confirmed' THEN
          RAISE EXCEPTION 'Check-in hanya dapat dilakukan setelah janji temu dikonfirmasi.' USING ERRCODE = 'P0021';
        END IF;
        IF v_sched.schedule_date <> v_now_local::date THEN
          RAISE EXCEPTION 'Check-in hanya dapat dilakukan pada hari jadwal praktik.' USING ERRCODE = 'P0021';
        END IF;
        IF v_now_local >= (v_sched.schedule_date + v_sched.end_time) THEN
          RAISE EXCEPTION 'Jam praktik sudah berakhir.' USING ERRCODE = 'P0021';
        END IF;
      ELSE
        RAISE EXCEPTION 'Anda tidak diizinkan mengubah status janji temu.' USING ERRCODE = 'P0010';
      END IF;
    ELSIF v_role = 'doctor' THEN
      IF v_appt.doctor_id <> v_caller THEN
        RAISE EXCEPTION 'Anda hanya dapat mengelola janji temu pasien Anda.' USING ERRCODE = 'P0010';
      END IF;
      IF p_new_status NOT IN ('confirmed', 'in_progress', 'completed', 'cancelled') THEN
        RAISE EXCEPTION 'Check-in dilakukan oleh petugas atau pasien.' USING ERRCODE = 'P0010';
      END IF;
    ELSIF v_role <> 'admin' THEN
      RAISE EXCEPTION 'Akses ditolak.' USING ERRCODE = 'P0010';
    END IF;
  END IF;

  -- Check-in tidak boleh untuk jadwal yang sudah lewat (berlaku juga untuk admin)
  IF p_new_status = 'checked_in' AND v_sched.schedule_date < v_now_local::date THEN
    RAISE EXCEPTION 'Tidak dapat check-in untuk jadwal yang sudah lewat.' USING ERRCODE = 'P0021';
  END IF;

  IF p_new_status = 'in_progress' AND EXISTS (
    SELECT 1 FROM public.appointments
    WHERE doctor_id = v_appt.doctor_id AND status = 'in_progress' AND id <> v_appt.id
  ) THEN
    RAISE EXCEPTION 'Selesaikan pemeriksaan yang sedang berlangsung terlebih dahulu.' USING ERRCODE = 'P0022';
  END IF;

  PERFORM set_config('app.status_note', COALESCE(p_note, ''), true);
  PERFORM set_config('app.actor_id', COALESCE(v_caller::text, current_setting('app.actor_id', true), ''), true);

  UPDATE public.appointments SET
    status = p_new_status,
    cancel_reason = CASE WHEN p_new_status = 'cancelled' THEN NULLIF(trim(p_note), '') ELSE cancel_reason END,
    diagnosis = CASE WHEN p_new_status = 'completed' THEN COALESCE(NULLIF(trim(p_diagnosis), ''), diagnosis) ELSE diagnosis END,
    consultation_notes = CASE WHEN p_new_status = 'completed' THEN COALESCE(NULLIF(trim(p_consultation_notes), ''), consultation_notes) ELSE consultation_notes END
  WHERE id = p_appointment_id
  RETURNING * INTO v_result;

  RETURN to_jsonb(v_result);
END;
$$;

REVOKE ALL ON FUNCTION public.transition_appointment(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transition_appointment(UUID, TEXT, TEXT, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.transition_appointment(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 7. ANTREAN PERSISTEN (dikelola Queue Microservice lewat koneksi server)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.queue_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.doctor_schedules(id) ON DELETE SET NULL,
  queue_date DATE NOT NULL,
  queue_number INTEGER NOT NULL CHECK (queue_number > 0),
  queue_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'calling', 'serving', 'done', 'skipped', 'cancelled')),
  called_at TIMESTAMPTZ,
  serving_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_queue_tickets_appointment UNIQUE (appointment_id),
  CONSTRAINT uq_queue_tickets_number UNIQUE (doctor_id, queue_date, queue_number)
);
CREATE INDEX IF NOT EXISTS idx_queue_tickets_doctor_date ON public.queue_tickets(doctor_id, queue_date, status);
CREATE INDEX IF NOT EXISTS idx_queue_tickets_date ON public.queue_tickets(queue_date);

CREATE TABLE IF NOT EXISTS public.queue_counters (
  doctor_id UUID NOT NULL,
  queue_date DATE NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (doctor_id, queue_date)
);

ALTER TABLE public.queue_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "queue_tickets_select_participant" ON public.queue_tickets;
CREATE POLICY "queue_tickets_select_participant" ON public.queue_tickets FOR SELECT
  USING (patient_id = auth.uid() OR doctor_id = auth.uid() OR public.is_admin());
-- Tidak ada policy INSERT/UPDATE/DELETE: hanya koneksi server (Queue Service) yang boleh menulis.
REVOKE INSERT, UPDATE, DELETE ON public.queue_tickets FROM anon, authenticated;
REVOKE ALL ON public.queue_counters FROM anon, authenticated;

-- Sinkronisasi status tiket mengikuti status appointment (satu sumber kebenaran)
CREATE OR REPLACE FUNCTION public.sync_queue_ticket_from_appointment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'in_progress' THEN
      UPDATE public.queue_tickets SET status = 'serving', serving_at = COALESCE(serving_at, NOW()),
        called_at = COALESCE(called_at, NOW()), updated_at = NOW()
      WHERE appointment_id = NEW.id AND status <> 'serving';
    ELSIF NEW.status = 'completed' THEN
      UPDATE public.queue_tickets SET status = 'done', finished_at = COALESCE(finished_at, NOW()), updated_at = NOW()
      WHERE appointment_id = NEW.id AND status <> 'done';
    ELSIF NEW.status = 'cancelled' THEN
      UPDATE public.queue_tickets SET status = 'cancelled', finished_at = COALESCE(finished_at, NOW()), updated_at = NOW()
      WHERE appointment_id = NEW.id AND status NOT IN ('done', 'cancelled');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_appointments_sync_queue ON public.appointments;
CREATE TRIGGER trg_appointments_sync_queue AFTER UPDATE OF status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.sync_queue_ticket_from_appointment();

-- ----------------------------------------------------------------------------
-- 8. RLS tambahan: pasien hanya boleh melihat profil dokter + dirinya;
--    dokter boleh melihat profil pasien yang punya janji temu dengannya.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_own_or_doctor_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_doctor_or_admin" ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR role = 'doctor'
    OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.appointments a WHERE a.patient_id = profiles.id AND a.doctor_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 9. Statistik admin dalam satu panggilan (hanya admin)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE v_today DATE := (NOW() AT TIME ZONE 'Asia/Jakarta')::date;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Akses ditolak.' USING ERRCODE = 'P0010';
  END IF;
  RETURN jsonb_build_object(
    'today', v_today,
    'active_doctors', (SELECT COUNT(*) FROM public.profiles p
                         LEFT JOIN public.doctor_details d ON d.user_id = p.id
                         WHERE p.role = 'doctor' AND p.is_active AND COALESCE(d.is_available, TRUE)),
    'registered_patients', (SELECT COUNT(*) FROM public.profiles WHERE role = 'patient'),
    'appointments_today', (SELECT COUNT(*) FROM public.appointments a JOIN public.doctor_schedules s ON s.id = a.schedule_id
                             WHERE s.schedule_date = v_today AND a.status <> 'cancelled'),
    'appointments_upcoming', (SELECT COUNT(*) FROM public.appointments a JOIN public.doctor_schedules s ON s.id = a.schedule_id
                                WHERE s.schedule_date > v_today AND a.status IN ('pending', 'confirmed')),
    'patients_waiting', (SELECT COUNT(*) FROM public.queue_tickets WHERE queue_date = v_today AND status IN ('waiting', 'calling')),
    'consultations_completed', (SELECT COUNT(*) FROM public.appointments WHERE status = 'completed'),
    'status_breakdown', COALESCE((SELECT jsonb_object_agg(status, n) FROM
                          (SELECT status, COUNT(*) n FROM public.appointments GROUP BY status) t), '{}'::jsonb)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_dashboard_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 10. Ketersediaan jadwal (jumlah booking aktif) tanpa membuka data pasien lain
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.schedule_booked_counts(p_schedule_ids UUID[])
RETURNS TABLE (schedule_id UUID, booked INTEGER)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT a.schedule_id, COUNT(*)::int
  FROM public.appointments a
  WHERE a.schedule_id = ANY(p_schedule_ids) AND a.status <> 'cancelled'
  GROUP BY a.schedule_id;
$$;
REVOKE ALL ON FUNCTION public.schedule_booked_counts(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.schedule_booked_counts(UUID[]) TO anon, authenticated, service_role;
