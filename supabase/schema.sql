-- ============================================================
-- EnergyOS — Supabase PostgreSQL Schema
-- Multi-tenant with Row Level Security (RLS)
-- ============================================================

-- Enable TimescaleDB for time-series (run in Supabase SQL editor)
-- CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ─── TENANTS ─────────────────────────────────────────────────
CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  plan          TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','professional','enterprise')),
  market        TEXT NOT NULL DEFAULT 'UAE'     CHECK (market IN ('UAE','NL','UK','SA','INTL')),
  currency      TEXT NOT NULL DEFAULT 'AED',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ─── USERS ───────────────────────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name     TEXT,
  role          TEXT NOT NULL DEFAULT 'Viewer' CHECK (role IN ('Administrator','Auditor','Viewer')),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ─── SITES ───────────────────────────────────────────────────
CREATE TABLE sites (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  city              TEXT NOT NULL,
  country           TEXT NOT NULL DEFAULT 'UAE',
  latitude          DOUBLE PRECISION,
  longitude         DOUBLE PRECISION,
  annual_budget     NUMERIC(12,2) DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive','Pending')),
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ─── METERS ──────────────────────────────────────────────────
CREATE TABLE meters (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meter_number        TEXT NOT NULL UNIQUE,
  type                TEXT NOT NULL DEFAULT 'Smart' CHECK (type IN ('Smart','Traditional')),
  commissioned_at     DATE,
  last_sync_at        TIMESTAMPTZ,
  interval_minutes    INT NOT NULL DEFAULT 15,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ─── ENERGY CONNECTIONS ──────────────────────────────────────
CREATE TABLE energy_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id         UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  meter_id        UUID REFERENCES meters(id),
  ean_code        TEXT NOT NULL,
  connection_type TEXT NOT NULL CHECK (connection_type IN ('Electricity','Gas')),
  capacity        TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive','Pending')),
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_connections_tenant ON energy_connections(tenant_id);
CREATE INDEX idx_connections_site   ON energy_connections(site_id);
CREATE INDEX idx_connections_status ON energy_connections(status);

-- ─── CONSUMPTION RECORDS (time-series) ───────────────────────
CREATE TABLE consumption_records (
  id              UUID DEFAULT gen_random_uuid(),
  connection_id   UUID NOT NULL REFERENCES energy_connections(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period_start    TIMESTAMPTZ NOT NULL,
  period_end      TIMESTAMPTZ NOT NULL,
  consumption     NUMERIC(14,4) NOT NULL,
  unit            TEXT NOT NULL CHECK (unit IN ('kWh','m3')),
  cost            NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'AED',
  created_at      TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id, period_start)
);

CREATE INDEX idx_consumption_connection ON consumption_records(connection_id, period_start DESC);
CREATE INDEX idx_consumption_tenant     ON consumption_records(tenant_id, period_start DESC);

-- ─── INVOICES ────────────────────────────────────────────────
CREATE TABLE invoices (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nus_ref          TEXT,
  supplier         TEXT,
  site_id          UUID REFERENCES sites(id),
  connection_id    UUID REFERENCES energy_connections(id),
  doc_type         TEXT DEFAULT 'Invoice',
  tax_date         DATE,
  payment_due      DATE,
  customer_account TEXT,
  amount_ex_vat    NUMERIC(12,2),
  vat_amount       NUMERIC(12,2),
  amount_inc_vat   NUMERIC(12,2),
  currency         TEXT DEFAULT 'AED',
  status           TEXT DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Paid','Anomaly')),
  file_path        TEXT,
  file_name        TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ─── AI CHAT HISTORY ─────────────────────────────────────────
CREATE TABLE ai_chat_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  provider    TEXT NOT NULL DEFAULT 'claude',
  market      TEXT NOT NULL DEFAULT 'UAE',
  messages    JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── ROW LEVEL SECURITY (open for now, tighten with auth later) ──
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites    ENABLE ROW LEVEL SECURITY;
ALTER TABLE energy_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumption_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open_invoices"      ON invoices             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_sites"         ON sites                FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_connections"   ON energy_connections   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_consumption"   ON consumption_records  FOR ALL USING (true) WITH CHECK (true);
