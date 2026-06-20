-- ============================================================
-- EnergyOS Demo Tenant Seed
-- Run AFTER migration_v2.sql
-- Safe to re-run: uses ON CONFLICT DO NOTHING / DO UPDATE
-- ============================================================

-- ─── Ensure columns exist (safe if already present) ──────────────────────────
ALTER TABLE energy_connections ADD COLUMN IF NOT EXISTS tenant_id  UUID REFERENCES tenants(id);
ALTER TABLE energy_connections ADD COLUMN IF NOT EXISTS site_name  TEXT;
ALTER TABLE invoices           ADD COLUMN IF NOT EXISTS tenant_id  UUID REFERENCES tenants(id);

-- ─── Energy connections (2 per site) ─────────────────────────────────────────
INSERT INTO energy_connections (id, tenant_id, site_id, site_name, ean_code, connection_type, capacity, status, meter_id)
VALUES
  -- Dubai Business Bay — electricity + gas
  ('ec000001-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000001-e5f6-7890-abcd-ef1234567890','Dubai Business Bay','EAN871100000000000001','Electricity','160 kVA','Active',NULL),
  ('ec000002-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000001-e5f6-7890-abcd-ef1234567890','Dubai Business Bay','EAN871100000000000002','Gas','200 m3/h','Active',NULL),
  -- DIFC Tower — electricity + gas
  ('ec000003-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000002-e5f6-7890-abcd-ef1234567890','DIFC Tower',        'EAN871100000000000003','Electricity','250 kVA','Active',NULL),
  ('ec000004-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000002-e5f6-7890-abcd-ef1234567890','DIFC Tower',        'EAN871100000000000004','Gas','150 m3/h','Active',NULL),
  -- Masdar City Hub — electricity + solar feed-in
  ('ec000005-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000003-e5f6-7890-abcd-ef1234567890','Masdar City Hub',   'EAN871100000000000005','Electricity','100 kVA','Active',NULL),
  ('ec000006-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000003-e5f6-7890-abcd-ef1234567890','Masdar City Hub',   'EAN871100000000000006','Electricity','80 kVA', 'Active',NULL),
  -- Al Reem Island — electricity only (pending)
  ('ec000007-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000004-e5f6-7890-abcd-ef1234567890','Al Reem Island',    'EAN871100000000000007','Electricity','200 kVA','Active',NULL),
  ('ec000008-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000004-e5f6-7890-abcd-ef1234567890','Al Reem Island',    'EAN871100000000000008','Gas','120 m3/h','Active',NULL)
ON CONFLICT DO NOTHING;

-- ─── Consumption records — 12 months 2025, realistic UAE summer peak ──────────
-- Dubai Business Bay — Electricity (EAN001, 160 kVA commercial)
-- Summer spike Jun-Sep, DEWA tariff ~0.38 AED/kWh
INSERT INTO consumption_records (tenant_id, connection_id, period_start, period_end, consumption, unit, cost, currency)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','2025-01-01','2025-01-31', 38200,'kWh', 14516,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','2025-02-01','2025-02-28', 34600,'kWh', 13148,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','2025-03-01','2025-03-31', 37100,'kWh', 14098,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','2025-04-01','2025-04-30', 48300,'kWh', 18354,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','2025-05-01','2025-05-31', 63500,'kWh', 24130,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','2025-06-01','2025-06-30', 82400,'kWh', 31312,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','2025-07-01','2025-07-31', 91200,'kWh', 34656,'AED'),  -- spike
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','2025-08-01','2025-08-31', 94700,'kWh', 35986,'AED'),  -- peak
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','2025-09-01','2025-09-30', 78300,'kWh', 29754,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','2025-10-01','2025-10-31', 54200,'kWh', 20596,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','2025-11-01','2025-11-30', 41800,'kWh', 15884,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','2025-12-01','2025-12-31', 39500,'kWh', 15010,'AED')
ON CONFLICT DO NOTHING;

