-- ============================================================
-- EnergyOS Demo Seed — Full Reset + Comprehensive Data
-- UAE (Dubai, Abu Dhabi, Sharjah, RAK) + Netherlands (Amsterdam, Rotterdam)
-- Safe to re-run: deletes and re-inserts all demo tenant data
-- ============================================================

-- ─── Schema guards ────────────────────────────────────────────
ALTER TABLE energy_connections  ADD COLUMN IF NOT EXISTS tenant_id       UUID REFERENCES tenants(id);
ALTER TABLE energy_connections  ADD COLUMN IF NOT EXISTS site_name       TEXT;
ALTER TABLE energy_connections  ADD COLUMN IF NOT EXISTS ean_code        TEXT;
ALTER TABLE energy_connections  ADD COLUMN IF NOT EXISTS connection_type TEXT;
ALTER TABLE energy_connections  ADD COLUMN IF NOT EXISTS capacity        TEXT;
ALTER TABLE energy_connections  ADD COLUMN IF NOT EXISTS status          TEXT DEFAULT 'Active';
ALTER TABLE energy_connections  ADD COLUMN IF NOT EXISTS meter_id        UUID;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tenant_id        UUID REFERENCES tenants(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS site_id          UUID;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS connection_id    UUID;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS supplier         TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS doc_type         TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_date         DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_due      DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_account TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_ex_vat    NUMERIC(12,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vat_amount       NUMERIC(12,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_inc_vat   NUMERIC(12,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency         TEXT DEFAULT 'AED';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS status           TEXT DEFAULT 'Pending';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes            TEXT;
ALTER TABLE consumption_records ADD COLUMN IF NOT EXISTS connection_id UUID REFERENCES energy_connections(id);
ALTER TABLE consumption_records ADD COLUMN IF NOT EXISTS tenant_id     UUID REFERENCES tenants(id);
ALTER TABLE consumption_records ALTER COLUMN meter_id DROP NOT NULL;

-- ─── Clean slate ──────────────────────────────────────────────
DELETE FROM consumption_records WHERE tenant_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
DELETE FROM invoices            WHERE tenant_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
DELETE FROM energy_connections  WHERE tenant_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
DELETE FROM addresses           WHERE tenant_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
DELETE FROM sites               WHERE tenant_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
DELETE FROM cities              WHERE tenant_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
DELETE FROM countries           WHERE tenant_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- ─── Tenant ───────────────────────────────────────────────────
INSERT INTO tenants (id, name, slug, plan, currency)
VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','Masdar City Group','masdar-city-group','professional','AED')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

-- ─── Countries ────────────────────────────────────────────────
INSERT INTO countries (id, tenant_id, name, code, currency) VALUES
  ('aa000001-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','United Arab Emirates','AE','AED'),
  ('aa000002-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','Netherlands','NL','EUR');

-- ─── Cities ───────────────────────────────────────────────────
INSERT INTO cities (id, tenant_id, country_id, name) VALUES
  ('bb000001-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','aa000001-e5f6-7890-abcd-ef1234567890','Dubai'),
  ('bb000002-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','aa000001-e5f6-7890-abcd-ef1234567890','Abu Dhabi'),
  ('bb000003-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','aa000001-e5f6-7890-abcd-ef1234567890','Sharjah'),
  ('bb000004-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','aa000001-e5f6-7890-abcd-ef1234567890','Ras Al Khaimah'),
  ('bb000005-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','aa000002-e5f6-7890-abcd-ef1234567890','Amsterdam'),
  ('bb000006-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','aa000002-e5f6-7890-abcd-ef1234567890','Rotterdam');

-- ─── Sites ────────────────────────────────────────────────────
INSERT INTO sites (id, tenant_id, city_id, name, status) VALUES
  ('cc000001-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','bb000001-e5f6-7890-abcd-ef1234567890','Dubai Business Bay',       'Active'),
  ('cc000002-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','bb000001-e5f6-7890-abcd-ef1234567890','DIFC Financial Centre',     'Active'),
  ('cc000003-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','bb000002-e5f6-7890-abcd-ef1234567890','Al Reem Island Tower',      'Active'),
  ('cc000004-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','bb000002-e5f6-7890-abcd-ef1234567890','Masdar City Hub',           'Active'),
  ('cc000005-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','bb000003-e5f6-7890-abcd-ef1234567890','Sharjah Airport Free Zone', 'Active'),
  ('cc000006-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','bb000004-e5f6-7890-abcd-ef1234567890','RAK Industrial Estate',     'Active'),
  ('cc000007-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','bb000005-e5f6-7890-abcd-ef1234567890','Kalverstraat Retail',       'Active'),
  ('cc000008-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','bb000006-e5f6-7890-abcd-ef1234567890','Rotterdam Botlek Office',   'Active');

-- ─── Energy Connections (2 per site = 16 total) ───────────────
INSERT INTO energy_connections (id, tenant_id, site_id, site_name, ean_code, connection_type, capacity, status, meter_id) VALUES
  ('ec000001-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000001-e5f6-7890-abcd-ef1234567890','Dubai Business Bay',      'EAN871100000000000001','Electricity','250 kVA', 'Active',NULL),
  ('ec000002-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000001-e5f6-7890-abcd-ef1234567890','Dubai Business Bay',      'EAN871100000000000002','Gas',       '400 m3/h','Active',NULL),
  ('ec000003-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000002-e5f6-7890-abcd-ef1234567890','DIFC Financial Centre',   'EAN871100000000000003','Electricity','400 kVA', 'Active',NULL),
  ('ec000004-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000002-e5f6-7890-abcd-ef1234567890','DIFC Financial Centre',   'EAN871100000000000004','Gas',       '300 m3/h','Active',NULL),
  ('ec000005-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000003-e5f6-7890-abcd-ef1234567890','Al Reem Island Tower',    'EAN871100000000000005','Electricity','630 kVA', 'Active',NULL),
  ('ec000006-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000003-e5f6-7890-abcd-ef1234567890','Al Reem Island Tower',    'EAN871100000000000006','Gas',       '600 m3/h','Active',NULL),
  ('ec000007-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000004-e5f6-7890-abcd-ef1234567890','Masdar City Hub',         'EAN871100000000000007','Electricity','200 kVA', 'Active',NULL),
  ('ec000008-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000004-e5f6-7890-abcd-ef1234567890','Masdar City Hub',         'EAN871100000000000008','Gas',       '250 m3/h','Active',NULL),
  ('ec000009-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000005-e5f6-7890-abcd-ef1234567890','Sharjah Airport Free Zone','EAN871100000000000009','Electricity','500 kVA','Active',NULL),
  ('ec000010-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000005-e5f6-7890-abcd-ef1234567890','Sharjah Airport Free Zone','EAN871100000000000010','Gas',       '800 m3/h','Active',NULL),
  ('ec000011-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000006-e5f6-7890-abcd-ef1234567890','RAK Industrial Estate',   'EAN871100000000000011','Electricity','1000 kVA','Active',NULL),
  ('ec000012-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000006-e5f6-7890-abcd-ef1234567890','RAK Industrial Estate',   'EAN871100000000000012','Gas',       '1500 m3/h','Active',NULL),
  ('ec000013-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000007-e5f6-7890-abcd-ef1234567890','Kalverstraat Retail',     'EAN871300000000000013','Electricity','160 kVA', 'Active',NULL),
  ('ec000014-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000007-e5f6-7890-abcd-ef1234567890','Kalverstraat Retail',     'EAN871300000000000014','Gas',       '200 m3/h','Active',NULL),
  ('ec000015-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000008-e5f6-7890-abcd-ef1234567890','Rotterdam Botlek Office', 'EAN871300000000000015','Electricity','315 kVA', 'Active',NULL),
  ('ec000016-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000008-e5f6-7890-abcd-ef1234567890','Rotterdam Botlek Office', 'EAN871300000000000016','Gas',       '500 m3/h','Active',NULL);

-- ═══════════════════════════════════════════════════════════════
-- CONSUMPTION RECORDS — 13 months (Jun 2024 – Jun 2025)
-- UAE Electricity: summer peak (Jul/Aug), DEWA ~0.40, ADDC ~0.32, SEWA ~0.38, RAKIA ~0.30 AED/kWh
-- UAE Gas: minimal summer use, rate ~3.20 AED/m3
-- NL Electricity: winter peak, Vattenfall ~0.28 EUR/kWh
-- NL Gas: heavy winter heating, Eneco ~0.85 EUR/m3
-- ANOMALY 1: ec000005 Al Reem Elec Jul 2024 → +107% consumption spike
-- ANOMALY 2: ec000004 DIFC Gas Oct 2024 → billing error (14 AED/m3 vs 3.20)
-- ═══════════════════════════════════════════════════════════════

-- ── ec000001 Dubai Business Bay — Electricity ─────────────────
INSERT INTO consumption_records (tenant_id,connection_id,period_start,period_end,consumption,unit,cost,currency) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','2024-06-01','2024-07-01', 78000,'kWh',31200,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','2024-07-01','2024-08-01', 87750,'kWh',35100,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','2024-08-01','2024-09-01', 84500,'kWh',33800,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','2024-09-01','2024-10-01', 74750,'kWh',29900,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','2024-10-01','2024-11-01', 61750,'kWh',24700,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','2024-11-01','2024-12-01', 53300,'kWh',21320,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','2024-12-01','2025-01-01', 50700,'kWh',20280,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','2025-01-01','2025-02-01', 48750,'kWh',19500,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','2025-02-01','2025-03-01', 46800,'kWh',18720,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','2025-03-01','2025-04-01', 50700,'kWh',20280,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','2025-04-01','2025-05-01', 58500,'kWh',23400,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','2025-05-01','2025-06-01', 68250,'kWh',27300,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','2025-06-01','2025-07-01', 78000,'kWh',31200,'AED');

-- ── ec000002 Dubai Business Bay — Gas ────────────────────────
INSERT INTO consumption_records (tenant_id,connection_id,period_start,period_end,consumption,unit,cost,currency) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000002-e5f6-7890-abcd-ef1234567890','2024-06-01','2024-07-01',  96,'m3',  307,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000002-e5f6-7890-abcd-ef1234567890','2024-07-01','2024-08-01',  84,'m3',  269,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000002-e5f6-7890-abcd-ef1234567890','2024-08-01','2024-09-01',  84,'m3',  269,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000002-e5f6-7890-abcd-ef1234567890','2024-09-01','2024-10-01', 120,'m3',  384,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000002-e5f6-7890-abcd-ef1234567890','2024-10-01','2024-11-01', 180,'m3',  576,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000002-e5f6-7890-abcd-ef1234567890','2024-11-01','2024-12-01', 264,'m3',  845,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000002-e5f6-7890-abcd-ef1234567890','2024-12-01','2025-01-01', 336,'m3', 1075,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000002-e5f6-7890-abcd-ef1234567890','2025-01-01','2025-02-01', 360,'m3', 1152,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000002-e5f6-7890-abcd-ef1234567890','2025-02-01','2025-03-01', 300,'m3',  960,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000002-e5f6-7890-abcd-ef1234567890','2025-03-01','2025-04-01', 240,'m3',  768,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000002-e5f6-7890-abcd-ef1234567890','2025-04-01','2025-05-01', 180,'m3',  576,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000002-e5f6-7890-abcd-ef1234567890','2025-05-01','2025-06-01', 120,'m3',  384,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000002-e5f6-7890-abcd-ef1234567890','2025-06-01','2025-07-01',  96,'m3',  307,'AED');

-- ── ec000003 DIFC Financial Centre — Electricity ──────────────
INSERT INTO consumption_records (tenant_id,connection_id,period_start,period_end,consumption,unit,cost,currency) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000003-e5f6-7890-abcd-ef1234567890','2024-06-01','2024-07-01',102000,'kWh',40800,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000003-e5f6-7890-abcd-ef1234567890','2024-07-01','2024-08-01',114750,'kWh',45900,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000003-e5f6-7890-abcd-ef1234567890','2024-08-01','2024-09-01',110500,'kWh',44200,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000003-e5f6-7890-abcd-ef1234567890','2024-09-01','2024-10-01', 97750,'kWh',39100,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000003-e5f6-7890-abcd-ef1234567890','2024-10-01','2024-11-01', 80750,'kWh',32300,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000003-e5f6-7890-abcd-ef1234567890','2024-11-01','2024-12-01', 69700,'kWh',27880,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000003-e5f6-7890-abcd-ef1234567890','2024-12-01','2025-01-01', 66300,'kWh',26520,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000003-e5f6-7890-abcd-ef1234567890','2025-01-01','2025-02-01', 63750,'kWh',25500,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000003-e5f6-7890-abcd-ef1234567890','2025-02-01','2025-03-01', 61200,'kWh',24480,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000003-e5f6-7890-abcd-ef1234567890','2025-03-01','2025-04-01', 66300,'kWh',26520,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000003-e5f6-7890-abcd-ef1234567890','2025-04-01','2025-05-01', 76500,'kWh',30600,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000003-e5f6-7890-abcd-ef1234567890','2025-05-01','2025-06-01', 89250,'kWh',35700,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000003-e5f6-7890-abcd-ef1234567890','2025-06-01','2025-07-01',102000,'kWh',40800,'AED');

-- ── ec000004 DIFC Financial Centre — Gas (ANOMALY Oct 2024: billing error 14 AED/m3) ──
INSERT INTO consumption_records (tenant_id,connection_id,period_start,period_end,consumption,unit,cost,currency) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000004-e5f6-7890-abcd-ef1234567890','2024-06-01','2024-07-01',  64,'m3',  205,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000004-e5f6-7890-abcd-ef1234567890','2024-07-01','2024-08-01',  56,'m3',  179,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000004-e5f6-7890-abcd-ef1234567890','2024-08-01','2024-09-01',  56,'m3',  179,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000004-e5f6-7890-abcd-ef1234567890','2024-09-01','2024-10-01',  80,'m3',  256,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000004-e5f6-7890-abcd-ef1234567890','2024-10-01','2024-11-01', 120,'m3', 1680,'AED'), -- ⚠ BILLING ERROR: 14 AED/m3 vs expected 3.20
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000004-e5f6-7890-abcd-ef1234567890','2024-11-01','2024-12-01', 176,'m3',  563,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000004-e5f6-7890-abcd-ef1234567890','2024-12-01','2025-01-01', 224,'m3',  717,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000004-e5f6-7890-abcd-ef1234567890','2025-01-01','2025-02-01', 240,'m3',  768,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000004-e5f6-7890-abcd-ef1234567890','2025-02-01','2025-03-01', 200,'m3',  640,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000004-e5f6-7890-abcd-ef1234567890','2025-03-01','2025-04-01', 160,'m3',  512,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000004-e5f6-7890-abcd-ef1234567890','2025-04-01','2025-05-01', 120,'m3',  384,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000004-e5f6-7890-abcd-ef1234567890','2025-05-01','2025-06-01',  80,'m3',  256,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000004-e5f6-7890-abcd-ef1234567890','2025-06-01','2025-07-01',  64,'m3',  205,'AED');

-- ── ec000005 Al Reem Island Tower — Electricity (ANOMALY Jul 2024: +107% spike) ──
INSERT INTO consumption_records (tenant_id,connection_id,period_start,period_end,consumption,unit,cost,currency) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000005-e5f6-7890-abcd-ef1234567890','2024-06-01','2024-07-01', 90000,'kWh',28800,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000005-e5f6-7890-abcd-ef1234567890','2024-07-01','2024-08-01',210000,'kWh',67200,'AED'), -- ⚠ SPIKE +107% vs avg ~73K
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000005-e5f6-7890-abcd-ef1234567890','2024-08-01','2024-09-01', 97500,'kWh',31200,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000005-e5f6-7890-abcd-ef1234567890','2024-09-01','2024-10-01', 86250,'kWh',27600,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000005-e5f6-7890-abcd-ef1234567890','2024-10-01','2024-11-01', 71250,'kWh',22800,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000005-e5f6-7890-abcd-ef1234567890','2024-11-01','2024-12-01', 61500,'kWh',19680,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000005-e5f6-7890-abcd-ef1234567890','2024-12-01','2025-01-01', 58500,'kWh',18720,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000005-e5f6-7890-abcd-ef1234567890','2025-01-01','2025-02-01', 56250,'kWh',18000,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000005-e5f6-7890-abcd-ef1234567890','2025-02-01','2025-03-01', 54000,'kWh',17280,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000005-e5f6-7890-abcd-ef1234567890','2025-03-01','2025-04-01', 58500,'kWh',18720,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000005-e5f6-7890-abcd-ef1234567890','2025-04-01','2025-05-01', 67500,'kWh',21600,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000005-e5f6-7890-abcd-ef1234567890','2025-05-01','2025-06-01', 78750,'kWh',25200,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000005-e5f6-7890-abcd-ef1234567890','2025-06-01','2025-07-01', 90000,'kWh',28800,'AED');

-- ── ec000006 Al Reem Island Tower — Gas ──────────────────────
INSERT INTO consumption_records (tenant_id,connection_id,period_start,period_end,consumption,unit,cost,currency) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000006-e5f6-7890-abcd-ef1234567890','2024-06-01','2024-07-01', 120,'m3',  384,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000006-e5f6-7890-abcd-ef1234567890','2024-07-01','2024-08-01', 105,'m3',  336,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000006-e5f6-7890-abcd-ef1234567890','2024-08-01','2024-09-01', 105,'m3',  336,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000006-e5f6-7890-abcd-ef1234567890','2024-09-01','2024-10-01', 150,'m3',  480,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000006-e5f6-7890-abcd-ef1234567890','2024-10-01','2024-11-01', 225,'m3',  720,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000006-e5f6-7890-abcd-ef1234567890','2024-11-01','2024-12-01', 330,'m3', 1056,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000006-e5f6-7890-abcd-ef1234567890','2024-12-01','2025-01-01', 420,'m3', 1344,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000006-e5f6-7890-abcd-ef1234567890','2025-01-01','2025-02-01', 450,'m3', 1440,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000006-e5f6-7890-abcd-ef1234567890','2025-02-01','2025-03-01', 375,'m3', 1200,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000006-e5f6-7890-abcd-ef1234567890','2025-03-01','2025-04-01', 300,'m3',  960,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000006-e5f6-7890-abcd-ef1234567890','2025-04-01','2025-05-01', 225,'m3',  720,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000006-e5f6-7890-abcd-ef1234567890','2025-05-01','2025-06-01', 150,'m3',  480,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000006-e5f6-7890-abcd-ef1234567890','2025-06-01','2025-07-01', 120,'m3',  384,'AED');

-- ── ec000007 Masdar City Hub — Electricity ────────────────────
INSERT INTO consumption_records (tenant_id,connection_id,period_start,period_end,consumption,unit,cost,currency) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000007-e5f6-7890-abcd-ef1234567890','2024-06-01','2024-07-01',57600,'kWh',18432,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000007-e5f6-7890-abcd-ef1234567890','2024-07-01','2024-08-01',64800,'kWh',20736,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000007-e5f6-7890-abcd-ef1234567890','2024-08-01','2024-09-01',62400,'kWh',19968,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000007-e5f6-7890-abcd-ef1234567890','2024-09-01','2024-10-01',55200,'kWh',17664,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000007-e5f6-7890-abcd-ef1234567890','2024-10-01','2024-11-01',45600,'kWh',14592,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000007-e5f6-7890-abcd-ef1234567890','2024-11-01','2024-12-01',39360,'kWh',12595,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000007-e5f6-7890-abcd-ef1234567890','2024-12-01','2025-01-01',37440,'kWh',11981,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000007-e5f6-7890-abcd-ef1234567890','2025-01-01','2025-02-01',36000,'kWh',11520,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000007-e5f6-7890-abcd-ef1234567890','2025-02-01','2025-03-01',34560,'kWh',11059,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000007-e5f6-7890-abcd-ef1234567890','2025-03-01','2025-04-01',37440,'kWh',11981,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000007-e5f6-7890-abcd-ef1234567890','2025-04-01','2025-05-01',43200,'kWh',13824,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000007-e5f6-7890-abcd-ef1234567890','2025-05-01','2025-06-01',50400,'kWh',16128,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000007-e5f6-7890-abcd-ef1234567890','2025-06-01','2025-07-01',57600,'kWh',18432,'AED');

-- ── ec000008 Masdar City Hub — Gas ───────────────────────────
INSERT INTO consumption_records (tenant_id,connection_id,period_start,period_end,consumption,unit,cost,currency) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000008-e5f6-7890-abcd-ef1234567890','2024-06-01','2024-07-01', 48,'m3', 154,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000008-e5f6-7890-abcd-ef1234567890','2024-07-01','2024-08-01', 42,'m3', 134,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000008-e5f6-7890-abcd-ef1234567890','2024-08-01','2024-09-01', 42,'m3', 134,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000008-e5f6-7890-abcd-ef1234567890','2024-09-01','2024-10-01', 60,'m3', 192,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000008-e5f6-7890-abcd-ef1234567890','2024-10-01','2024-11-01', 90,'m3', 288,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000008-e5f6-7890-abcd-ef1234567890','2024-11-01','2024-12-01',132,'m3', 422,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000008-e5f6-7890-abcd-ef1234567890','2024-12-01','2025-01-01',168,'m3', 538,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000008-e5f6-7890-abcd-ef1234567890','2025-01-01','2025-02-01',180,'m3', 576,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000008-e5f6-7890-abcd-ef1234567890','2025-02-01','2025-03-01',150,'m3', 480,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000008-e5f6-7890-abcd-ef1234567890','2025-03-01','2025-04-01',120,'m3', 384,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000008-e5f6-7890-abcd-ef1234567890','2025-04-01','2025-05-01', 90,'m3', 288,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000008-e5f6-7890-abcd-ef1234567890','2025-05-01','2025-06-01', 60,'m3', 192,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000008-e5f6-7890-abcd-ef1234567890','2025-06-01','2025-07-01', 48,'m3', 154,'AED');

-- ── ec000009 Sharjah Airport Free Zone — Electricity ─────────
INSERT INTO consumption_records (tenant_id,connection_id,period_start,period_end,consumption,unit,cost,currency) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000009-e5f6-7890-abcd-ef1234567890','2024-06-01','2024-07-01',114000,'kWh',43320,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000009-e5f6-7890-abcd-ef1234567890','2024-07-01','2024-08-01',128250,'kWh',48735,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000009-e5f6-7890-abcd-ef1234567890','2024-08-01','2024-09-01',123500,'kWh',46930,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000009-e5f6-7890-abcd-ef1234567890','2024-09-01','2024-10-01',109250,'kWh',41515,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000009-e5f6-7890-abcd-ef1234567890','2024-10-01','2024-11-01', 90250,'kWh',34295,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000009-e5f6-7890-abcd-ef1234567890','2024-11-01','2024-12-01', 77900,'kWh',29602,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000009-e5f6-7890-abcd-ef1234567890','2024-12-01','2025-01-01', 74100,'kWh',28158,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000009-e5f6-7890-abcd-ef1234567890','2025-01-01','2025-02-01', 71250,'kWh',27075,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000009-e5f6-7890-abcd-ef1234567890','2025-02-01','2025-03-01', 68400,'kWh',25992,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000009-e5f6-7890-abcd-ef1234567890','2025-03-01','2025-04-01', 74100,'kWh',28158,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000009-e5f6-7890-abcd-ef1234567890','2025-04-01','2025-05-01', 85500,'kWh',32490,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000009-e5f6-7890-abcd-ef1234567890','2025-05-01','2025-06-01', 99750,'kWh',37905,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000009-e5f6-7890-abcd-ef1234567890','2025-06-01','2025-07-01',114000,'kWh',43320,'AED');

-- ── ec000010 Sharjah Airport Free Zone — Gas ─────────────────
INSERT INTO consumption_records (tenant_id,connection_id,period_start,period_end,consumption,unit,cost,currency) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000010-e5f6-7890-abcd-ef1234567890','2024-06-01','2024-07-01', 160,'m3',  512,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000010-e5f6-7890-abcd-ef1234567890','2024-07-01','2024-08-01', 140,'m3',  448,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000010-e5f6-7890-abcd-ef1234567890','2024-08-01','2024-09-01', 140,'m3',  448,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000010-e5f6-7890-abcd-ef1234567890','2024-09-01','2024-10-01', 200,'m3',  640,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000010-e5f6-7890-abcd-ef1234567890','2024-10-01','2024-11-01', 300,'m3',  960,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000010-e5f6-7890-abcd-ef1234567890','2024-11-01','2024-12-01', 440,'m3', 1408,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000010-e5f6-7890-abcd-ef1234567890','2024-12-01','2025-01-01', 560,'m3', 1792,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000010-e5f6-7890-abcd-ef1234567890','2025-01-01','2025-02-01', 600,'m3', 1920,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000010-e5f6-7890-abcd-ef1234567890','2025-02-01','2025-03-01', 500,'m3', 1600,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000010-e5f6-7890-abcd-ef1234567890','2025-03-01','2025-04-01', 400,'m3', 1280,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000010-e5f6-7890-abcd-ef1234567890','2025-04-01','2025-05-01', 300,'m3',  960,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000010-e5f6-7890-abcd-ef1234567890','2025-05-01','2025-06-01', 200,'m3',  640,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000010-e5f6-7890-abcd-ef1234567890','2025-06-01','2025-07-01', 160,'m3',  512,'AED');

-- ── ec000011 RAK Industrial Estate — Electricity ──────────────
INSERT INTO consumption_records (tenant_id,connection_id,period_start,period_end,consumption,unit,cost,currency) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000011-e5f6-7890-abcd-ef1234567890','2024-06-01','2024-07-01',144000,'kWh',43200,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000011-e5f6-7890-abcd-ef1234567890','2024-07-01','2024-08-01',162000,'kWh',48600,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000011-e5f6-7890-abcd-ef1234567890','2024-08-01','2024-09-01',156000,'kWh',46800,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000011-e5f6-7890-abcd-ef1234567890','2024-09-01','2024-10-01',138000,'kWh',41400,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000011-e5f6-7890-abcd-ef1234567890','2024-10-01','2024-11-01',114000,'kWh',34200,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000011-e5f6-7890-abcd-ef1234567890','2024-11-01','2024-12-01', 98400,'kWh',29520,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000011-e5f6-7890-abcd-ef1234567890','2024-12-01','2025-01-01', 93600,'kWh',28080,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000011-e5f6-7890-abcd-ef1234567890','2025-01-01','2025-02-01', 90000,'kWh',27000,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000011-e5f6-7890-abcd-ef1234567890','2025-02-01','2025-03-01', 86400,'kWh',25920,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000011-e5f6-7890-abcd-ef1234567890','2025-03-01','2025-04-01', 93600,'kWh',28080,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000011-e5f6-7890-abcd-ef1234567890','2025-04-01','2025-05-01',108000,'kWh',32400,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000011-e5f6-7890-abcd-ef1234567890','2025-05-01','2025-06-01',126000,'kWh',37800,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000011-e5f6-7890-abcd-ef1234567890','2025-06-01','2025-07-01',144000,'kWh',43200,'AED');

-- ── ec000012 RAK Industrial Estate — Gas ─────────────────────
INSERT INTO consumption_records (tenant_id,connection_id,period_start,period_end,consumption,unit,cost,currency) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000012-e5f6-7890-abcd-ef1234567890','2024-06-01','2024-07-01', 280,'m3',  896,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000012-e5f6-7890-abcd-ef1234567890','2024-07-01','2024-08-01', 245,'m3',  784,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000012-e5f6-7890-abcd-ef1234567890','2024-08-01','2024-09-01', 245,'m3',  784,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000012-e5f6-7890-abcd-ef1234567890','2024-09-01','2024-10-01', 350,'m3', 1120,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000012-e5f6-7890-abcd-ef1234567890','2024-10-01','2024-11-01', 525,'m3', 1680,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000012-e5f6-7890-abcd-ef1234567890','2024-11-01','2024-12-01', 770,'m3', 2464,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000012-e5f6-7890-abcd-ef1234567890','2024-12-01','2025-01-01', 980,'m3', 3136,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000012-e5f6-7890-abcd-ef1234567890','2025-01-01','2025-02-01',1050,'m3', 3360,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000012-e5f6-7890-abcd-ef1234567890','2025-02-01','2025-03-01', 875,'m3', 2800,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000012-e5f6-7890-abcd-ef1234567890','2025-03-01','2025-04-01', 700,'m3', 2240,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000012-e5f6-7890-abcd-ef1234567890','2025-04-01','2025-05-01', 525,'m3', 1680,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000012-e5f6-7890-abcd-ef1234567890','2025-05-01','2025-06-01', 350,'m3', 1120,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000012-e5f6-7890-abcd-ef1234567890','2025-06-01','2025-07-01', 280,'m3',  896,'AED');

-- ── ec000013 Kalverstraat Retail Amsterdam — Electricity ──────
INSERT INTO consumption_records (tenant_id,connection_id,period_start,period_end,consumption,unit,cost,currency) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000013-e5f6-7890-abcd-ef1234567890','2024-06-01','2024-07-01',13500,'kWh',3780,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000013-e5f6-7890-abcd-ef1234567890','2024-07-01','2024-08-01',12960,'kWh',3629,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000013-e5f6-7890-abcd-ef1234567890','2024-08-01','2024-09-01',12600,'kWh',3528,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000013-e5f6-7890-abcd-ef1234567890','2024-09-01','2024-10-01',14400,'kWh',4032,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000013-e5f6-7890-abcd-ef1234567890','2024-10-01','2024-11-01',17100,'kWh',4788,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000013-e5f6-7890-abcd-ef1234567890','2024-11-01','2024-12-01',19800,'kWh',5544,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000013-e5f6-7890-abcd-ef1234567890','2024-12-01','2025-01-01',21600,'kWh',6048,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000013-e5f6-7890-abcd-ef1234567890','2025-01-01','2025-02-01',21600,'kWh',6048,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000013-e5f6-7890-abcd-ef1234567890','2025-02-01','2025-03-01',20700,'kWh',5796,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000013-e5f6-7890-abcd-ef1234567890','2025-03-01','2025-04-01',18900,'kWh',5292,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000013-e5f6-7890-abcd-ef1234567890','2025-04-01','2025-05-01',16200,'kWh',4536,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000013-e5f6-7890-abcd-ef1234567890','2025-05-01','2025-06-01',14400,'kWh',4032,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000013-e5f6-7890-abcd-ef1234567890','2025-06-01','2025-07-01',13500,'kWh',3780,'EUR');

-- ── ec000014 Kalverstraat Retail Amsterdam — Gas ──────────────
INSERT INTO consumption_records (tenant_id,connection_id,period_start,period_end,consumption,unit,cost,currency) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000014-e5f6-7890-abcd-ef1234567890','2024-06-01','2024-07-01',  576,'m3',  490,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000014-e5f6-7890-abcd-ef1234567890','2024-07-01','2024-08-01',  448,'m3',  381,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000014-e5f6-7890-abcd-ef1234567890','2024-08-01','2024-09-01',  480,'m3',  408,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000014-e5f6-7890-abcd-ef1234567890','2024-09-01','2024-10-01',  960,'m3',  816,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000014-e5f6-7890-abcd-ef1234567890','2024-10-01','2024-11-01', 3200,'m3', 2720,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000014-e5f6-7890-abcd-ef1234567890','2024-11-01','2024-12-01', 5760,'m3', 4896,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000014-e5f6-7890-abcd-ef1234567890','2024-12-01','2025-01-01', 7680,'m3', 6528,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000014-e5f6-7890-abcd-ef1234567890','2025-01-01','2025-02-01', 8000,'m3', 6800,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000014-e5f6-7890-abcd-ef1234567890','2025-02-01','2025-03-01', 6720,'m3', 5712,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000014-e5f6-7890-abcd-ef1234567890','2025-03-01','2025-04-01', 5120,'m3', 4352,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000014-e5f6-7890-abcd-ef1234567890','2025-04-01','2025-05-01', 2560,'m3', 2176,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000014-e5f6-7890-abcd-ef1234567890','2025-05-01','2025-06-01', 1120,'m3',  952,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000014-e5f6-7890-abcd-ef1234567890','2025-06-01','2025-07-01',  576,'m3',  490,'EUR');

-- ── ec000015 Rotterdam Botlek Office — Electricity ────────────
INSERT INTO consumption_records (tenant_id,connection_id,period_start,period_end,consumption,unit,cost,currency) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000015-e5f6-7890-abcd-ef1234567890','2024-06-01','2024-07-01',26250,'kWh', 7350,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000015-e5f6-7890-abcd-ef1234567890','2024-07-01','2024-08-01',25200,'kWh', 7056,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000015-e5f6-7890-abcd-ef1234567890','2024-08-01','2024-09-01',24500,'kWh', 6860,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000015-e5f6-7890-abcd-ef1234567890','2024-09-01','2024-10-01',28000,'kWh', 7840,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000015-e5f6-7890-abcd-ef1234567890','2024-10-01','2024-11-01',33250,'kWh', 9310,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000015-e5f6-7890-abcd-ef1234567890','2024-11-01','2024-12-01',38500,'kWh',10780,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000015-e5f6-7890-abcd-ef1234567890','2024-12-01','2025-01-01',42000,'kWh',11760,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000015-e5f6-7890-abcd-ef1234567890','2025-01-01','2025-02-01',42000,'kWh',11760,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000015-e5f6-7890-abcd-ef1234567890','2025-02-01','2025-03-01',40250,'kWh',11270,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000015-e5f6-7890-abcd-ef1234567890','2025-03-01','2025-04-01',36750,'kWh',10290,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000015-e5f6-7890-abcd-ef1234567890','2025-04-01','2025-05-01',31500,'kWh', 8820,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000015-e5f6-7890-abcd-ef1234567890','2025-05-01','2025-06-01',28000,'kWh', 7840,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000015-e5f6-7890-abcd-ef1234567890','2025-06-01','2025-07-01',26250,'kWh', 7350,'EUR');

-- ── ec000016 Rotterdam Botlek Office — Gas ────────────────────
INSERT INTO consumption_records (tenant_id,connection_id,period_start,period_end,consumption,unit,cost,currency) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000016-e5f6-7890-abcd-ef1234567890','2024-06-01','2024-07-01',  990,'m3',  842,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000016-e5f6-7890-abcd-ef1234567890','2024-07-01','2024-08-01',  770,'m3',  655,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000016-e5f6-7890-abcd-ef1234567890','2024-08-01','2024-09-01',  825,'m3',  701,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000016-e5f6-7890-abcd-ef1234567890','2024-09-01','2024-10-01', 1650,'m3', 1403,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000016-e5f6-7890-abcd-ef1234567890','2024-10-01','2024-11-01', 5500,'m3', 4675,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000016-e5f6-7890-abcd-ef1234567890','2024-11-01','2024-12-01', 9900,'m3', 8415,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000016-e5f6-7890-abcd-ef1234567890','2024-12-01','2025-01-01',13200,'m3',11220,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000016-e5f6-7890-abcd-ef1234567890','2025-01-01','2025-02-01',13750,'m3',11688,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000016-e5f6-7890-abcd-ef1234567890','2025-02-01','2025-03-01',11550,'m3', 9818,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000016-e5f6-7890-abcd-ef1234567890','2025-03-01','2025-04-01', 8800,'m3', 7480,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000016-e5f6-7890-abcd-ef1234567890','2025-04-01','2025-05-01', 4400,'m3', 3740,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000016-e5f6-7890-abcd-ef1234567890','2025-05-01','2025-06-01', 1925,'m3', 1636,'EUR'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000016-e5f6-7890-abcd-ef1234567890','2025-06-01','2025-07-01',  990,'m3',  842,'EUR');

-- ═══════════════════════════════════════════════════════════════
-- INVOICES — 20 invoices across UAE + NL sites
-- UAE VAT 5% | NL BTW 21%
-- ═══════════════════════════════════════════════════════════════
INSERT INTO invoices (tenant_id,site_id,connection_id,nus_ref,supplier,doc_type,tax_date,payment_due,customer_account,amount_ex_vat,vat_amount,amount_inc_vat,currency,status,notes) VALUES
  -- DEWA · Dubai Business Bay Electricity · Paid ×4
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000001-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','NUS-10001','DEWA','Invoice','2025-01-31','2025-02-15','ACC-DBB-001',19500.00,975.00,20475.00,'AED','Paid',NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000001-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','NUS-10002','DEWA','Invoice','2025-02-28','2025-03-15','ACC-DBB-001',18720.00,936.00,19656.00,'AED','Paid',NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000001-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','NUS-10003','DEWA','Invoice','2025-03-31','2025-04-15','ACC-DBB-001',20280.00,1014.00,21294.00,'AED','Paid',NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000001-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','NUS-10004','DEWA','Invoice','2025-04-30','2025-05-15','ACC-DBB-001',23400.00,1170.00,24570.00,'AED','Approved',NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000001-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','NUS-10005','DEWA','Invoice','2025-05-31','2025-06-15','ACC-DBB-001',27300.00,1365.00,28665.00,'AED','Approved',NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000001-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','NUS-10006','DEWA','Invoice','2025-06-30','2025-07-15','ACC-DBB-001',31200.00,1560.00,32760.00,'AED','Pending',NULL),
  -- ADDC · Al Reem Island Electricity · includes anomaly month
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000003-e5f6-7890-abcd-ef1234567890','ec000005-e5f6-7890-abcd-ef1234567890','NUS-10007','ADDC','Invoice','2025-01-31','2025-02-15','ACC-RIM-001',18000.00,900.00,18900.00,'AED','Paid',NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000003-e5f6-7890-abcd-ef1234567890','ec000005-e5f6-7890-abcd-ef1234567890','NUS-10008','ADDC','Invoice','2025-02-28','2025-03-15','ACC-RIM-001',17280.00,864.00,18144.00,'AED','Paid',NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000003-e5f6-7890-abcd-ef1234567890','ec000005-e5f6-7890-abcd-ef1234567890','NUS-10009','ADDC','Invoice','2024-07-31','2024-08-15','ACC-RIM-001',67200.00,3360.00,70560.00,'AED','Anomaly','AI: Consumption spike +107% vs 12-month average. Verify meter or tenant activity.'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000003-e5f6-7890-abcd-ef1234567890','ec000005-e5f6-7890-abcd-ef1234567890','NUS-10010','ADDC','Invoice','2024-08-31','2024-09-15','ACC-RIM-001',31200.00,1560.00,32760.00,'AED','Approved',NULL),
  -- ADDC · Al Reem Island Gas
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000003-e5f6-7890-abcd-ef1234567890','ec000006-e5f6-7890-abcd-ef1234567890','NUS-10011','ADDC','Invoice','2024-12-31','2025-01-15','ACC-RIM-002',1344.00,67.20,1411.20,'AED','Paid',NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000003-e5f6-7890-abcd-ef1234567890','ec000006-e5f6-7890-abcd-ef1234567890','NUS-10012','ADDC','Invoice','2025-01-31','2025-02-15','ACC-RIM-002',1440.00,72.00,1512.00,'AED','Paid',NULL),
  -- DEWA · DIFC Gas · Oct anomaly billing error
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000002-e5f6-7890-abcd-ef1234567890','ec000004-e5f6-7890-abcd-ef1234567890','NUS-10013','DEWA','Invoice','2024-10-31','2024-11-15','ACC-DIFC-002',1680.00,84.00,1764.00,'AED','Anomaly','AI: Gas unit price 14.00 AED/m3 vs expected 3.20 AED/m3 — possible billing error. Contact DEWA.'),
  -- SEWA · Sharjah Airport Free Zone
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000005-e5f6-7890-abcd-ef1234567890','ec000009-e5f6-7890-abcd-ef1234567890','NUS-10014','SEWA','Invoice','2025-01-31','2025-02-15','ACC-SAIF-001',27075.00,1353.75,28428.75,'AED','Paid',NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000005-e5f6-7890-abcd-ef1234567890','ec000009-e5f6-7890-abcd-ef1234567890','NUS-10015','SEWA','Invoice','2025-02-28','2025-03-15','ACC-SAIF-001',25992.00,1299.60,27291.60,'AED','Approved',NULL),
  -- RAKIA · RAK Industrial Estate
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000006-e5f6-7890-abcd-ef1234567890','ec000011-e5f6-7890-abcd-ef1234567890','NUS-10016','RAKIA','Invoice','2025-01-31','2025-02-15','ACC-RAK-001',27000.00,1350.00,28350.00,'AED','Paid',NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000006-e5f6-7890-abcd-ef1234567890','ec000011-e5f6-7890-abcd-ef1234567890','NUS-10017','RAKIA','Invoice','2025-02-28','2025-03-15','ACC-RAK-001',25920.00,1296.00,27216.00,'AED','Approved',NULL),
  -- Vattenfall · Kalverstraat Amsterdam Electricity (EUR, BTW 21%)
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000007-e5f6-7890-abcd-ef1234567890','ec000013-e5f6-7890-abcd-ef1234567890','NUS-10018','Vattenfall','Invoice','2024-12-31','2025-01-20','ACC-KVS-001',6048.00,1270.08,7318.08,'EUR','Paid',NULL),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000007-e5f6-7890-abcd-ef1234567890','ec000013-e5f6-7890-abcd-ef1234567890','NUS-10019','Vattenfall','Invoice','2025-01-31','2025-02-20','ACC-KVS-001',6048.00,1270.08,7318.08,'EUR','Paid',NULL),
  -- Eneco · Rotterdam Gas (EUR, BTW 21%)
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000008-e5f6-7890-abcd-ef1234567890','ec000016-e5f6-7890-abcd-ef1234567890','NUS-10020','Eneco','Invoice','2025-01-31','2025-02-20','ACC-RTD-001',11688.00,2454.48,14142.48,'EUR','Pending',NULL);
