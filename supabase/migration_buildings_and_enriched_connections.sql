-- ============================================================
-- Migration: buildings table + enriched energy_connections
-- Tenant: a1b2c3d4-e5f6-7890-abcd-ef1234567890 (Masdar City Group)
-- ============================================================

-- ── 1. Buildings table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS buildings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  site_id         UUID REFERENCES sites(id),
  name            TEXT NOT NULL,
  address         TEXT,
  area_m2         INTEGER,
  floors          INTEGER,
  year_built      INTEGER,
  energy_label    TEXT DEFAULT 'C',
  breeam_rating   TEXT DEFAULT 'Good',
  leed_rating     TEXT DEFAULT 'Certified',
  occupancy_pct   INTEGER DEFAULT 85,
  status          TEXT DEFAULT 'Active',
  building_type   TEXT DEFAULT 'Office',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── 2. Extend energy_connections ────────────────────────────────────────────────
ALTER TABLE energy_connections ADD COLUMN IF NOT EXISTS supplier            TEXT;
ALTER TABLE energy_connections ADD COLUMN IF NOT EXISTS grid_operator       TEXT;
ALTER TABLE energy_connections ADD COLUMN IF NOT EXISTS measurement_company TEXT;
ALTER TABLE energy_connections ADD COLUMN IF NOT EXISTS building_name       TEXT;
ALTER TABLE energy_connections ADD COLUMN IF NOT EXISTS address             TEXT;
ALTER TABLE energy_connections ADD COLUMN IF NOT EXISTS department          TEXT DEFAULT 'Facilities';
ALTER TABLE energy_connections ADD COLUMN IF NOT EXISTS usage_category      TEXT DEFAULT 'Office';
ALTER TABLE energy_connections ADD COLUMN IF NOT EXISTS meter_number        TEXT;
ALTER TABLE energy_connections ADD COLUMN IF NOT EXISTS meter_install_date  DATE;
ALTER TABLE energy_connections ADD COLUMN IF NOT EXISTS active_since        DATE;
ALTER TABLE energy_connections ADD COLUMN IF NOT EXISTS contract            TEXT;
ALTER TABLE energy_connections ADD COLUMN IF NOT EXISTS latitude            NUMERIC(10,6);
ALTER TABLE energy_connections ADD COLUMN IF NOT EXISTS longitude           NUMERIC(10,6);
ALTER TABLE energy_connections ADD COLUMN IF NOT EXISTS budget_annual_aed   NUMERIC(12,2);
ALTER TABLE energy_connections ADD COLUMN IF NOT EXISTS tariff_rate         NUMERIC(8,4);
ALTER TABLE energy_connections ADD COLUMN IF NOT EXISTS remarks             TEXT;
ALTER TABLE energy_connections ADD COLUMN IF NOT EXISTS product             TEXT DEFAULT 'Electricity';

-- ── 3. Seed buildings ───────────────────────────────────────────────────────────
DELETE FROM buildings WHERE tenant_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

