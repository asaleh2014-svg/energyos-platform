-- Allow authenticated users to insert their own first tenant + tenant_user row
-- (needed because my_tenant_id() returns null before the first insert)

-- Tenants: anyone authenticated can create a tenant
CREATE POLICY "authenticated_can_create_tenant" ON tenants
  FOR INSERT TO authenticated WITH CHECK (true);

-- Tenant_users: user can insert a row linking themselves
CREATE POLICY "authenticated_can_join_tenant" ON tenant_users
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
