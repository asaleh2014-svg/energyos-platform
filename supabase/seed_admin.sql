-- ============================================================
-- EnergyOS — Admin seed + RLS fix
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Re-apply RLS insert policies
DROP POLICY IF EXISTS "authenticated_can_create_tenant" ON tenants;
DROP POLICY IF EXISTS "anyone_can_create_tenant" ON tenants;
DROP POLICY IF EXISTS "authenticated_can_join_tenant" ON tenant_users;

CREATE POLICY "authenticated_can_create_tenant" ON tenants
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_can_join_tenant" ON tenant_users
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- 2. Tenant
INSERT INTO tenants (id, name, slug, plan, currency)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Masdar City Group',
  'masdar-city-group',
  'professional',
  'AED'
) ON CONFLICT (slug) DO NOTHING;

-- 3. Link your user account as Admin
INSERT INTO tenant_users (tenant_id, user_id, full_name, role)
SELECT
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  id,
  'Ahmad Saleh',
  'Admin'
FROM auth.users
WHERE email = 'a.saleh.saleh@hotmail.com'
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- 4. Countries
INSERT INTO countries (id, tenant_id, name, code, currency) VALUES
  ('aa000001-e5f6-7890-abcd-ef1234567890', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'United Arab Emirates', 'UAE', 'AED'),
  ('aa000002-e5f6-7890-abcd-ef1234567890', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Netherlands',          'NL',  'EUR')
ON CONFLICT DO NOTHING;

-- 5. Cities
INSERT INTO cities (id, tenant_id, country_id, name) VALUES
  ('bb000001-e5f6-7890-abcd-ef1234567890', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000001-e5f6-7890-abcd-ef1234567890', 'Dubai'),
  ('bb000002-e5f6-7890-abcd-ef1234567890', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000001-e5f6-7890-abcd-ef1234567890', 'Abu Dhabi'),
  ('bb000003-e5f6-7890-abcd-ef1234567890', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000002-e5f6-7890-abcd-ef1234567890', 'Amsterdam')
ON CONFLICT DO NOTHING;

-- 6. Sites
INSERT INTO sites (id, tenant_id, city_id, name, status) VALUES
  ('cc000001-e5f6-7890-abcd-ef1234567890', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'bb000001-e5f6-7890-abcd-ef1234567890', 'Dubai Business Bay', 'Active'),
  ('cc000002-e5f6-7890-abcd-ef1234567890', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'bb000001-e5f6-7890-abcd-ef1234567890', 'DIFC Tower',         'Active'),
  ('cc000003-e5f6-7890-abcd-ef1234567890', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'bb000002-e5f6-7890-abcd-ef1234567890', 'Masdar City Hub',    'Active'),
  ('cc000004-e5f6-7890-abcd-ef1234567890', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'bb000002-e5f6-7890-abcd-ef1234567890', 'Al Reem Island',     'Pending'),
  ('cc000005-e5f6-7890-abcd-ef1234567890', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'bb000003-e5f6-7890-abcd-ef1234567890', 'Kalverstraat',       'Active'),
  ('cc000006-e5f6-7890-abcd-ef1234567890', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'bb000003-e5f6-7890-abcd-ef1234567890', 'Zuidas Office Park', 'Active')
ON CONFLICT DO NOTHING;

-- 7. Addresses
INSERT INTO addresses (tenant_id, site_id, street, house_number, postcode, city_name, country_code) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cc000001-e5f6-7890-abcd-ef1234567890', 'Business Bay Boulevard', '10',  NULL,     'Dubai',     'UAE'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cc000002-e5f6-7890-abcd-ef1234567890', 'DIFC Gate Avenue',       '1',   NULL,     'Dubai',     'UAE'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cc000003-e5f6-7890-abcd-ef1234567890', 'Masdar City',            '4A',  NULL,     'Abu Dhabi', 'UAE'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cc000005-e5f6-7890-abcd-ef1234567890', 'Kalverstraat',           '10',  '1012 NX','Amsterdam', 'NL'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cc000005-e5f6-7890-abcd-ef1234567890', 'Kalverstraat',           '22',  '1012 NX','Amsterdam', 'NL'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'cc000006-e5f6-7890-abcd-ef1234567890', 'Gustav Mahlerlaan',      '100', '1082 MA','Amsterdam', 'NL')
ON CONFLICT DO NOTHING;