-- Dubai Business Bay — Gas (EAN002)
INSERT INTO consumption_records (tenant_id, connection_id, period_start, period_end, consumption, unit, cost, currency)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000002-e5f6-7890-abcd-ef1234567890','2025-01-01','2025-01-31',  920,'m3', 2944,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000002-e5f6-7890-abcd-ef1234567890','2025-02-01','2025-02-28',  840,'m3', 2688,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000002-e5f6-7890-abcd-ef1234567890','2025-03-01','2025-03-31',  760,'m3', 2432,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000002-e5f6-7890-abcd-ef1234567890','2025-04-01','2025-04-30',  610,'m3', 1952,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000002-e5f6-7890-abcd-ef1234567890','2025-05-01','2025-05-31',  480,'m3', 1536,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000002-e5f6-7890-abcd-ef1234567890','2025-06-01','2025-06-30',  310,'m3',  992,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000002-e5f6-7890-abcd-ef1234567890','2025-07-01','2025-07-31',  280,'m3',  896,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000002-e5f6-7890-abcd-ef1234567890','2025-08-01','2025-08-31',  270,'m3',  864,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000002-e5f6-7890-abcd-ef1234567890','2025-09-01','2025-09-30',  390,'m3', 1248,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000002-e5f6-7890-abcd-ef1234567890','2025-10-01','2025-10-31',  580,'m3', 1856,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000002-e5f6-7890-abcd-ef1234567890','2025-11-01','2025-11-30',  780,'m3', 2496,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000002-e5f6-7890-abcd-ef1234567890','2025-12-01','2025-12-31',  900,'m3', 2880,'AED')
ON CONFLICT DO NOTHING;

-- DIFC Tower — Electricity (EAN003, larger 250 kVA)
INSERT INTO consumption_records (tenant_id, connection_id, period_start, period_end, consumption, unit, cost, currency)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000003-e5f6-7890-abcd-ef1234567890','2025-01-01','2025-01-31', 52400,'kWh', 19912,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000003-e5f6-7890-abcd-ef1234567890','2025-02-01','2025-02-28', 47900,'kWh', 18202,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000003-e5f6-7890-abcd-ef1234567890','2025-03-01','2025-03-31', 51200,'kWh', 19456,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000003-e5f6-7890-abcd-ef1234567890','2025-04-01','2025-04-30', 65800,'kWh', 25004,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000003-e5f6-7890-abcd-ef1234567890','2025-05-01','2025-05-31', 87300,'kWh', 33174,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000003-e5f6-7890-abcd-ef1234567890','2025-06-01','2025-06-30',112600,'kWh', 42788,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000003-e5f6-7890-abcd-ef1234567890','2025-07-01','2025-07-31',124800,'kWh', 47424,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000003-e5f6-7890-abcd-ef1234567890','2025-08-01','2025-08-31',129200,'kWh', 49096,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000003-e5f6-7890-abcd-ef1234567890','2025-09-01','2025-09-30',107400,'kWh', 40812,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000003-e5f6-7890-abcd-ef1234567890','2025-10-01','2025-10-31', 74300,'kWh', 28234,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000003-e5f6-7890-abcd-ef1234567890','2025-11-01','2025-11-30', 57600,'kWh', 21888,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000003-e5f6-7890-abcd-ef1234567890','2025-12-01','2025-12-31', 54100,'kWh', 20558,'AED')
ON CONFLICT DO NOTHING;