INSERT INTO buildings (id, tenant_id, site_id, name, address, area_m2, floors, year_built, energy_label, breeam_rating, leed_rating, occupancy_pct, status, building_type) VALUES
-- Dubai Business Bay (cc000001)
('bb100001-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000001-e5f6-7890-abcd-ef1234567890','Tower A','Sheikh Zayed Rd 12, Business Bay, Dubai',4200,28,2018,'B','Excellent','Gold',92,'Active','Office'),
('bb100002-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000001-e5f6-7890-abcd-ef1234567890','Tower B','Sheikh Zayed Rd 14, Business Bay, Dubai',3800,24,2016,'C','Very Good','Silver',78,'Active','Office'),
('bb100003-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000001-e5f6-7890-abcd-ef1234567890','Retail Podium','Ground Floor, Business Bay, Dubai',1200,2,2018,'C','Good','Certified',95,'Active','Retail'),
-- DIFC Financial Centre (cc000002)
('bb100004-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000002-e5f6-7890-abcd-ef1234567890','Gate Building','Gate Avenue, DIFC, Dubai',8500,34,2004,'A+','Outstanding','Platinum',88,'Active','Office'),
('bb100005-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000002-e5f6-7890-abcd-ef1234567890','Index Tower','DIFC Index Tower, Dubai',6200,80,2011,'A','Excellent','Gold',82,'Active','Mixed-Use'),
-- Al Reem Island Tower (cc000003)
('bb100006-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000003-e5f6-7890-abcd-ef1234567890','Al Reem Tower North','Al Reem Island, Abu Dhabi',5600,38,2014,'B','Very Good','Gold',87,'Active','Office'),
('bb100007-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000003-e5f6-7890-abcd-ef1234567890','Al Reem Tower South','Al Reem Island, Abu Dhabi',5200,36,2014,'B','Very Good','Silver',83,'Active','Office'),
('bb100008-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000003-e5f6-7890-abcd-ef1234567890','Reem Podium','Al Reem Island, Abu Dhabi',1800,3,2015,'C','Good','Certified',90,'Active','Retail'),
-- Masdar City Hub (cc000004)
('bb100009-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000004-e5f6-7890-abcd-ef1234567890','Hub Central','Masdar City, Abu Dhabi',3100,6,2020,'A++','Outstanding','Platinum',76,'Active','Office'),
('bb100010-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000004-e5f6-7890-abcd-ef1234567890','Research Annex','Masdar City, Abu Dhabi',2200,4,2022,'A++','Outstanding','Platinum',65,'Active','Office'),
-- Sharjah Airport Free Zone (cc000005)
('bb100011-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000005-e5f6-7890-abcd-ef1234567890','Logistics Hub A','Sharjah Airport Free Zone, Sharjah',6800,4,2012,'D','Pass','None',88,'Active','Industrial'),
('bb100012-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000005-e5f6-7890-abcd-ef1234567890','Logistics Hub B','Sharjah Airport Free Zone, Sharjah',5400,3,2015,'D','Pass','None',82,'Active','Industrial'),
('bb100013-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000005-e5f6-7890-abcd-ef1234567890','Warehouse C','Sharjah Airport Free Zone, Sharjah',9200,1,2010,'E','Unclassified','None',70,'Active','Industrial'),
-- RAK Industrial Estate (cc000006)
('bb100014-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000006-e5f6-7890-abcd-ef1234567890','Factory 1','RAK Industrial Estate, Ras Al Khaimah',12000,2,2008,'E','Pass','None',94,'Active','Industrial'),
('bb100015-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000006-e5f6-7890-abcd-ef1234567890','Factory 2','RAK Industrial Estate, Ras Al Khaimah',10500,2,2010,'D','Pass','None',91,'Active','Industrial'),
('bb100016-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000006-e5f6-7890-abcd-ef1234567890','Admin Block','RAK Industrial Estate, Ras Al Khaimah',1500,3,2012,'C','Good','Certified',75,'Active','Office'),
-- Kalverstraat Retail (cc000007)
('bb100017-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000007-e5f6-7890-abcd-ef1234567890','Kalverstraat Main','Kalverstraat 1, Amsterdam',2800,5,1995,'B','Very Good','Silver',96,'Active','Retail'),
('bb100018-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000007-e5f6-7890-abcd-ef1234567890','Back Office Block','Kalverstraat 3, Amsterdam',900,3,2001,'C','Good','Certified',80,'Active','Office'),
-- Rotterdam Botlek Office (cc000008)
('bb100019-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000008-e5f6-7890-abcd-ef1234567890','Botlek Office A','Botlekweg 100, Rotterdam',3400,6,2005,'C','Very Good','Silver',78,'Active','Office'),
('bb100020-e5f6-7890-abcd-ef1234567890','a1b2c3d4-e5f6-7890-abcd-ef1234567890','cc000008-e5f6-7890-abcd-ef1234567890','Botlek Office B','Botlekweg 102, Rotterdam',2900,5,2008,'B','Very Good','Gold',72,'Active','Office');

-- ── 4. Enrich energy_connections with real-world data ──────────────────────────
-- Dubai Business Bay - DEWA
UPDATE energy_connections SET
  supplier='DEWA', grid_operator='DEWA', measurement_company='DEWA Metering',
  building_name='Tower A', address='Sheikh Zayed Rd 12, Business Bay', department='Real Estate',
  usage_category='Office', meter_number='E007900001', meter_install_date='2018-03-01',
  active_since='2018-04-01', contract='DEWA Commercial 2018',
  latitude=25.1865, longitude=55.2632, budget_annual_aed=280000, tariff_rate=0.38,
  product='Electricity', remarks='Primary feed for Tower A floors 1-28.'
