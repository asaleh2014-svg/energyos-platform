-- ============================================================
-- EnergyOS v2 Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT DO NOTHING
-- ============================================================

-- ─── TENANTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name     TEXT NOT NULL,
  slug     TEXT NOT NULL UNIQUE,
  plan     TEXT NOT NULL DEFAULT 'professional'
             CHECK (plan IN ('starter','professional','enterprise')),
  currency TEXT NOT NULL DEFAULT 'AED',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_tenants" ON tenants;
CREATE POLICY "open_tenants" ON tenants FOR ALL USING (true) WITH CHECK (true);

-- ─── TENANT USERS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT,
  role       TEXT NOT NULL DEFAULT 'Viewer'
               CHECK (role IN ('Admin','Finance','Viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_tenant_users" ON tenant_users;
CREATE POLICY "open_tenant_users" ON tenant_users FOR ALL USING (true) WITH CHECK (true);

-- ─── COUNTRIES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS countries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  code       TEXT NOT NULL,
  currency   TEXT NOT NULL DEFAULT 'AED',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, code)
);
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_countries" ON countries;
CREATE POLICY "open_countries" ON countries FOR ALL USING (true) WITH CHECK (true);

-- ─── CITIES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cities (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, country_id, name)
);
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_cities" ON cities;
CREATE POLICY "open_cities" ON cities FOR ALL USING (true) WITH CHECK (true);

-- ─── SITES (recreate with city_id FK) ────────────────────────
-- Drop old sites safely if empty, or alter to add city_id
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='sites' AND column_name='city_id') THEN
    -- add city_id column (nullable so existing rows survive)
    ALTER TABLE sites ADD COLUMN city_id UUID REFERENCES cities(id);
    ALTER TABLE sites ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
  END IF;
END $$;

-- ─── ADDRESSES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS addresses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id      UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  street       TEXT NOT NULL,
  house_number TEXT,
  postcode     TEXT,
  city_name    TEXT,
  country_code TEXT,
  full_address TEXT GENERATED ALWAYS AS (
    TRIM(CONCAT_WS(', ',
      NULLIF(TRIM(CONCAT(street, ' ', COALESCE(house_number,''))), ''),
      postcode,
      city_name,
      country_code
    ))
  ) STORED,
  created_at   TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_addresses" ON addresses;
CREATE POLICY "open_addresses" ON addresses FOR ALL USING (true) WITH CHECK (true);

-- ─── METERS (extend existing table) ──────────────────────────
ALTER TABLE meters ADD COLUMN IF NOT EXISTS tenant_id  UUID REFERENCES tenants(id);
ALTER TABLE meters ADD COLUMN IF NOT EXISTS address_id UUID REFERENCES addresses(id);
ALTER TABLE meters ADD COLUMN IF NOT EXISTS ean        TEXT;
ALTER TABLE meters ADD COLUMN IF NOT EXISTS utility    TEXT DEFAULT 'Electricity'
  CHECK (utility IN ('Electricity','Gas','Water','Heat'));
ALTER TABLE meters ADD COLUMN IF NOT EXISTS monitoring TEXT DEFAULT 'Smart'
  CHECK (monitoring IN ('Smart','Traditional'));

-- ─── ENERGY CONNECTIONS (extend) ─────────────────────────────
ALTER TABLE energy_connections ADD COLUMN IF NOT EXISTS site_name TEXT;

-- RLS already enabled from schema.sql, just ensure policies exist
DROP POLICY IF EXISTS "open_invoices"    ON invoices;
DROP POLICY IF EXISTS "open_sites"       ON sites;
DROP POLICY IF EXISTS "open_connections" ON energy_connections;
DROP POLICY IF EXISTS "open_consumption" ON consumption_records;

CREATE POLICY "open_invoices"      ON invoices             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_sites"         ON sites                FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_connections"   ON energy_connections   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_consumption"   ON consumption_records  FOR ALL USING (true) WITH CHECK (true);

-- ─── SEED: Tenant ────────────────────────────────────────────
INSERT INTO tenants (id, name, slug, plan, currency)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Masdar City Group',
  'masdar-city-group',
  'professional',
  'AED'
) ON CONFLICT (slug) DO NOTHING;

-- ─── SEED: Link your user as Admin ───────────────────────────
INSERT INTO tenant_users (tenant_id, user_id, full_name, role)
SELECT
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  id,
  'Ahmad Saleh',
  'Admin'
FROM auth.users
WHERE email = 'a.saleh.2014@gmail.com'
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- ─── SEED: Countries ─────────────────────────────────────────
INSERT INTO countries (id, tenant_id, name, code, currency) VALUES
  ('aa000001-e5f6-7890-abcd-ef1234567890', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'United Arab Emirates', 'UAE', 'AED'),
  ('aa000002-e5f6-7890-abcd-ef1234567890', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Netherlands',          'NL',  'EUR')
ON CONFLICT DO NOTHING;

-- ─── SEED: Cities ────────────────────────────────────────────
INSERT INTO cities (id, tenant_id, country_id, name) VALUES
  ('bb000001-e5f6-7890-abcd-ef1234567890', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000001-e5f6-7890-abcd-ef1234567890', 'Dubai'),
  ('bb000002-e5f6-7890-abcd-ef1234567890', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000001-e5f6-7890-abcd-ef1234567890', 'Abu Dhabi'),
  ('bb000003-e5f6-7890-abcd-ef1234567890', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000002-e5f6-7890-abcd-ef1234567890', 'Amsterdam')
ON CONFLICT DO NOTHING;

-- ─── SEED: Sites ─────────────────────────────────────────────
INSERT INTO sites (id, tenant_id, city_id, name, status) VALUES
  ('cc000001-e5f6-7890-abcd-ef1234567890', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'bb000001-e5f6-7890-abcd-ef1234567890', 'Dubai Business Bay', 'Active'),
  ('cc000002-e5f6-7890-abcd-ef1234567890', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'bb000001-e5f6-7890-abcd-ef1234567890', 'DIFC Tower',         'Active'),
  ('cc000003-e5f6-7890-abcd-ef1234567890', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'bb000002-e5f6-7890-abcd-ef1234567890', 'Masdar City Hub',    'Active'),
  ('cc000004-e5f6-7890-abcd-ef1234567890', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'bb000002-e5f6-7890-abcd-ef1234567890', 'Al Reem Island',     'Pending')
ON CONFLICT DO NOTHING;

-- ─── SEED: Addresses ─────────────────────────────────────────
INSERT INTO addresses (tenant_id, site_id, street, house_number, city_name, country_code) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cc000001-e5f6-7890-abcd-ef1234567890', 'Business Bay Boulevard', '10',  'Dubai',     'UAE'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cc000002-e5f6-7890-abcd-ef1234567890', 'DIFC Gate Avenue',       '1',   'Dubai',     'UAE'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cc000003-e5f6-7890-abcd-ef1234567890', 'Masdar City Road',       '4A',  'Abu Dhabi', 'UAE')
ON CONFLICT DO NOTHING;
