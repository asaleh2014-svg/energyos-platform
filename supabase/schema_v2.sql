-- ============================================================
-- EnergyOS v2 — Full Multi-Tenant Schema
-- Run in Supabase SQL Editor
-- ============================================================

-- Drop old tables (safe — cascades to dependent objects)
DROP TABLE IF EXISTS consumption_records   CASCADE;
DROP TABLE IF EXISTS invoice_line_items    CASCADE;
DROP TABLE IF EXISTS invoice_headers       CASCADE;
DROP TABLE IF EXISTS contracted_tariffs    CASCADE;
DROP TABLE IF EXISTS meters                CASCADE;
DROP TABLE IF EXISTS addresses             CASCADE;
DROP TABLE IF EXISTS sites                 CASCADE;
DROP TABLE IF EXISTS cities                CASCADE;
DROP TABLE IF EXISTS countries             CASCADE;
DROP TABLE IF EXISTS tenant_users          CASCADE;
DROP TABLE IF EXISTS tenants               CASCADE;
DROP FUNCTION IF EXISTS my_tenant_id()    CASCADE;
DROP FUNCTION IF EXISTS my_role()         CASCADE;

-- ─── TENANTS (companies) ─────────────────────────────────────
CREATE TABLE tenants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  slug         TEXT UNIQUE NOT NULL,          -- e.g. "masdar-city"
  plan         TEXT NOT NULL DEFAULT 'starter'
                 CHECK (plan IN ('starter','professional','enterprise')),
  currency     TEXT NOT NULL DEFAULT 'AED',
  logo_url     TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ─── TENANT USERS ────────────────────────────────────────────
CREATE TABLE tenant_users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT,
  role         TEXT NOT NULL DEFAULT 'Viewer'
                 CHECK (role IN ('Admin','Finance','Viewer')),
  invited_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- ─── GEOGRAPHY ───────────────────────────────────────────────
CREATE TABLE countries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  code         TEXT NOT NULL,                 -- UAE, NL, UK, SA
  currency     TEXT NOT NULL DEFAULT 'AED',
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

CREATE TABLE cities (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  country_id   UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ─── SITES (e.g. "Kalverstraat") ─────────────────────────────
CREATE TABLE sites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  city_id      UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'Active'
                 CHECK (status IN ('Active','Inactive','Pending')),
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ─── ADDRESSES (e.g. "Kalverstraat 10") ──────────────────────
CREATE TABLE addresses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id      UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  street       TEXT NOT NULL,
  house_number TEXT,
  postcode     TEXT,
  city_name    TEXT,
  country_code TEXT,
  full_address TEXT GENERATED ALWAYS AS
                 (street || COALESCE(' ' || house_number, '')) STORED,
  status       TEXT NOT NULL DEFAULT 'Active',
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ─── METERS / EAN POINTS ─────────────────────────────────────
CREATE TABLE meters (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  address_id           UUID NOT NULL REFERENCES addresses(id) ON DELETE CASCADE,
  ean                  TEXT,                  -- EAN/POD/MPAN code
  meter_number         TEXT,
  utility              TEXT NOT NULL
                         CHECK (utility IN ('Electricity','Gas','Water','Heat')),
  monitoring           TEXT DEFAULT 'Smart'
                         CHECK (monitoring IN ('Smart','Traditional')),
  measurement_company  TEXT,
  status               TEXT NOT NULL DEFAULT 'Active'
                         CHECK (status IN ('Active','Inactive','Pending')),
  created_at           TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, ean)
);

-- ─── CONTRACTED TARIFFS (price per meter) ────────────────────
CREATE TABLE contracted_tariffs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  meter_id          UUID REFERENCES meters(id) ON DELETE CASCADE,
  site_id           UUID REFERENCES sites(id) ON DELETE CASCADE, -- or site-wide
  supplier          TEXT NOT NULL,
  utility           TEXT NOT NULL,
  unit_rate         NUMERIC(10,6) NOT NULL,   -- price per kWh or m³
  unit              TEXT NOT NULL DEFAULT 'kWh'
                      CHECK (unit IN ('kWh','m3','MWh')),
  standing_charge   NUMERIC(10,4) DEFAULT 0,
  currency          TEXT NOT NULL DEFAULT 'AED',
  valid_from        DATE NOT NULL,
  valid_to          DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ─── INVOICE HEADERS ─────────────────────────────────────────
