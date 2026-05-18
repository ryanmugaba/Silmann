-- SILMAN Foundation Schema
-- Multi-tenant org + house-scoped RLS

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper: updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auth helper (no table dependencies)
CREATE OR REPLACE FUNCTION auth_user_id()
RETURNS UUID AS $$
  SELECT auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  abn TEXT,
  ndis_registration_number TEXT,
  logo_url TEXT,
  timezone TEXT NOT NULL DEFAULT 'Australia/Sydney',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('owner', 'team_leader', 'roster_coordinator', 'support_worker', 'read_only')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notification_preferences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_deleted_at ON profiles(deleted_at);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Houses
CREATE TABLE houses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  address TEXT,
  suburb TEXT,
  state TEXT,
  postcode TEXT,
  max_residents INT,
  vehicle_info JSONB,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_houses_organization_id ON houses(organization_id);
CREATE INDEX idx_houses_deleted_at ON houses(deleted_at);

CREATE TRIGGER houses_updated_at
  BEFORE UPDATE ON houses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- House assignments
CREATE TABLE house_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),
  UNIQUE(user_id, house_id)
);

CREATE INDEX idx_house_assignments_user_id ON house_assignments(user_id);
CREATE INDEX idx_house_assignments_house_id ON house_assignments(house_id);

-- Auth helpers (require profiles + house_assignments)
CREATE OR REPLACE FUNCTION auth_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM profiles
  WHERE id = auth.uid() AND deleted_at IS NULL
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles
  WHERE id = auth.uid() AND deleted_at IS NULL
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_user_houses()
RETURNS UUID[] AS $$
  SELECT COALESCE(array_agg(ha.house_id), ARRAY[]::UUID[])
  FROM house_assignments ha
  WHERE ha.user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Permissions (custom role grants)
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  role_name TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, role_name, permission_key)
);

CREATE INDEX idx_permissions_organization_id ON permissions(organization_id);

CREATE TRIGGER permissions_updated_at
  BEFORE UPDATE ON permissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Audit log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  before_state JSONB,
  after_state JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_organization_id ON audit_log(organization_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- Invitations
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'team_leader', 'roster_coordinator', 'support_worker', 'read_only')),
  invited_by UUID REFERENCES profiles(id),
  token TEXT NOT NULL UNIQUE,
  house_ids UUID[] DEFAULT '{}',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_organization_id ON invitations(organization_id);

-- Audit trigger function
CREATE OR REPLACE FUNCTION write_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
  v_org_id UUID;
  v_before JSONB;
  v_after JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_before := NULL;
    v_after := to_jsonb(NEW);
    v_org_id := COALESCE(NEW.organization_id, auth_user_org_id());
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);
    v_org_id := COALESCE(NEW.organization_id, OLD.organization_id, auth_user_org_id());
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_before := to_jsonb(OLD);
    v_after := NULL;
    v_org_id := COALESCE(OLD.organization_id, auth_user_org_id());
  END IF;

  INSERT INTO audit_log (organization_id, user_id, action, entity_type, entity_id, before_state, after_state)
  VALUES (v_org_id, auth_user_id(), v_action, TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), v_before, v_after);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_organizations
  AFTER INSERT OR UPDATE OR DELETE ON organizations
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();

CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();

CREATE TRIGGER audit_houses
  AFTER INSERT OR UPDATE OR DELETE ON houses
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();

CREATE TRIGGER audit_permissions
  AFTER INSERT OR UPDATE OR DELETE ON permissions
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();

-- Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE house_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Organizations: members see own org
CREATE POLICY org_select ON organizations FOR SELECT
  USING (id = auth_user_org_id() AND deleted_at IS NULL);

CREATE POLICY org_update ON organizations FOR UPDATE
  USING (id = auth_user_org_id() AND auth_user_role() = 'owner' AND deleted_at IS NULL);

-- Profiles: org members see org profiles; workers see own
CREATE POLICY profiles_select ON profiles FOR SELECT
  USING (
    deleted_at IS NULL AND (
      (organization_id = auth_user_org_id() AND auth_user_role() IN ('owner', 'team_leader', 'roster_coordinator', 'read_only'))
      OR id = auth.uid()
    )
  );

CREATE POLICY profiles_update_own ON profiles FOR UPDATE
  USING (id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY profiles_update_manager ON profiles FOR UPDATE
  USING (
    organization_id = auth_user_org_id()
    AND auth_user_role() IN ('owner', 'team_leader')
    AND deleted_at IS NULL
  );

-- Houses: org-scoped, house-scoped for non-owners
CREATE POLICY houses_select ON houses FOR SELECT
  USING (
    deleted_at IS NULL
    AND organization_id = auth_user_org_id()
    AND (
      auth_user_role() = 'owner'
      OR id = ANY(auth_user_houses())
    )
  );

CREATE POLICY houses_insert ON houses FOR INSERT
  WITH CHECK (
    organization_id = auth_user_org_id()
    AND auth_user_role() IN ('owner', 'team_leader')
  );

CREATE POLICY houses_update ON houses FOR UPDATE
  USING (
    deleted_at IS NULL
    AND organization_id = auth_user_org_id()
    AND auth_user_role() IN ('owner', 'team_leader')
    AND (auth_user_role() = 'owner' OR id = ANY(auth_user_houses()))
  );

-- House assignments
CREATE POLICY house_assignments_select ON house_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM houses h
      WHERE h.id = house_assignments.house_id
        AND h.organization_id = auth_user_org_id()
        AND h.deleted_at IS NULL
    )
  );

CREATE POLICY house_assignments_manage ON house_assignments FOR ALL
  USING (auth_user_role() IN ('owner', 'team_leader'));

-- Permissions: owner only
CREATE POLICY permissions_select ON permissions FOR SELECT
  USING (organization_id = auth_user_org_id());

CREATE POLICY permissions_manage ON permissions FOR ALL
  USING (organization_id = auth_user_org_id() AND auth_user_role() = 'owner');

-- Audit log: managers and owners
CREATE POLICY audit_log_select ON audit_log FOR SELECT
  USING (
    organization_id = auth_user_org_id()
    AND auth_user_role() IN ('owner', 'team_leader', 'read_only')
  );

-- Invitations
CREATE POLICY invitations_select ON invitations FOR SELECT
  USING (organization_id = auth_user_org_id() OR token IS NOT NULL);

CREATE POLICY invitations_manage ON invitations FOR ALL
  USING (organization_id = auth_user_org_id() AND auth_user_role() IN ('owner', 'team_leader'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'support_worker')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
