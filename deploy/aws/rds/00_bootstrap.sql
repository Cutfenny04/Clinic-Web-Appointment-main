-- ============================================================================
-- JanjiCare — Bootstrap Amazon RDS PostgreSQL (jalankan SEKALI, sebagai master user "postgres")
--
--   psql "host=<endpoint-rds> port=5432 dbname=janjicare user=postgres sslmode=require" \
--        -v auth_pw='<password supabase_auth_admin>' -v api_pw='<password authenticator>' \
--        -f deploy/aws/rds/00_bootstrap.sql
--
-- Menyiapkan role & schema yang di Supabase sudah tersedia otomatis:
--   anon, authenticated, service_role  → role yang dipakai RLS & PostgREST
--   authenticator                      → login PostgREST (berganti role sesuai JWT)
--   supabase_auth_admin                → login GoTrue (Supabase Auth), pemilik schema auth
-- Master user RDS bukan superuser dan tidak bisa membuat role BYPASSRLS, jadi
-- service_role diberi policy RLS khusus lewat 99_service_role_policies.sql.
-- Aman dijalankan ulang.
-- ============================================================================
\set ON_ERROR_STOP on

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN CREATE ROLE authenticator LOGIN NOINHERIT; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN CREATE ROLE supabase_auth_admin LOGIN NOINHERIT CREATEROLE; END IF;
END $$;

ALTER ROLE authenticator WITH PASSWORD :'api_pw';
ALTER ROLE supabase_auth_admin WITH PASSWORD :'auth_pw';

-- Master perlu keanggotaan agar bisa membuat schema/trigger milik role lain (PostgreSQL 16+)
GRANT anon, authenticated, service_role TO authenticator;
GRANT supabase_auth_admin TO CURRENT_USER;
GRANT anon, authenticated, service_role, authenticator TO CURRENT_USER;

-- GoTrue membuat tabelnya sendiri di schema auth
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;
GRANT CREATE ON DATABASE janjicare TO supabase_auth_admin;
ALTER ROLE supabase_auth_admin SET search_path = auth;

GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
