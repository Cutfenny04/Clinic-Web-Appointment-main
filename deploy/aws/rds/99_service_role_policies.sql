-- ============================================================================
-- JanjiCare — Akses penuh untuk service_role di RDS
-- Jalankan SETELAH backend/sql/01, 02, 03 (dan setiap kali menambah tabel baru).
--
-- Di Supabase, service_role punya atribut BYPASSRLS. Master user RDS tidak boleh
-- membuat role dengan atribut itu, jadi sebagai gantinya setiap tabel ber-RLS di
-- schema public diberi policy "service_role boleh semua". Kunci service_role hanya
-- ada di server backend (tidak pernah dikirim ke browser).
-- ============================================================================
\set ON_ERROR_STOP on

DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS service_role_all ON public.%I', t.relname);
    EXECUTE format('CREATE POLICY service_role_all ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', t.relname);
  END LOOP;
END $$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