WHERE id='ec000001-e5f6-7890-abcd-ef1234567890';

UPDATE energy_connections SET
  supplier='DEWA', grid_operator='DEWA', measurement_company='DEWA Metering',
  building_name='Tower A', address='Sheikh Zayed Rd 12, Business Bay', department='Real Estate',
  usage_category='Office', meter_number='G007900002', meter_install_date='2018-03-01',
  active_since='2018-04-01', contract='DEWA Gas Commercial 2018',
  latitude=25.1866, longitude=55.2633, budget_annual_aed=45000, tariff_rate=3.20,
  product='Gas', remarks='Gas supply for HVAC plant room.'
WHERE id='ec000002-e5f6-7890-abcd-ef1234567890';

-- DIFC Financial Centre - DEWA
UPDATE energy_connections SET
  supplier='DEWA', grid_operator='DEWA', measurement_company='DEWA Metering',
  building_name='Gate Building', address='Gate Avenue, DIFC', department='Finance',
  usage_category='Office', meter_number='E007900003', meter_install_date='2004-01-01',
  active_since='2004-02-01', contract='DEWA HV Commercial',
  latitude=25.2144, longitude=55.2830, budget_annual_aed=520000, tariff_rate=0.44,
  product='Electricity', remarks='HV feed for Gate Building and Index Tower.'
WHERE id='ec000003-e5f6-7890-abcd-ef1234567890';

UPDATE energy_connections SET
  supplier='DEWA', grid_operator='DEWA', measurement_company='DEWA Metering',
  building_name='Gate Building', address='Gate Avenue, DIFC', department='Finance',
  usage_category='Office', meter_number='G007900004', meter_install_date='2004-01-01',
  active_since='2004-02-01', contract='DEWA Gas HV 2004',
  latitude=25.2145, longitude=55.2831, budget_annual_aed=72000, tariff_rate=3.20,
  product='Gas', remarks='Gas for district cooling plant.'
WHERE id='ec000004-e5f6-7890-abcd-ef1234567890';

-- Al Reem Island - ADDC
UPDATE energy_connections SET
  supplier='ADDC', grid_operator='ADDC', measurement_company='ADDC Metering',
  building_name='Al Reem Tower North', address='Al Reem Island, Abu Dhabi', department='Real Estate',
  usage_category='Office', meter_number='E009900005', meter_install_date='2014-06-01',
  active_since='2014-07-01', contract='ADDC Commercial 2014',
  latitude=24.5106, longitude=54.4058, budget_annual_aed=650000, tariff_rate=0.32,
  product='Electricity', remarks='Main feed Al Reem Towers North + South.'
WHERE id='ec000005-e5f6-7890-abcd-ef1234567890';

UPDATE energy_connections SET
  supplier='ADDC', grid_operator='ADDC', measurement_company='ADDC Metering',
  building_name='Al Reem Tower North', address='Al Reem Island, Abu Dhabi', department='Real Estate',
  usage_category='Office', meter_number='G009900006', meter_install_date='2014-06-01',
  active_since='2014-07-01', contract='ADDC Gas Commercial 2014',
  latitude=24.5107, longitude=54.4059, budget_annual_aed=88000, tariff_rate=2.80,
  product='Gas', remarks='Gas boiler and backup heating.'
WHERE id='ec000006-e5f6-7890-abcd-ef1234567890';

-- Masdar City - ADDC
UPDATE energy_connections SET
  supplier='ADDC', grid_operator='ADDC', measurement_company='ADDC Metering',
  building_name='Hub Central', address='Masdar City, Abu Dhabi', department='Sustainability',
  usage_category='Office', meter_number='E009900007', meter_install_date='2020-01-01',
  active_since='2020-02-01', contract='ADDC Green Tariff 2020',
  latitude=24.4272, longitude=54.6197, budget_annual_aed=190000, tariff_rate=0.28,
  product='Electricity', remarks='Green energy feed. 60% solar offset.'
WHERE id='ec000007-e5f6-7890-abcd-ef1234567890';