-- DIFC Tower — Gas (EAN004)
INSERT INTO consumption_records (tenant_id, connection_id, period_start, period_end, consumption, unit, cost, currency)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000004-e5f6-7890-abcd-ef1234567890','2025-01-01','2025-01-31', 1240,'m3', 3968,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000004-e5f6-7890-abcd-ef1234567890','2025-02-01','2025-02-28', 1110,'m3', 3552,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000004-e5f6-7890-abcd-ef1234567890','2025-03-01','2025-03-31', 1020,'m3', 3264,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000004-e5f6-7890-abcd-ef1234567890','2025-04-01','2025-04-30',  820,'m3', 2624,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000004-e5f6-7890-abcd-ef1234567890','2025-05-01','2025-05-31',  640,'m3', 2048,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000004-e5f6-7890-abcd-ef1234567890','2025-06-01','2025-06-30',  410,'m3', 1312,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000004-e5f6-7890-abcd-ef1234567890','2025-07-01','2025-07-31',  370,'m3', 1184,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000004-e5f6-7890-abcd-ef1234567890','2025-08-01','2025-08-31',  350,'m3', 1120,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000004-e5f6-7890-abcd-ef1234567890','2025-09-01','2025-09-30',  510,'m3', 1632,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000004-e5f6-7890-abcd-ef1234567890','2025-10-01','2025-10-31',  780,'m3', 2496,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000004-e5f6-7890-abcd-ef1234567890','2025-11-01','2025-11-30', 1050,'m3', 3360,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000004-e5f6-7890-abcd-ef1234567890','2025-12-01','2025-12-31', 1200,'m3', 3840,'AED')
ON CONFLICT DO NOTHING;

-- Masdar City Hub — Electricity A (EAN005, lower load — efficient green building)
INSERT INTO consumption_records (tenant_id, connection_id, period_start, period_end, consumption, unit, cost, currency)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000005-e5f6-7890-abcd-ef1234567890','2025-01-01','2025-01-31', 18400,'kWh',  6992,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000005-e5f6-7890-abcd-ef1234567890','2025-02-01','2025-02-28', 16700,'kWh',  6346,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000005-e5f6-7890-abcd-ef1234567890','2025-03-01','2025-03-31', 17900,'kWh',  6802,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000005-e5f6-7890-abcd-ef1234567890','2025-04-01','2025-04-30', 23100,'kWh',  8778,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000005-e5f6-7890-abcd-ef1234567890','2025-05-01','2025-05-31', 30400,'kWh', 11552,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000005-e5f6-7890-abcd-ef1234567890','2025-06-01','2025-06-30', 39200,'kWh', 14896,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000005-e5f6-7890-abcd-ef1234567890','2025-07-01','2025-07-31', 43100,'kWh', 16378,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000005-e5f6-7890-abcd-ef1234567890','2025-08-01','2025-08-31', 44800,'kWh', 17024,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000005-e5f6-7890-abcd-ef1234567890','2025-09-01','2025-09-30', 37200,'kWh', 14136,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000005-e5f6-7890-abcd-ef1234567890','2025-10-01','2025-10-31', 25900,'kWh',  9842,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000005-e5f6-7890-abcd-ef1234567890','2025-11-01','2025-11-30', 20100,'kWh',  7638,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000005-e5f6-7890-abcd-ef1234567890','2025-12-01','2025-12-31', 19000,'kWh',  7220,'AED')
ON CONFLICT DO NOTHING;

-- Masdar City Hub — Electricity B (EAN006, secondary meter)
INSERT INTO consumption_records (tenant_id, connection_id, period_start, period_end, consumption, unit, cost, currency)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000006-e5f6-7890-abcd-ef1234567890','2025-01-01','2025-01-31', 12300,'kWh',  4674,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000006-e5f6-7890-abcd-ef1234567890','2025-02-01','2025-02-28', 11100,'kWh',  4218,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000006-e5f6-7890-abcd-ef1234567890','2025-03-01','2025-03-31', 11900,'kWh',  4522,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000006-e5f6-7890-abcd-ef1234567890','2025-04-01','2025-04-30', 15400,'kWh',  5852,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000006-e5f6-7890-abcd-ef1234567890','2025-05-01','2025-05-31', 20300,'kWh',  7714,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000006-e5f6-7890-abcd-ef1234567890','2025-06-01','2025-06-30', 26100,'kWh',  9918,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000006-e5f6-7890-abcd-ef1234567890','2025-07-01','2025-07-31', 28700,'kWh', 10906,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000006-e5f6-7890-abcd-ef1234567890','2025-08-01','2025-08-31', 29900,'kWh', 11362,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000006-e5f6-7890-abcd-ef1234567890','2025-09-01','2025-09-30', 24800,'kWh',  9424,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000006-e5f6-7890-abcd-ef1234567890','2025-10-01','2025-10-31', 17300,'kWh',  6574,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000006-e5f6-7890-abcd-ef1234567890','2025-11-01','2025-11-30', 13400,'kWh',  5092,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000006-e5f6-7890-abcd-ef1234567890','2025-12-01','2025-12-31', 12600,'kWh',  4788,'AED')
ON CONFLICT DO NOTHING;