CREATE TABLE invoice_headers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier         TEXT,
  invoice_number   TEXT,
  invoice_date     DATE,
  payment_due      DATE,
  file_path        TEXT,
  file_name        TEXT,
  currency         TEXT DEFAULT 'AED',
  total_ex_vat     NUMERIC(14,2),
  total_vat        NUMERIC(14,2),
  total_inc_vat    NUMERIC(14,2),
  status           TEXT DEFAULT 'Pending'
                     CHECK (status IN ('Pending','Processing','Verified','Anomaly','Approved','Paid')),
  ai_notes         TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, supplier, invoice_number)
);

-- ─── INVOICE LINE ITEMS (one per meter/EAN) ──────────────────
CREATE TABLE invoice_line_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id            UUID NOT NULL REFERENCES invoice_headers(id) ON DELETE CASCADE,
  meter_id              UUID REFERENCES meters(id),
  address_id            UUID REFERENCES addresses(id),
  ean                   TEXT,
  period_start          DATE,
  period_end            DATE,
  consumption           NUMERIC(14,4),
  unit                  TEXT CHECK (unit IN ('kWh','m3','MWh','L')),
  unit_rate_charged     NUMERIC(10,6),
  unit_rate_contracted  NUMERIC(10,6),          -- from contracted_tariffs
  rate_variance_pct     NUMERIC(8,4),           -- % diff charged vs contracted
  standing_charge       NUMERIC(10,4),
  amount_ex_vat         NUMERIC(12,2),
  vat_amount            NUMERIC(12,2),
  amount_inc_vat        NUMERIC(12,2),
  status                TEXT DEFAULT 'Pending'
                          CHECK (status IN ('Pending','Verified','Anomaly','Review')),
  anomaly_reason        TEXT,
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- ─── CONSUMPTION RECORDS (time-series per meter) ─────────────
CREATE TABLE consumption_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  meter_id        UUID NOT NULL REFERENCES meters(id) ON DELETE CASCADE,
  invoice_item_id UUID REFERENCES invoice_line_items(id),
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  consumption     NUMERIC(14,4) NOT NULL,
  unit            TEXT NOT NULL CHECK (unit IN ('kWh','m3','MWh','L')),
  cost            NUMERIC(12,2),
  currency        TEXT DEFAULT 'AED',
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, meter_id, period_start)
);

-- ─── INDEXES ─────────────────────────────────────────────────
CREATE INDEX idx_meters_tenant        ON meters(tenant_id);
CREATE INDEX idx_meters_address       ON meters(address_id);
CREATE INDEX idx_addresses_site       ON addresses(site_id);
CREATE INDEX idx_sites_city           ON sites(city_id);
CREATE INDEX idx_cities_country       ON cities(country_id);
CREATE INDEX idx_invoice_items_meter  ON invoice_line_items(meter_id);
CREATE INDEX idx_invoice_items_inv    ON invoice_line_items(invoice_id);
CREATE INDEX idx_consumption_meter    ON consumption_records(meter_id, period_start DESC);
CREATE INDEX idx_consumption_tenant   ON consumption_records(tenant_id, period_start DESC);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
ALTER TABLE tenants             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries           ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites               ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE meters              ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracted_tariffs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_headers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumption_records ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's tenant_id
CREATE OR REPLACE FUNCTION my_tenant_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1
$$;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM tenant_users WHERE user_id = auth.uid() LIMIT 1
$$;

-- RLS policies — every table isolated by tenant
CREATE POLICY "tenant_isolation" ON tenants
  FOR ALL USING (id = my_tenant_id());

CREATE POLICY "tenant_isolation" ON tenant_users
  FOR ALL USING (tenant_id = my_tenant_id());

CREATE POLICY "tenant_isolation" ON countries
  FOR ALL USING (tenant_id = my_tenant_id());

CREATE POLICY "tenant_isolation" ON cities
  FOR ALL USING (tenant_id = my_tenant_id());

CREATE POLICY "tenant_isolation" ON sites
  FOR ALL USING (tenant_id = my_tenant_id());

CREATE POLICY "tenant_isolation" ON addresses
  FOR ALL USING (tenant_id = my_tenant_id());

CREATE POLICY "tenant_isolation" ON meters
  FOR ALL USING (tenant_id = my_tenant_id());

CREATE POLICY "tenant_isolation" ON contracted_tariffs
  FOR ALL USING (tenant_id = my_tenant_id());

CREATE POLICY "tenant_isolation" ON invoice_headers
  FOR ALL USING (tenant_id = my_tenant_id());

CREATE POLICY "tenant_isolation" ON invoice_line_items
  FOR ALL USING (tenant_id = my_tenant_id());

CREATE POLICY "tenant_isolation" ON consumption_records
  FOR ALL USING (tenant_id = my_tenant_id());