UPDATE energy_connections SET
  supplier='ADDC', grid_operator='ADDC', measurement_company='ADDC Metering',
  building_name='Hub Central', address='Masdar City, Abu Dhabi', department='Sustainability',
  usage_category='Office', meter_number='G009900008', meter_install_date='2020-01-01',
  active_since='2020-02-01', contract='ADDC Gas 2020',
  latitude=24.4273, longitude=54.6198, budget_annual_aed=18000, tariff_rate=2.50,
  product='Gas', remarks='Minimal gas - backup only.'
WHERE id='ec000008-e5f6-7890-abcd-ef1234567890';

-- Sharjah Airport FZ - SEWA
UPDATE energy_connections SET
  supplier='SEWA', grid_operator='SEWA', measurement_company='SEWA Metering',
  building_name='Logistics Hub A', address='Sharjah Airport Free Zone, Sharjah', department='Logistics',
  usage_category='Industrial', meter_number='E006600009', meter_install_date='2012-03-01',
  active_since='2012-04-01', contract='SEWA Industrial 2012',
  latitude=25.3210, longitude=55.5170, budget_annual_aed=480000, tariff_rate=0.38,
  product='Electricity', remarks='Industrial feed for logistics hubs.'
WHERE id='ec000009-e5f6-7890-abcd-ef1234567890';

UPDATE energy_connections SET
  supplier='SEWA', grid_operator='SEWA', measurement_company='SEWA Metering',
  building_name='Logistics Hub A', address='Sharjah Airport Free Zone, Sharjah', department='Logistics',
  usage_category='Industrial', meter_number='G006600010', meter_install_date='2012-03-01',
  active_since='2012-04-01', contract='SEWA Gas Industrial 2012',
  latitude=25.3211, longitude=55.5171, budget_annual_aed=120000, tariff_rate=3.10,
  product='Gas', remarks='Gas for warehouse heating and process.'
WHERE id='ec000010-e5f6-7890-abcd-ef1234567890';

-- RAK Industrial - RAKIA
UPDATE energy_connections SET
  supplier='RAKIA', grid_operator='RAKIA', measurement_company='RAKIA Metering',
  building_name='Factory 1', address='RAK Industrial Estate, Ras Al Khaimah', department='Manufacturing',
  usage_category='Industrial', meter_number='E005500011', meter_install_date='2008-01-01',
  active_since='2008-03-01', contract='RAKIA Industrial 2008',
  latitude=25.7907, longitude=55.9490, budget_annual_aed=820000, tariff_rate=0.30,
  product='Electricity', remarks='Main industrial feed for factories 1+2.'
WHERE id='ec000011-e5f6-7890-abcd-ef1234567890';

UPDATE energy_connections SET
  supplier='RAKIA', grid_operator='RAKIA', measurement_company='RAKIA Metering',
  building_name='Factory 1', address='RAK Industrial Estate, Ras Al Khaimah', department='Manufacturing',
  usage_category='Industrial', meter_number='G005500012', meter_install_date='2008-01-01',
  active_since='2008-03-01', contract='RAKIA Gas Industrial 2008',
  latitude=25.7908, longitude=55.9491, budget_annual_aed=210000, tariff_rate=2.80,
  product='Gas', remarks='Heavy gas use for manufacturing process.'
WHERE id='ec000012-e5f6-7890-abcd-ef1234567890';

-- Kalverstraat - Vattenfall / Liander (NL)
UPDATE energy_connections SET
  supplier='Vattenfall', grid_operator='Liander', measurement_company='Alliander',
  building_name='Kalverstraat Main', address='Kalverstraat 1, Amsterdam', department='Retail',
  usage_category='Retail', meter_number='NL004100013', meter_install_date='1995-01-01',
  active_since='2005-01-01', contract='Vattenfall Retail NL 2023',
  latitude=52.3726, longitude=4.8935, budget_annual_aed=95000, tariff_rate=0.28,
  product='Electricity', remarks='Retail electricity. Smart metering via Alliander.'
WHERE id='ec000013-e5f6-7890-abcd-ef1234567890';

UPDATE energy_connections SET
  supplier='Eneco', grid_operator='Liander', measurement_company='Alliander',
  building_name='Kalverstraat Main', address='Kalverstraat 1, Amsterdam', department='Retail',
  usage_category='Retail', meter_number='NL004100014', meter_install_date='1995-01-01',
  active_since='2005-01-01', contract='Eneco Gas Retail NL 2023',
  latitude=52.3727, longitude=4.8936, budget_annual_aed=28000, tariff_rate=0.85,
  product='Gas', remarks='Gas for HVAC and kitchenette.'