-- Al Reem Island — Electricity (EAN007)
-- Intentional anomaly: July spike (148% above average) to trigger anomaly detection
INSERT INTO consumption_records (tenant_id, connection_id, period_start, period_end, consumption, unit, cost, currency)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000007-e5f6-7890-abcd-ef1234567890','2025-01-01','2025-01-31', 29400,'kWh', 11172,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000007-e5f6-7890-abcd-ef1234567890','2025-02-01','2025-02-28', 26800,'kWh', 10184,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000007-e5f6-7890-abcd-ef1234567890','2025-03-01','2025-03-31', 28600,'kWh', 10868,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000007-e5f6-7890-abcd-ef1234567890','2025-04-01','2025-04-30', 37200,'kWh', 14136,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000007-e5f6-7890-abcd-ef1234567890','2025-05-01','2025-05-31', 49100,'kWh', 18658,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000007-e5f6-7890-abcd-ef1234567890','2025-06-01','2025-06-30', 63400,'kWh', 24092,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000007-e5f6-7890-abcd-ef1234567890','2025-07-01','2025-07-31',158600,'kWh', 60268,'AED'),  -- anomaly spike
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000007-e5f6-7890-abcd-ef1234567890','2025-08-01','2025-08-31', 71200,'kWh', 27056,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000007-e5f6-7890-abcd-ef1234567890','2025-09-01','2025-09-30', 59800,'kWh', 22724,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000007-e5f6-7890-abcd-ef1234567890','2025-10-01','2025-10-31', 41500,'kWh', 15770,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000007-e5f6-7890-abcd-ef1234567890','2025-11-01','2025-11-30', 32100,'kWh', 12198,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000007-e5f6-7890-abcd-ef1234567890','2025-12-01','2025-12-31', 30300,'kWh', 11514,'AED')
ON CONFLICT DO NOTHING;

-- Al Reem Island — Gas (EAN008)
-- Intentional billing anomaly: Oct billed at very high rate to trigger tariff mismatch
INSERT INTO consumption_records (tenant_id, connection_id, period_start, period_end, consumption, unit, cost, currency)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000008-e5f6-7890-abcd-ef1234567890','2025-01-01','2025-01-31',  680,'m3', 2176,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000008-e5f6-7890-abcd-ef1234567890','2025-02-01','2025-02-28',  610,'m3', 1952,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000008-e5f6-7890-abcd-ef1234567890','2025-03-01','2025-03-31',  560,'m3', 1792,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000008-e5f6-7890-abcd-ef1234567890','2025-04-01','2025-04-30',  450,'m3', 1440,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000008-e5f6-7890-abcd-ef1234567890','2025-05-01','2025-05-31',  350,'m3', 1120,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000008-e5f6-7890-abcd-ef1234567890','2025-06-01','2025-06-30',  220,'m3',  704,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000008-e5f6-7890-abcd-ef1234567890','2025-07-01','2025-07-31',  200,'m3',  640,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000008-e5f6-7890-abcd-ef1234567890','2025-08-01','2025-08-31',  190,'m3',  608,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000008-e5f6-7890-abcd-ef1234567890','2025-09-01','2025-09-30',  290,'m3',  928,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000008-e5f6-7890-abcd-ef1234567890','2025-10-01','2025-10-31',  430,'m3', 6020,'AED'),  -- billing error: 14 AED/m3
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000008-e5f6-7890-abcd-ef1234567890','2025-11-01','2025-11-30',  580,'m3', 1856,'AED'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000008-e5f6-7890-abcd-ef1234567890','2025-12-01','2025-12-31',  660,'m3', 2112,'AED')
ON CONFLICT DO NOTHING;

