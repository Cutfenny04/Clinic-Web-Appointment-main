-- ============================================================================
-- JanjiCare — Migration 01: Schema, RLS Policies, Triggers & Atomic Booking
-- Target Database: Supabase PostgreSQL
-- ============================================================================

-- Pastikan extension UUID aktif
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. TABEL: PROFILES
-- Berelasi 1:1 dengan auth.users
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('admin', 'doctor', 'patient')),
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pastikan kolom baru tersedia bila tabel sudah dibuat sebelumnya
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Index
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ----------------------------------------------------------------------------
-- 2. TABEL: DOCTOR_DETAILS
-- Detail tambahan untuk pengguna ber-role 'doctor'
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.doctor_details (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  specialty TEXT NOT NULL,
  bio TEXT,
  experience_years INTEGER DEFAULT 0,
  consultation_fee NUMERIC(12, 2) DEFAULT 0,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.doctor_details ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0;
ALTER TABLE public.doctor_details ADD COLUMN IF NOT EXISTS consultation_fee NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.doctor_details ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;
ALTER TABLE public.doctor_details ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ----------------------------------------------------------------------------
-- 3. TABEL: DOCTOR_SCHEDULES
-- Jadwal praktik dokter
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.doctor_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  schedule_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 10 CHECK (capacity > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.doctor_schedules ADD COLUMN IF NOT EXISTS schedule_date DATE;
ALTER TABLE public.doctor_schedules ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE public.doctor_schedules ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE public.doctor_schedules ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 10;
ALTER TABLE public.doctor_schedules ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.doctor_schedules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_schedules_doctor_date ON public.doctor_schedules(doctor_id, schedule_date);

-- ----------------------------------------------------------------------------
-- 4. TABEL: APPOINTMENTS
-- Booking janji temu pasien
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES public.doctor_schedules(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  complaint TEXT,
  queue_number INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS complaint TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS queue_number INTEGER;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_schedule ON public.appointments(schedule_id);

-- ----------------------------------------------------------------------------
-- 5. FUNCTION & TRIGGER: AUTO CREATE PROFILE SAAT REGISTRASI
-- Role SELALU default 'patient' demi keamanan (cegah privilege escalation)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, phone, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Pengguna JanjiCare'),
    'patient', -- Keamanan: pengguna baru SELALU 'patient'
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 6. HELPER FUNCTION: IS_ADMIN() & IS_DOCTOR()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_doctor()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'doctor'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 7.1. PROFILES POLICIES
DROP POLICY IF EXISTS "profiles_select_own_or_doctor_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_doctor_or_admin"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR role = 'doctor'
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (
    -- Pengguna biasa tidak boleh mengganti role dirinya sendiri
    (auth.uid() = id AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()))
    OR public.is_admin()
  );

-- 7.2. DOCTOR_DETAILS POLICIES
DROP POLICY IF EXISTS "doctor_details_select_all" ON public.doctor_details;
CREATE POLICY "doctor_details_select_all"
  ON public.doctor_details FOR SELECT
  USING (true); -- Publik/terautentikasi dapat melihat profil dokter

DROP POLICY IF EXISTS "doctor_details_manage_doctor_or_admin" ON public.doctor_details;
CREATE POLICY "doctor_details_manage_doctor_or_admin"
  ON public.doctor_details FOR ALL
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 7.3. DOCTOR_SCHEDULES POLICIES
DROP POLICY IF EXISTS "doctor_schedules_select_active" ON public.doctor_schedules;
CREATE POLICY "doctor_schedules_select_active"
  ON public.doctor_schedules FOR SELECT
  USING (is_active = true OR auth.uid() = doctor_id OR public.is_admin());

DROP POLICY IF EXISTS "doctor_schedules_manage_doctor_or_admin" ON public.doctor_schedules;
CREATE POLICY "doctor_schedules_manage_doctor_or_admin"
  ON public.doctor_schedules FOR ALL
  USING (auth.uid() = doctor_id OR public.is_admin())
  WITH CHECK (auth.uid() = doctor_id OR public.is_admin());

-- 7.4. APPOINTMENTS POLICIES
DROP POLICY IF EXISTS "appointments_select_participant_or_admin" ON public.appointments;
CREATE POLICY "appointments_select_participant_or_admin"
  ON public.appointments FOR SELECT
  USING (
    auth.uid() = patient_id
    OR auth.uid() = doctor_id
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "appointments_insert_patient" ON public.appointments;
CREATE POLICY "appointments_insert_patient"
  ON public.appointments FOR INSERT
  WITH CHECK (auth.uid() = patient_id OR public.is_admin());

DROP POLICY IF EXISTS "appointments_update_participant_or_admin" ON public.appointments;
CREATE POLICY "appointments_update_participant_or_admin"
  ON public.appointments FOR UPDATE
  USING (
    auth.uid() = patient_id
    OR auth.uid() = doctor_id
    OR public.is_admin()
  );

-- ----------------------------------------------------------------------------
-- 8. ATOMIC BOOKING FUNCTION (RPC)
-- Mencegah double booking dan kelebihan kapasitas secara aman di level PostgreSQL
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.book_appointment_atomic(
  p_patient_id UUID,
  p_schedule_id UUID,
  p_complaint TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_schedule RECORD;
  v_booked_count INTEGER;
  v_appointment RECORD;
  v_queue_num INTEGER;
BEGIN
  -- 1. Kunci baris jadwal dengan FOR UPDATE untuk mencegah concurrent race condition
  SELECT * INTO v_schedule
  FROM public.doctor_schedules
  WHERE id = p_schedule_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jadwal dokter tidak ditemukan' USING ERRCODE = 'P0002';
  END IF;

  IF NOT v_schedule.is_active THEN
    RAISE EXCEPTION 'Jadwal dokter sedang tidak aktif' USING ERRCODE = 'P0003';
  END IF;

  -- 2. Cek apakah tanggal jadwal sudah lewat
  IF v_schedule.schedule_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Tidak dapat membuat janji untuk jadwal yang sudah lewat' USING ERRCODE = 'P0004';
  END IF;

  -- 3. Cek apakah pasien sudah memiliki booking aktif di jadwal yang sama (Pencegahan Double Booking)
  IF EXISTS (
    SELECT 1 FROM public.appointments
    WHERE patient_id = p_patient_id
      AND schedule_id = p_schedule_id
      AND status NOT IN ('cancelled')
  ) THEN
    RAISE EXCEPTION 'Anda sudah memiliki janji temu aktif pada jadwal ini' USING ERRCODE = 'P0005';
  END IF;

  -- 4. Hitung jumlah appointment aktif saat ini
  SELECT COUNT(*) INTO v_booked_count
  FROM public.appointments
  WHERE schedule_id = p_schedule_id
    AND status NOT IN ('cancelled');

  IF v_booked_count >= v_schedule.capacity THEN
    RAISE EXCEPTION 'Kapasitas jadwal dokter sudah penuh' USING ERRCODE = 'P0006';
  END IF;

  -- 5. Hitung nomor antrean berikutnya
  v_queue_num := v_booked_count + 1;

  -- 6. Insert appointment
  INSERT INTO public.appointments (
    patient_id,
    doctor_id,
    schedule_id,
    status,
    complaint,
    queue_number
  ) VALUES (
    p_patient_id,
    v_schedule.doctor_id,
    p_schedule_id,
    'pending',
    p_complaint,
    v_queue_num
  )
  RETURNING * INTO v_appointment;

  RETURN to_jsonb(v_appointment);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
