-- ============================================
-- SIKOSAN - Sistem Informasi Kosan
-- Kelurahan Akehuda, Ternate
-- Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE user_role AS ENUM ('superadmin', 'admin_kos');
CREATE TYPE jenis_kelamin AS ENUM ('laki_laki', 'perempuan');
CREATE TYPE status_pekerjaan AS ENUM ('mahasiswa', 'pekerja', 'lainnya');
CREATE TYPE status_kamar AS ENUM ('aktif', 'kosong');
CREATE TYPE hubungan_penghuni AS ENUM ('suami_istri', 'saudara', 'teman', 'kerabat', 'lainnya');

-- ============================================
-- TABLES
-- ============================================

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'admin_kos',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Kosan table
CREATE TABLE kosan (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nama TEXT NOT NULL,
  alamat TEXT NOT NULL,
  pemilik_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kode_unik TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Kamar table
CREATE TABLE kamar (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nomor_kamar TEXT NOT NULL,
  kosan_id UUID NOT NULL REFERENCES kosan(id) ON DELETE CASCADE,
  jumlah_penghuni INTEGER NOT NULL DEFAULT 1,
  hubungan hubungan_penghuni,
  status status_kamar NOT NULL DEFAULT 'kosong',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Penghuni table
CREATE TABLE penghuni (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  kamar_id UUID NOT NULL REFERENCES kamar(id) ON DELETE CASCADE,
  kosan_id UUID NOT NULL REFERENCES kosan(id) ON DELETE CASCADE,
  nama_lengkap TEXT NOT NULL,
  tempat_lahir TEXT NOT NULL,
  tanggal_lahir DATE NOT NULL,
  asal_daerah TEXT NOT NULL,
  jenis_kelamin jenis_kelamin NOT NULL,
  no_hp TEXT NOT NULL,
  status_pekerjaan status_pekerjaan NOT NULL DEFAULT 'lainnya',
  foto_url TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_kosan_pemilik ON kosan(pemilik_id);
CREATE INDEX idx_kosan_kode_unik ON kosan(kode_unik);
CREATE INDEX idx_kamar_kosan ON kamar(kosan_id);
CREATE INDEX idx_penghuni_kamar ON penghuni(kamar_id);
CREATE INDEX idx_penghuni_kosan ON penghuni(kosan_id);

-- ============================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kosan_updated_at
  BEFORE UPDATE ON kosan
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kamar_updated_at
  BEFORE UPDATE ON kamar
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_penghuni_updated_at
  BEFORE UPDATE ON penghuni
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. AUTO-CREATE & AUTO-DELETE PROFILE
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth
AS $$
DECLARE
  default_name TEXT;
  user_role_val public.user_role;
BEGIN
  default_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1),
    'User'
  );
  
  BEGIN
    user_role_val := (NEW.raw_user_meta_data->>'role')::public.user_role;
  EXCEPTION WHEN OTHERS THEN
    user_role_val := 'admin_kos'::public.user_role;
  END;

  IF user_role_val IS NULL THEN
    user_role_val := 'admin_kos'::public.user_role;
  END IF;

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    default_name,
    user_role_val
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.email, 'User'), 'admin_kos'::public.user_role)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto delete from auth.users when profile is deleted
CREATE OR REPLACE FUNCTION public.handle_delete_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_deleted ON public.profiles;
CREATE TRIGGER on_profile_deleted
  AFTER DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_delete_user();



-- ============================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kosan ENABLE ROW LEVEL SECURITY;
ALTER TABLE kamar ENABLE ROW LEVEL SECURITY;
ALTER TABLE penghuni ENABLE ROW LEVEL SECURITY;

-- Profiles policies (Clean & Non-recursive)
DROP POLICY IF EXISTS "Superadmin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Superadmin can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Allow authenticated read profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow users update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Allow users insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Kosan policies
DROP POLICY IF EXISTS "Superadmin can manage all kosan" ON kosan;
DROP POLICY IF EXISTS "Pemilik can view own kosan" ON kosan;
DROP POLICY IF EXISTS "Pemilik can update own kosan" ON kosan;
DROP POLICY IF EXISTS "Public can view kosan by kode_unik" ON kosan;

CREATE POLICY "Allow authenticated manage kosan"
  ON kosan FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Allow public view kosan"
  ON kosan FOR SELECT
  USING (true);

-- Kamar policies
DROP POLICY IF EXISTS "Superadmin can manage all kamar" ON kamar;
DROP POLICY IF EXISTS "Pemilik can manage kamar in own kosan" ON kamar;
DROP POLICY IF EXISTS "Public can insert kamar via form" ON kamar;
DROP POLICY IF EXISTS "Public can view kamar" ON kamar;

CREATE POLICY "Allow authenticated manage kamar"
  ON kamar FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Allow public insert kamar"
  ON kamar FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public view kamar"
  ON kamar FOR SELECT
  USING (true);

-- Penghuni policies
DROP POLICY IF EXISTS "Superadmin can manage all penghuni" ON penghuni;
DROP POLICY IF EXISTS "Pemilik can view penghuni in own kosan" ON penghuni;
DROP POLICY IF EXISTS "Public can insert penghuni via form" ON penghuni;

CREATE POLICY "Allow authenticated manage penghuni"
  ON penghuni FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Allow public insert penghuni"
  ON penghuni FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public view penghuni"
  ON penghuni FOR SELECT
  USING (true);


-- ============================================
-- STORAGE BUCKET & RLS POLICIES (10MB Limit)
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'foto-penghuni',
  'foto-penghuni',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

CREATE POLICY "Public Upload Foto"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'foto-penghuni');

CREATE POLICY "Public View Foto"
ON storage.objects FOR SELECT
USING (bucket_id = 'foto-penghuni');

CREATE POLICY "Authenticated Manage Foto"
ON storage.objects FOR ALL
USING (bucket_id = 'foto-penghuni' AND auth.role() = 'authenticated');