-- ─── Invoices — monthly, linked to connections ─────────────────────────────────
INSERT INTO invoices (tenant_id, site_id, connection_id, supplier, doc_type, tax_date, payment_due, customer_account, amount_ex_vat, vat_amount, amount_inc_vat, currency, status, notes)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000001-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','DEWA','Invoice','2025-01-31','2025-02-15','ACC-BBY-001', 14516, 725.80, 15241.80,'AED','Paid',  'Business Bay Jan electricity'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000001-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','DEWA','Invoice','2025-02-28','2025-03-15','ACC-BBY-001', 13148, 657.40, 13805.40,'AED','Paid',  'Business Bay Feb electricity'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000001-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','DEWA','Invoice','2025-03-31','2025-04-15','ACC-BBY-001', 14098, 704.90, 14802.90,'AED','Paid',  'Business Bay Mar electricity'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000001-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','DEWA','Invoice','2025-04-30','2025-05-15','ACC-BBY-001', 18354, 917.70, 19271.70,'AED','Paid',  'Business Bay Apr electricity'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000001-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','DEWA','Invoice','2025-05-31','2025-06-15','ACC-BBY-001', 24130,1206.50, 25336.50,'AED','Paid',  'Business Bay May electricity'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000001-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890','DEWA','Invoice','2025-06-30','2025-07-15','ACC-BBY-001', 31312,1565.60, 32877.60,'AED','Approved','Business Bay Jun electricity'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000002-e5f6-7890-abcd-ef1234567890','ec000003-e5f6-7890-abcd-ef1234567890','DEWA','Invoice','2025-01-31','2025-02-15','ACC-DIFC-001',19912, 995.60, 20907.60,'AED','Paid',  'DIFC Tower Jan electricity'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000002-e5f6-7890-abcd-ef1234567890','ec000003-e5f6-7890-abcd-ef1234567890','DEWA','Invoice','2025-02-28','2025-03-15','ACC-DIFC-001',18202, 910.10, 19112.10,'AED','Paid',  'DIFC Tower Feb electricity'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000002-e5f6-7890-abcd-ef1234567890','ec000003-e5f6-7890-abcd-ef1234567890','DEWA','Invoice','2025-06-30','2025-07-15','ACC-DIFC-001',42788,2139.40, 44927.40,'AED','Approved','DIFC Tower Jun electricity — peak season'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000003-e5f6-7890-abcd-ef1234567890','ec000005-e5f6-7890-abcd-ef1234567890','ADDC','Invoice','2025-01-31','2025-02-15','ACC-MSC-001',  6992, 349.60,  7341.60,'AED','Paid',  'Masdar City Jan electricity'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000004-e5f6-7890-abcd-ef1234567890','ec000007-e5f6-7890-abcd-ef1234567890','ADDC','Invoice','2025-07-31','2025-08-15','ACC-RIM-001', 60268,3013.40, 63281.40,'AED','Anomaly','Al Reem Jul — SPIKE: 158,600 kWh vs avg ~65,000 kWh'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000004-e5f6-7890-abcd-ef1234567890','ec000008-e5f6-7890-abcd-ef1234567890','ADDC','Invoice','2025-10-31','2025-11-15','ACC-RIM-002',  6020, 301.00,  6321.00,'AED','Anomaly','Al Reem Oct gas — billing error: 14 AED/m3 vs expected 3.20')
ON CONFLICT DO NOTHING;