WHERE id='ec000014-e5f6-7890-abcd-ef1234567890';

-- Rotterdam - Essent / Stedin (NL)
UPDATE energy_connections SET
  supplier='Essent', grid_operator='Stedin', measurement_company='Stedin Metering',
  building_name='Botlek Office A', address='Botlekweg 100, Rotterdam', department='Operations',
  usage_category='Office', meter_number='NL004900015', meter_install_date='2005-06-01',
  active_since='2005-07-01', contract='Essent Office NL 2023',
  latitude=51.8921, longitude=4.3050, budget_annual_aed=140000, tariff_rate=0.28,
  product='Electricity', remarks='Office electricity for Botlek A+B.'
WHERE id='ec000015-e5f6-7890-abcd-ef1234567890';

UPDATE energy_connections SET
  supplier='Essent', grid_operator='Stedin', measurement_company='Stedin Metering',
  building_name='Botlek Office A', address='Botlekweg 100, Rotterdam', department='Operations',
  usage_category='Office', meter_number='NL004900016', meter_install_date='2005-06-01',
  active_since='2005-07-01', contract='Essent Gas Office NL 2023',
  latitude=51.8922, longitude=4.3051, budget_annual_aed=55000, tariff_rate=0.85,
  product='Gas', remarks='Gas central heating both office blocks.'
WHERE id='ec000016-e5f6-7890-abcd-ef1234567890';

-- ── 5. Add budget table for Budget page ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budgets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES tenants(id),
  connection_id UUID REFERENCES energy_connections(id),
  year          INTEGER NOT NULL,
  jan NUMERIC(10,2), feb NUMERIC(10,2), mar NUMERIC(10,2), apr NUMERIC(10,2),
  may NUMERIC(10,2), jun NUMERIC(10,2), jul NUMERIC(10,2), aug NUMERIC(10,2),
  sep NUMERIC(10,2), oct NUMERIC(10,2), nov NUMERIC(10,2), dec NUMERIC(10,2),
  UNIQUE(tenant_id, connection_id, year)
);

DELETE FROM budgets WHERE tenant_id='a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- Budget rows for electricity connections (monthly AED budgets, higher in summer for UAE)
INSERT INTO budgets (tenant_id, connection_id, year, jan,feb,mar,apr,may,jun,jul,aug,sep,oct,nov,dec) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000001-e5f6-7890-abcd-ef1234567890',2025, 20000,19000,22000,25000,30000,35000,38000,37000,31000,25000,20000,18000),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000003-e5f6-7890-abcd-ef1234567890',2025, 38000,36000,40000,46000,54000,61000,66000,65000,55000,45000,37000,33000),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000005-e5f6-7890-abcd-ef1234567890',2025, 48000,45000,50000,57000,67000,75000,82000,81000,68000,55000,46000,42000),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000007-e5f6-7890-abcd-ef1234567890',2025, 13000,12000,14000,16000,19000,22000,24000,23000,19000,15000,12000,11000),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000009-e5f6-7890-abcd-ef1234567890',2025, 35000,33000,37000,42000,50000,56000,61000,60000,50000,40000,33000,30000),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000011-e5f6-7890-abcd-ef1234567890',2025, 60000,57000,63000,72000,85000,96000,104000,103000,86000,69000,57000,52000),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000013-e5f6-7890-abcd-ef1234567890',2025, 7000,6500,7200,7500,8000,8200,8100,8100,7800,7500,7000,6900),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890','ec000015-e5f6-7890-abcd-ef1234567890',2025, 10000,9500,10500,11000,11500,12000,11800,11800,11500,11000,10000,9400);

SELECT 'Migration complete' AS status,
  (SELECT count(*) FROM buildings WHERE tenant_id='a1b2c3d4-e5f6-7890-abcd-ef1234567890') AS buildings_seeded,
  (SELECT count(*) FROM energy_connections WHERE tenant_id='a1b2c3d4-e5f6-7890-abcd-ef1234567890' AND supplier IS NOT NULL) AS connections_enriched,
  (SELECT count(*) FROM budgets WHERE tenant_id='a1b2c3d4-e5f6-7890-abcd-ef1234567890') AS budget_rows;
