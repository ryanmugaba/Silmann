-- Silman: apply ALL migrations (run once in Supabase SQL Editor)
-- If a previous run failed partway, run this ENTIRE file again (includes reset below).

-- Reset public schema (safe when project has no real data yet)
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
GRANT ALL ON SCHEMA public TO anon, authenticated, service_role;
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


-- Countdown Engine: expiry tracking with threshold notifications

CREATE TABLE countdown_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'medication', 'compliance_document', 'plan_dates', 'worker_certification', 'custom'
  )),
  entity_id UUID NOT NULL,
  label TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  thresholds INT[] NOT NULL DEFAULT '{30,14,7,0}',
  severity_per_threshold TEXT[] NOT NULL DEFAULT '{green,amber,red,red}',
  notify_roles TEXT[] NOT NULL DEFAULT '{team_leader}',
  notify_users UUID[] DEFAULT '{}',
  house_id UUID REFERENCES houses(id),
  metadata JSONB NOT NULL DEFAULT '{}',
  last_notified_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'expired')),
  resolution TEXT CHECK (resolution IN ('renewed', 'ceased', 'extended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_countdown_entities_org ON countdown_entities(organization_id);
CREATE INDEX idx_countdown_entities_house ON countdown_entities(house_id);
CREATE INDEX idx_countdown_entities_entity ON countdown_entities(entity_type, entity_id);
CREATE INDEX idx_countdown_entities_expiry ON countdown_entities(expiry_date);
CREATE INDEX idx_countdown_entities_status ON countdown_entities(status);
CREATE INDEX idx_countdown_entities_deleted ON countdown_entities(deleted_at);

CREATE TRIGGER countdown_entities_updated_at
  BEFORE UPDATE ON countdown_entities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE countdown_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  countdown_entity_id UUID NOT NULL REFERENCES countdown_entities(id) ON DELETE CASCADE,
  threshold_days INT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('green', 'amber', 'red')),
  fired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES profiles(id),
  UNIQUE (countdown_entity_id, threshold_days)
);

CREATE INDEX idx_countdown_events_entity ON countdown_events(countdown_entity_id);

-- Recompute status when expiry or lifecycle changes
CREATE OR REPLACE FUNCTION recompute_countdown_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'resolved' THEN
    RETURN NEW;
  END IF;

  IF NEW.expiry_date < CURRENT_DATE AND NEW.status = 'active' THEN
    NEW.status := 'expired';
  ELSIF NEW.expiry_date >= CURRENT_DATE AND NEW.status = 'expired' THEN
    NEW.status := 'active';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER countdown_entities_recompute_status
  BEFORE INSERT OR UPDATE OF expiry_date, status, deleted_at ON countdown_entities
  FOR EACH ROW EXECUTE FUNCTION recompute_countdown_status();

CREATE TRIGGER audit_countdown_entities
  AFTER INSERT OR UPDATE OR DELETE ON countdown_entities
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();

-- Row Level Security
ALTER TABLE countdown_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE countdown_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY countdown_entities_select ON countdown_entities FOR SELECT
  USING (
    deleted_at IS NULL
    AND organization_id = auth_user_org_id()
    AND (
      auth_user_role() = 'owner'
      OR house_id IS NULL
      OR house_id = ANY(auth_user_houses())
    )
  );

CREATE POLICY countdown_entities_insert ON countdown_entities FOR INSERT
  WITH CHECK (
    organization_id = auth_user_org_id()
    AND auth_user_role() IN ('owner', 'team_leader', 'roster_coordinator')
    AND (
      auth_user_role() = 'owner'
      OR house_id IS NULL
      OR house_id = ANY(auth_user_houses())
    )
  );

CREATE POLICY countdown_entities_update ON countdown_entities FOR UPDATE
  USING (
    deleted_at IS NULL
    AND organization_id = auth_user_org_id()
    AND auth_user_role() IN ('owner', 'team_leader', 'roster_coordinator')
    AND (
      auth_user_role() = 'owner'
      OR house_id IS NULL
      OR house_id = ANY(auth_user_houses())
    )
  );

CREATE POLICY countdown_events_select ON countdown_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM countdown_entities ce
      WHERE ce.id = countdown_events.countdown_entity_id
        AND ce.deleted_at IS NULL
        AND ce.organization_id = auth_user_org_id()
        AND (
          auth_user_role() = 'owner'
          OR ce.house_id IS NULL
          OR ce.house_id = ANY(auth_user_houses())
        )
    )
  );

CREATE POLICY countdown_events_insert ON countdown_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM countdown_entities ce
      WHERE ce.id = countdown_events.countdown_entity_id
        AND ce.organization_id = auth_user_org_id()
        AND auth_user_role() IN ('owner', 'team_leader', 'roster_coordinator')
    )
  );

CREATE POLICY countdown_events_update ON countdown_events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM countdown_entities ce
      WHERE ce.id = countdown_events.countdown_entity_id
        AND ce.organization_id = auth_user_org_id()
        AND auth_user_role() IN ('owner', 'team_leader', 'roster_coordinator')
    )
  );


-- Rules Engine: configurable SIL rostering and care constraints

CREATE TABLE rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('participant', 'worker', 'house')),
  entity_id UUID NOT NULL,
  house_id UUID REFERENCES houses(id),
  condition JSONB NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('block', 'confirm', 'inform')),
  message TEXT NOT NULL,
  requires_reason BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_rules_org ON rules(organization_id);
CREATE INDEX idx_rules_entity ON rules(entity_type, entity_id);
CREATE INDEX idx_rules_house ON rules(house_id);
CREATE INDEX idx_rules_active ON rules(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_rules_deleted ON rules(deleted_at);

CREATE TRIGGER rules_updated_at
  BEFORE UPDATE ON rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE rule_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  rule_id UUID NOT NULL REFERENCES rules(id),
  action_context JSONB NOT NULL,
  override_reason TEXT NOT NULL,
  overridden_by UUID NOT NULL REFERENCES profiles(id),
  overridden_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rule_overrides_rule ON rule_overrides(rule_id);
CREATE INDEX idx_rule_overrides_org ON rule_overrides(organization_id);
CREATE INDEX idx_rule_overrides_user ON rule_overrides(overridden_by);

CREATE TRIGGER audit_rules
  AFTER INSERT OR UPDATE OR DELETE ON rules
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();

CREATE TRIGGER audit_rule_overrides
  AFTER INSERT ON rule_overrides
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();

ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY rules_select ON rules FOR SELECT
  USING (
    deleted_at IS NULL
    AND organization_id = auth_user_org_id()
    AND (
      auth_user_role() = 'owner'
      OR house_id IS NULL
      OR house_id = ANY(auth_user_houses())
    )
  );

CREATE POLICY rules_manage ON rules FOR ALL
  USING (
    deleted_at IS NULL
    AND organization_id = auth_user_org_id()
    AND auth_user_role() IN ('owner', 'team_leader')
    AND (
      auth_user_role() = 'owner'
      OR house_id IS NULL
      OR house_id = ANY(auth_user_houses())
    )
  );

CREATE POLICY rule_overrides_select ON rule_overrides FOR SELECT
  USING (organization_id = auth_user_org_id());

CREATE POLICY rule_overrides_insert ON rule_overrides FOR INSERT
  WITH CHECK (
    organization_id = auth_user_org_id()
    AND overridden_by = auth.uid()
    AND auth_user_role() IN ('owner', 'team_leader', 'roster_coordinator')
  );


-- Participants module: profiles, medications, PRN administration

CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  house_id UUID NOT NULL REFERENCES houses(id),
  ndis_number TEXT NOT NULL,
  full_name TEXT NOT NULL,
  preferred_name TEXT,
  date_of_birth DATE,
  gender TEXT,
  primary_language TEXT,
  secondary_languages TEXT[] DEFAULT '{}',
  cultural_background TEXT,
  photo_url TEXT,
  emergency_contacts JSONB NOT NULL DEFAULT '[]',
  gp_details JSONB NOT NULL DEFAULT '{}',
  plan_start_date DATE,
  plan_end_date DATE,
  plan_total_budget NUMERIC(12, 2),
  plan_budget_by_category JSONB NOT NULL DEFAULT '{}',
  goals JSONB NOT NULL DEFAULT '[]',
  dietary JSONB NOT NULL DEFAULT '{}',
  preferences JSONB NOT NULL DEFAULT '{}',
  has_vehicle_access BOOLEAN NOT NULL DEFAULT FALSE,
  mobility_aids TEXT[] DEFAULT '{}',
  communication_methods TEXT[] DEFAULT '{}',
  behaviour_support_plan_url TEXT,
  restrictive_practice_register JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  deleted_at TIMESTAMPTZ,
  UNIQUE (organization_id, ndis_number)
);

CREATE INDEX idx_participants_organization_id ON participants(organization_id);
CREATE INDEX idx_participants_house_id ON participants(house_id);
CREATE INDEX idx_participants_ndis_number ON participants(ndis_number);
CREATE INDEX idx_participants_status ON participants(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_participants_plan_end_date ON participants(plan_end_date);
CREATE INDEX idx_participants_deleted_at ON participants(deleted_at);
CREATE INDEX idx_participants_full_name ON participants(full_name);

CREATE TRIGGER participants_updated_at
  BEFORE UPDATE ON participants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE participant_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  participant_id UUID NOT NULL REFERENCES participants(id),
  drug_name TEXT NOT NULL,
  strength TEXT,
  form TEXT,
  prescriber TEXT,
  script_date DATE,
  expiry_date DATE,
  indication TEXT,
  max_dose_per_24h TEXT,
  min_interval_hours NUMERIC(6, 2),
  photo_url TEXT,
  storage_location TEXT,
  stock_count INT,
  type TEXT NOT NULL CHECK (type IN ('prn', 'webster_pak')),
  webster_pak_pharmacy_name TEXT,
  webster_pak_collection_day TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ceased')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_participant_medications_organization_id ON participant_medications(organization_id);
CREATE INDEX idx_participant_medications_participant_id ON participant_medications(participant_id);
CREATE INDEX idx_participant_medications_type ON participant_medications(type);
CREATE INDEX idx_participant_medications_status ON participant_medications(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_participant_medications_expiry_date ON participant_medications(expiry_date);
CREATE INDEX idx_participant_medications_deleted_at ON participant_medications(deleted_at);

CREATE TRIGGER participant_medications_updated_at
  BEFORE UPDATE ON participant_medications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE prn_administration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  participant_id UUID NOT NULL REFERENCES participants(id),
  medication_id UUID NOT NULL REFERENCES participant_medications(id),
  administered_by UUID NOT NULL REFERENCES profiles(id),
  administered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT NOT NULL,
  dose_given TEXT NOT NULL,
  effect_30min_followup TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prn_administration_log_organization_id ON prn_administration_log(organization_id);
CREATE INDEX idx_prn_administration_log_participant_id ON prn_administration_log(participant_id);
CREATE INDEX idx_prn_administration_log_medication_id ON prn_administration_log(medication_id);
CREATE INDEX idx_prn_administration_log_administered_by ON prn_administration_log(administered_by);
CREATE INDEX idx_prn_administration_log_administered_at ON prn_administration_log(administered_at DESC);

-- Sync organization_id from participant on medication insert
CREATE OR REPLACE FUNCTION sync_participant_medication_org()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT p.organization_id INTO NEW.organization_id
    FROM participants p
    WHERE p.id = NEW.participant_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER participant_medications_sync_org
  BEFORE INSERT ON participant_medications
  FOR EACH ROW EXECUTE FUNCTION sync_participant_medication_org();

CREATE OR REPLACE FUNCTION sync_prn_log_org()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT p.organization_id INTO NEW.organization_id
    FROM participants p
    WHERE p.id = NEW.participant_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prn_administration_log_sync_org
  BEFORE INSERT ON prn_administration_log
  FOR EACH ROW EXECUTE FUNCTION sync_prn_log_org();

CREATE TRIGGER audit_participants
  AFTER INSERT OR UPDATE OR DELETE ON participants
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();

CREATE TRIGGER audit_participant_medications
  AFTER INSERT OR UPDATE OR DELETE ON participant_medications
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();

CREATE TRIGGER audit_prn_administration_log
  AFTER INSERT ON prn_administration_log
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();

-- Row Level Security
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE prn_administration_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY participants_select ON participants FOR SELECT
  USING (
    deleted_at IS NULL
    AND organization_id = auth_user_org_id()
    AND (
      auth_user_role() = 'owner'
      OR house_id = ANY(auth_user_houses())
    )
  );

CREATE POLICY participants_insert ON participants FOR INSERT
  WITH CHECK (
    organization_id = auth_user_org_id()
    AND auth_user_role() IN ('owner', 'team_leader')
    AND (
      auth_user_role() = 'owner'
      OR house_id = ANY(auth_user_houses())
    )
  );

CREATE POLICY participants_update ON participants FOR UPDATE
  USING (
    deleted_at IS NULL
    AND organization_id = auth_user_org_id()
    AND auth_user_role() IN ('owner', 'team_leader')
    AND (
      auth_user_role() = 'owner'
      OR house_id = ANY(auth_user_houses())
    )
  );

CREATE POLICY participant_medications_select ON participant_medications FOR SELECT
  USING (
    deleted_at IS NULL
    AND organization_id = auth_user_org_id()
    AND EXISTS (
      SELECT 1 FROM participants p
      WHERE p.id = participant_medications.participant_id
        AND p.deleted_at IS NULL
        AND (
          auth_user_role() = 'owner'
          OR p.house_id = ANY(auth_user_houses())
        )
    )
  );

CREATE POLICY participant_medications_insert ON participant_medications FOR INSERT
  WITH CHECK (
    organization_id = auth_user_org_id()
    AND auth_user_role() IN ('owner', 'team_leader')
    AND EXISTS (
      SELECT 1 FROM participants p
      WHERE p.id = participant_medications.participant_id
        AND p.deleted_at IS NULL
        AND (
          auth_user_role() = 'owner'
          OR p.house_id = ANY(auth_user_houses())
        )
    )
  );

CREATE POLICY participant_medications_update ON participant_medications FOR UPDATE
  USING (
    deleted_at IS NULL
    AND organization_id = auth_user_org_id()
    AND auth_user_role() IN ('owner', 'team_leader')
    AND EXISTS (
      SELECT 1 FROM participants p
      WHERE p.id = participant_medications.participant_id
        AND p.deleted_at IS NULL
        AND (
          auth_user_role() = 'owner'
          OR p.house_id = ANY(auth_user_houses())
        )
    )
  );

CREATE POLICY prn_administration_log_select ON prn_administration_log FOR SELECT
  USING (
    organization_id = auth_user_org_id()
    AND EXISTS (
      SELECT 1 FROM participants p
      WHERE p.id = prn_administration_log.participant_id
        AND p.deleted_at IS NULL
        AND (
          auth_user_role() = 'owner'
          OR p.house_id = ANY(auth_user_houses())
        )
    )
  );

CREATE POLICY prn_administration_log_insert ON prn_administration_log FOR INSERT
  WITH CHECK (
    organization_id = auth_user_org_id()
    AND administered_by = auth.uid()
    AND auth_user_role() IN ('owner', 'team_leader', 'support_worker')
    AND EXISTS (
      SELECT 1 FROM participants p
      WHERE p.id = prn_administration_log.participant_id
        AND p.deleted_at IS NULL
        AND (
          auth_user_role() IN ('owner', 'team_leader')
          OR p.house_id = ANY(auth_user_houses())
        )
    )
  );


-- Workers module: profile extension and compliance documents

CREATE TABLE workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  worker_profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  employment_type TEXT CHECK (employment_type IN ('casual', 'part_time', 'full_time')),
  schads_level INT,
  visa_type TEXT,
  visa_max_hours_per_fortnight INT,
  bank_details_encrypted JSONB,
  tax_file_number_encrypted TEXT,
  super_fund JSONB NOT NULL DEFAULT '{}',
  languages TEXT[] DEFAULT '{}',
  certifications_summary JSONB NOT NULL DEFAULT '{}',
  vehicle_info JSONB NOT NULL DEFAULT '{}',
  preferences JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived', 'onboarding')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_workers_organization_id ON workers(organization_id);
CREATE INDEX idx_workers_worker_profile_id ON workers(worker_profile_id);
CREATE INDEX idx_workers_status ON workers(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_workers_deleted_at ON workers(deleted_at);

CREATE TRIGGER workers_updated_at
  BEFORE UPDATE ON workers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE compliance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  worker_id UUID NOT NULL REFERENCES workers(id),
  doc_type TEXT NOT NULL CHECK (doc_type IN (
    'ndis_worker_screening', 'first_aid_cpr', 'wwcc', 'drivers_license',
    'right_to_work', 'vaccination', 'vehicle_insurance', 'manual_handling',
    'peg_feeding', 'mental_health_first_aid', 'other'
  )),
  doc_name TEXT NOT NULL,
  file_url TEXT,
  issued_date DATE,
  expiry_date DATE,
  issuing_body TEXT,
  document_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN (
    'pending_approval', 'approved', 'rejected', 'expired'
  )),
  rejected_reason TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_compliance_documents_organization_id ON compliance_documents(organization_id);
CREATE INDEX idx_compliance_documents_worker_id ON compliance_documents(worker_id);
CREATE INDEX idx_compliance_documents_doc_type ON compliance_documents(doc_type);
CREATE INDEX idx_compliance_documents_status ON compliance_documents(status);
CREATE INDEX idx_compliance_documents_expiry_date ON compliance_documents(expiry_date);
CREATE INDEX idx_compliance_documents_deleted_at ON compliance_documents(deleted_at);

CREATE TRIGGER compliance_documents_updated_at
  BEFORE UPDATE ON compliance_documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION sync_compliance_document_org()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT w.organization_id INTO NEW.organization_id
    FROM workers w
    WHERE w.id = NEW.worker_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER compliance_documents_sync_org
  BEFORE INSERT ON compliance_documents
  FOR EACH ROW EXECUTE FUNCTION sync_compliance_document_org();

CREATE TRIGGER audit_workers
  AFTER INSERT OR UPDATE OR DELETE ON workers
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();

CREATE TRIGGER audit_compliance_documents
  AFTER INSERT OR UPDATE OR DELETE ON compliance_documents
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();

ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;

-- Workers: managers see house-scoped workers; workers see own record
CREATE POLICY workers_select ON workers FOR SELECT
  USING (
    deleted_at IS NULL
    AND organization_id = auth_user_org_id()
    AND (
      worker_profile_id = auth.uid()
      OR auth_user_role() IN ('owner', 'team_leader', 'roster_coordinator', 'read_only')
    )
  );

CREATE POLICY workers_insert ON workers FOR INSERT
  WITH CHECK (
    organization_id = auth_user_org_id()
    AND auth_user_role() IN ('owner', 'team_leader')
  );

CREATE POLICY workers_update_manager ON workers FOR UPDATE
  USING (
    deleted_at IS NULL
    AND organization_id = auth_user_org_id()
    AND auth_user_role() IN ('owner', 'team_leader')
  );

CREATE POLICY workers_update_self ON workers FOR UPDATE
  USING (
    deleted_at IS NULL
    AND worker_profile_id = auth.uid()
    AND auth_user_role() = 'support_worker'
  );

-- Compliance documents
CREATE POLICY compliance_documents_select ON compliance_documents FOR SELECT
  USING (
    deleted_at IS NULL
    AND organization_id = auth_user_org_id()
    AND (
      EXISTS (
        SELECT 1 FROM workers w
        WHERE w.id = compliance_documents.worker_id
          AND w.worker_profile_id = auth.uid()
          AND w.deleted_at IS NULL
      )
      OR auth_user_role() IN ('owner', 'team_leader', 'roster_coordinator', 'read_only')
    )
  );

CREATE POLICY compliance_documents_insert ON compliance_documents FOR INSERT
  WITH CHECK (
    organization_id = auth_user_org_id()
    AND (
      (
        auth_user_role() = 'support_worker'
        AND EXISTS (
          SELECT 1 FROM workers w
          WHERE w.id = compliance_documents.worker_id
            AND w.worker_profile_id = auth.uid()
            AND w.deleted_at IS NULL
        )
      )
      OR auth_user_role() IN ('owner', 'team_leader')
    )
  );

CREATE POLICY compliance_documents_update_worker ON compliance_documents FOR UPDATE
  USING (
    deleted_at IS NULL
    AND organization_id = auth_user_org_id()
    AND status IN ('pending_approval', 'rejected', 'expired')
    AND EXISTS (
      SELECT 1 FROM workers w
      WHERE w.id = compliance_documents.worker_id
        AND w.worker_profile_id = auth.uid()
        AND w.deleted_at IS NULL
    )
  );

CREATE POLICY compliance_documents_update_manager ON compliance_documents FOR UPDATE
  USING (
    deleted_at IS NULL
    AND organization_id = auth_user_org_id()
    AND auth_user_role() IN ('owner', 'team_leader')
  );


-- Roster module: shifts, swaps, availability, public holidays

CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  house_id UUID NOT NULL REFERENCES houses(id),
  participant_id UUID REFERENCES participants(id),
  worker_id UUID REFERENCES profiles(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  shift_type TEXT NOT NULL CHECK (shift_type IN (
    'day', 'afternoon', 'evening', 'sleepover', 'active_overnight',
    'community_access', 'transport', 'broken_shift'
  )),
  status TEXT NOT NULL DEFAULT 'unfilled' CHECK (status IN (
    'unfilled', 'offered', 'confirmed', 'in_progress', 'completed', 'cancelled', 'swap_pending'
  )),
  ratio TEXT NOT NULL DEFAULT '1:1',
  notes TEXT,
  schads_classification JSONB NOT NULL DEFAULT '{}',
  clock_in_at TIMESTAMPTZ,
  clock_out_at TIMESTAMPTZ,
  clock_in_location POINT,
  clock_out_location POINT,
  override_rule_ids UUID[] DEFAULT '{}',
  override_reasons JSONB[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  deleted_at TIMESTAMPTZ,
  CHECK (end_at > start_at)
);

CREATE INDEX idx_shifts_organization_id ON shifts(organization_id);
CREATE INDEX idx_shifts_house_id ON shifts(house_id);
CREATE INDEX idx_shifts_participant_id ON shifts(participant_id);
CREATE INDEX idx_shifts_worker_id ON shifts(worker_id);
CREATE INDEX idx_shifts_start_at ON shifts(start_at);
CREATE INDEX idx_shifts_end_at ON shifts(end_at);
CREATE INDEX idx_shifts_status ON shifts(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_shifts_shift_type ON shifts(shift_type);
CREATE INDEX idx_shifts_deleted_at ON shifts(deleted_at);
CREATE INDEX idx_shifts_house_start ON shifts(house_id, start_at) WHERE deleted_at IS NULL;

CREATE TRIGGER shifts_updated_at
  BEFORE UPDATE ON shifts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE shift_swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  shift_id UUID NOT NULL REFERENCES shifts(id),
  requesting_worker_id UUID NOT NULL REFERENCES profiles(id),
  target_worker_id UUID REFERENCES profiles(id),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected', 'cancelled'
  )),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shift_swap_requests_organization_id ON shift_swap_requests(organization_id);
CREATE INDEX idx_shift_swap_requests_shift_id ON shift_swap_requests(shift_id);
CREATE INDEX idx_shift_swap_requests_requesting_worker_id ON shift_swap_requests(requesting_worker_id);
CREATE INDEX idx_shift_swap_requests_target_worker_id ON shift_swap_requests(target_worker_id);
CREATE INDEX idx_shift_swap_requests_status ON shift_swap_requests(status);

CREATE TRIGGER shift_swap_requests_updated_at
  BEFORE UPDATE ON shift_swap_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE worker_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  worker_id UUID NOT NULL REFERENCES profiles(id),
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  status TEXT NOT NULL CHECK (status IN ('available', 'preferred', 'unavailable')),
  notes TEXT,
  submitted_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (worker_id, date, start_time, end_time)
);

CREATE INDEX idx_worker_availability_organization_id ON worker_availability(organization_id);
CREATE INDEX idx_worker_availability_worker_id ON worker_availability(worker_id);
CREATE INDEX idx_worker_availability_date ON worker_availability(date);
CREATE INDEX idx_worker_availability_status ON worker_availability(status);
CREATE INDEX idx_worker_availability_worker_date ON worker_availability(worker_id, date);

CREATE TRIGGER worker_availability_updated_at
  BEFORE UPDATE ON worker_availability
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE public_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  date DATE NOT NULL,
  name TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'NSW',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE NULLS NOT DISTINCT (organization_id, date, state)
);

CREATE INDEX idx_public_holidays_organization_id ON public_holidays(organization_id);
CREATE INDEX idx_public_holidays_date ON public_holidays(date);
CREATE INDEX idx_public_holidays_state ON public_holidays(state);

CREATE TRIGGER public_holidays_updated_at
  BEFORE UPDATE ON public_holidays
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION sync_shift_swap_org()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT s.organization_id INTO NEW.organization_id
    FROM shifts s
    WHERE s.id = NEW.shift_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shift_swap_requests_sync_org
  BEFORE INSERT ON shift_swap_requests
  FOR EACH ROW EXECUTE FUNCTION sync_shift_swap_org();

CREATE TRIGGER audit_shifts
  AFTER INSERT OR UPDATE OR DELETE ON shifts
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();

CREATE TRIGGER audit_shift_swap_requests
  AFTER INSERT OR UPDATE OR DELETE ON shift_swap_requests
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();

CREATE TRIGGER audit_worker_availability
  AFTER INSERT OR UPDATE OR DELETE ON worker_availability
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();

-- NSW public holidays 2026 (org-agnostic seed, organization_id NULL)
INSERT INTO public_holidays (organization_id, date, name, state) VALUES
  (NULL, '2026-01-01', 'New Year''s Day', 'NSW'),
  (NULL, '2026-01-26', 'Australia Day', 'NSW'),
  (NULL, '2026-04-03', 'Good Friday', 'NSW'),
  (NULL, '2026-04-04', 'Easter Saturday', 'NSW'),
  (NULL, '2026-04-05', 'Easter Sunday', 'NSW'),
  (NULL, '2026-04-06', 'Easter Monday', 'NSW'),
  (NULL, '2026-04-25', 'Anzac Day', 'NSW'),
  (NULL, '2026-06-08', 'King''s Birthday', 'NSW'),
  (NULL, '2026-10-05', 'Labour Day', 'NSW'),
  (NULL, '2026-12-25', 'Christmas Day', 'NSW'),
  (NULL, '2026-12-26', 'Boxing Day', 'NSW'),
  (NULL, '2026-12-28', 'Boxing Day (Additional Day)', 'NSW');

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY shifts_select ON shifts FOR SELECT
  USING (
    deleted_at IS NULL
    AND organization_id = auth_user_org_id()
    AND (
      (auth_user_role() = 'support_worker' AND worker_id = auth.uid())
      OR (
        auth_user_role() IN ('owner', 'team_leader', 'roster_coordinator', 'read_only')
        AND (
          auth_user_role() = 'owner'
          OR house_id = ANY(auth_user_houses())
        )
      )
    )
  );

CREATE POLICY shifts_insert ON shifts FOR INSERT
  WITH CHECK (
    organization_id = auth_user_org_id()
    AND auth_user_role() IN ('owner', 'team_leader', 'roster_coordinator')
    AND (
      auth_user_role() = 'owner'
      OR house_id = ANY(auth_user_houses())
    )
  );

CREATE POLICY shifts_update ON shifts FOR UPDATE
  USING (
    deleted_at IS NULL
    AND organization_id = auth_user_org_id()
    AND auth_user_role() IN ('owner', 'team_leader', 'roster_coordinator')
    AND (
      auth_user_role() = 'owner'
      OR house_id = ANY(auth_user_houses())
    )
  );

CREATE POLICY shifts_update_worker_clock ON shifts FOR UPDATE
  USING (
    deleted_at IS NULL
    AND organization_id = auth_user_org_id()
    AND worker_id = auth.uid()
    AND auth_user_role() = 'support_worker'
  );

CREATE POLICY shift_swap_requests_select ON shift_swap_requests FOR SELECT
  USING (
    organization_id = auth_user_org_id()
    AND (
      requesting_worker_id = auth.uid()
      OR target_worker_id = auth.uid()
      OR auth_user_role() IN ('owner', 'team_leader', 'roster_coordinator')
    )
  );

CREATE POLICY shift_swap_requests_insert ON shift_swap_requests FOR INSERT
  WITH CHECK (
    organization_id = auth_user_org_id()
    AND requesting_worker_id = auth.uid()
    AND auth_user_role() = 'support_worker'
    AND EXISTS (
      SELECT 1 FROM shifts s
      WHERE s.id = shift_swap_requests.shift_id
        AND s.worker_id = auth.uid()
        AND s.deleted_at IS NULL
    )
  );

CREATE POLICY shift_swap_requests_update ON shift_swap_requests FOR UPDATE
  USING (
    organization_id = auth_user_org_id()
    AND (
      auth_user_role() IN ('owner', 'team_leader', 'roster_coordinator')
      OR requesting_worker_id = auth.uid()
    )
  );

CREATE POLICY worker_availability_select ON worker_availability FOR SELECT
  USING (
    organization_id = auth_user_org_id()
    AND (
      worker_id = auth.uid()
      OR auth_user_role() IN ('owner', 'team_leader', 'roster_coordinator', 'read_only')
    )
  );

CREATE POLICY worker_availability_insert ON worker_availability FOR INSERT
  WITH CHECK (
    organization_id = auth_user_org_id()
    AND worker_id = auth.uid()
    AND auth_user_role() = 'support_worker'
  );

CREATE POLICY worker_availability_update ON worker_availability FOR UPDATE
  USING (
    organization_id = auth_user_org_id()
    AND (
      (worker_id = auth.uid() AND auth_user_role() = 'support_worker' AND locked_at IS NULL)
      OR auth_user_role() IN ('owner', 'team_leader', 'roster_coordinator')
    )
  );

CREATE POLICY worker_availability_delete ON worker_availability FOR DELETE
  USING (
    organization_id = auth_user_org_id()
    AND worker_id = auth.uid()
    AND auth_user_role() = 'support_worker'
    AND locked_at IS NULL
  );

CREATE POLICY public_holidays_select ON public_holidays FOR SELECT
  USING (
    organization_id IS NULL
    OR organization_id = auth_user_org_id()
  );

CREATE POLICY public_holidays_manage ON public_holidays FOR ALL
  USING (
    organization_id = auth_user_org_id()
    AND auth_user_role() IN ('owner', 'team_leader')
  );


-- Messaging module: channels, messages, voice, announcements

CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  channel_type TEXT NOT NULL CHECK (channel_type IN (
    'dm', 'group_dm', 'house_channel', 'role_channel', 'topic_channel', 'announcement'
  )),
  house_id UUID REFERENCES houses(id),
  is_post_only BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX idx_channels_organization_id ON channels(organization_id);
CREATE INDEX idx_channels_house_id ON channels(house_id);
CREATE INDEX idx_channels_channel_type ON channels(channel_type);
CREATE INDEX idx_channels_archived_at ON channels(archived_at);

CREATE TRIGGER channels_updated_at
  BEFORE UPDATE ON channels
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  notification_preference TEXT NOT NULL DEFAULT 'all' CHECK (
    notification_preference IN ('all', 'mentions', 'muted')
  ),
  UNIQUE (channel_id, user_id)
);

CREATE INDEX idx_channel_members_channel_id ON channel_members(channel_id);
CREATE INDEX idx_channel_members_user_id ON channel_members(user_id);
CREATE INDEX idx_channel_members_last_read_at ON channel_members(last_read_at);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  parent_message_id UUID REFERENCES messages(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  content_html TEXT,
  attachments JSONB NOT NULL DEFAULT '[]',
  reactions JSONB NOT NULL DEFAULT '{}',
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES profiles(id),
  ai_invoked BOOLEAN NOT NULL DEFAULT FALSE,
  shift_id UUID REFERENCES shifts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_organization_id ON messages(organization_id);
CREATE INDEX idx_messages_channel_id ON messages(channel_id);
CREATE INDEX idx_messages_parent_message_id ON messages(parent_message_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_shift_id ON messages(shift_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_deleted_at ON messages(deleted_at);
CREATE INDEX idx_messages_channel_created ON messages(channel_id, created_at DESC) WHERE deleted_at IS NULL;

CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE message_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, mentioned_user_id)
);

CREATE INDEX idx_message_mentions_message_id ON message_mentions(message_id);
CREATE INDEX idx_message_mentions_mentioned_user_id ON message_mentions(mentioned_user_id);
CREATE INDEX idx_message_mentions_read_at ON message_mentions(read_at);

CREATE TABLE voice_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL UNIQUE REFERENCES messages(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  duration_seconds INT,
  transcript TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_voice_messages_message_id ON voice_messages(message_id);

CREATE TRIGGER voice_messages_updated_at
  BEFORE UPDATE ON voice_messages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  channel_id UUID NOT NULL REFERENCES channels(id),
  message_id UUID NOT NULL REFERENCES messages(id),
  title TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'standard' CHECK (priority IN ('standard', 'urgent')),
  category TEXT,
  target_audience JSONB NOT NULL DEFAULT '{}',
  requires_acknowledgment BOOLEAN NOT NULL DEFAULT FALSE,
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_announcements_organization_id ON announcements(organization_id);
CREATE INDEX idx_announcements_channel_id ON announcements(channel_id);
CREATE INDEX idx_announcements_message_id ON announcements(message_id);
CREATE INDEX idx_announcements_pinned ON announcements(pinned) WHERE deleted_at IS NULL;
CREATE INDEX idx_announcements_scheduled_for ON announcements(scheduled_for);
CREATE INDEX idx_announcements_deleted_at ON announcements(deleted_at);

CREATE TRIGGER announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE announcement_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (announcement_id, user_id)
);

CREATE INDEX idx_announcement_acknowledgments_announcement_id ON announcement_acknowledgments(announcement_id);
CREATE INDEX idx_announcement_acknowledgments_user_id ON announcement_acknowledgments(user_id);

CREATE OR REPLACE FUNCTION sync_message_org()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT c.organization_id INTO NEW.organization_id
    FROM channels c
    WHERE c.id = NEW.channel_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_sync_org
  BEFORE INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION sync_message_org();

CREATE OR REPLACE FUNCTION user_is_channel_member(p_channel_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM channel_members cm
    WHERE cm.channel_id = p_channel_id AND cm.user_id = p_user_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE TRIGGER audit_channels
  AFTER INSERT OR UPDATE OR DELETE ON channels
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();

CREATE TRIGGER audit_messages
  AFTER INSERT OR UPDATE OR DELETE ON messages
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();

CREATE TRIGGER audit_announcements
  AFTER INSERT OR UPDATE OR DELETE ON announcements
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();

ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Channels
CREATE POLICY channels_select ON channels FOR SELECT
  USING (
    archived_at IS NULL
    AND organization_id = auth_user_org_id()
    AND (
      auth_user_role() IN ('owner', 'team_leader', 'roster_coordinator', 'read_only')
      OR user_is_channel_member(id)
    )
  );

CREATE POLICY channels_insert ON channels FOR INSERT
  WITH CHECK (
    organization_id = auth_user_org_id()
    AND auth_user_role() IN ('owner', 'team_leader', 'roster_coordinator', 'support_worker')
    AND (
      auth_user_role() != 'support_worker'
      OR channel_type IN ('dm', 'group_dm')
    )
  );

CREATE POLICY channels_update ON channels FOR UPDATE
  USING (
    organization_id = auth_user_org_id()
    AND auth_user_role() IN ('owner', 'team_leader', 'roster_coordinator')
  );

-- Channel members
CREATE POLICY channel_members_select ON channel_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM channels c
      WHERE c.id = channel_members.channel_id
        AND c.organization_id = auth_user_org_id()
        AND c.archived_at IS NULL
        AND user_is_channel_member(c.id)
    )
  );

CREATE POLICY channel_members_insert ON channel_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM channels c
      WHERE c.id = channel_members.channel_id
        AND c.organization_id = auth_user_org_id()
        AND (
          auth_user_role() IN ('owner', 'team_leader', 'roster_coordinator')
          OR (c.channel_type IN ('dm', 'group_dm') AND user_is_channel_member(c.id))
        )
    )
  );

CREATE POLICY channel_members_update ON channel_members FOR UPDATE
  USING (user_id = auth.uid());

-- Messages
CREATE POLICY messages_select ON messages FOR SELECT
  USING (
    deleted_at IS NULL
    AND organization_id = auth_user_org_id()
    AND user_is_channel_member(channel_id)
  );

CREATE POLICY messages_insert ON messages FOR INSERT
  WITH CHECK (
    organization_id = auth_user_org_id()
    AND user_id = auth.uid()
    AND user_is_channel_member(channel_id)
    AND NOT EXISTS (
      SELECT 1 FROM channels c
      WHERE c.id = messages.channel_id
        AND c.is_post_only = TRUE
        AND auth_user_role() = 'support_worker'
    )
  );

CREATE POLICY messages_update ON messages FOR UPDATE
  USING (
    organization_id = auth_user_org_id()
    AND (
      user_id = auth.uid()
      OR auth_user_role() IN ('owner', 'team_leader')
    )
  );

-- Message mentions
CREATE POLICY message_mentions_select ON message_mentions FOR SELECT
  USING (
    mentioned_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_mentions.message_id
        AND m.organization_id = auth_user_org_id()
        AND user_is_channel_member(m.channel_id)
    )
  );

CREATE POLICY message_mentions_insert ON message_mentions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_mentions.message_id
        AND m.user_id = auth.uid()
        AND m.organization_id = auth_user_org_id()
    )
  );

CREATE POLICY message_mentions_update ON message_mentions FOR UPDATE
  USING (mentioned_user_id = auth.uid());

-- Voice messages
CREATE POLICY voice_messages_select ON voice_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = voice_messages.message_id
        AND m.deleted_at IS NULL
        AND m.organization_id = auth_user_org_id()
        AND user_is_channel_member(m.channel_id)
    )
  );

CREATE POLICY voice_messages_insert ON voice_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = voice_messages.message_id
        AND m.user_id = auth.uid()
        AND m.organization_id = auth_user_org_id()
    )
  );

-- Announcements
CREATE POLICY announcements_select ON announcements FOR SELECT
  USING (
    deleted_at IS NULL
    AND organization_id = auth_user_org_id()
    AND (
      auth_user_role() IN ('owner', 'team_leader', 'roster_coordinator', 'read_only')
      OR user_is_channel_member(channel_id)
    )
  );

CREATE POLICY announcements_insert ON announcements FOR INSERT
  WITH CHECK (
    organization_id = auth_user_org_id()
    AND auth_user_role() IN ('owner', 'team_leader', 'roster_coordinator')
  );

CREATE POLICY announcements_update ON announcements FOR UPDATE
  USING (
    deleted_at IS NULL
    AND organization_id = auth_user_org_id()
    AND auth_user_role() IN ('owner', 'team_leader', 'roster_coordinator')
  );

-- Announcement acknowledgments
CREATE POLICY announcement_acknowledgments_select ON announcement_acknowledgments FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM announcements a
      WHERE a.id = announcement_acknowledgments.announcement_id
        AND a.organization_id = auth_user_org_id()
        AND auth_user_role() IN ('owner', 'team_leader', 'roster_coordinator')
    )
  );

CREATE POLICY announcement_acknowledgments_insert ON announcement_acknowledgments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM announcements a
      WHERE a.id = announcement_acknowledgments.announcement_id
        AND a.deleted_at IS NULL
        AND a.organization_id = auth_user_org_id()
        AND user_is_channel_member(a.channel_id)
    )
  );


-- Reminders module

CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  created_by UUID NOT NULL REFERENCES profiles(id),
  assigned_to UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  due_at TIMESTAMPTZ NOT NULL,
  recurrence_rule TEXT,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'completed', 'snoozed', 'cancelled'
  )),
  house_id UUID REFERENCES houses(id),
  related_entity_type TEXT,
  related_entity_id UUID,
  completed_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_reminders_organization_id ON reminders(organization_id);
CREATE INDEX idx_reminders_created_by ON reminders(created_by);
CREATE INDEX idx_reminders_assigned_to ON reminders(assigned_to);
CREATE INDEX idx_reminders_due_at ON reminders(due_at);
CREATE INDEX idx_reminders_status ON reminders(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_reminders_house_id ON reminders(house_id);
CREATE INDEX idx_reminders_related_entity ON reminders(related_entity_type, related_entity_id);
CREATE INDEX idx_reminders_deleted_at ON reminders(deleted_at);

CREATE TRIGGER reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER audit_reminders
  AFTER INSERT OR UPDATE OR DELETE ON reminders
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY reminders_select ON reminders FOR SELECT
  USING (
    deleted_at IS NULL
    AND organization_id = auth_user_org_id()
    AND (
      created_by = auth.uid()
      OR assigned_to = auth.uid()
      OR (
        auth_user_role() IN ('owner', 'team_leader', 'roster_coordinator', 'read_only')
        AND (
          auth_user_role() = 'owner'
          OR house_id IS NULL
          OR house_id = ANY(auth_user_houses())
        )
      )
    )
  );

CREATE POLICY reminders_insert ON reminders FOR INSERT
  WITH CHECK (
    organization_id = auth_user_org_id()
    AND created_by = auth.uid()
    AND (
      auth_user_role() IN ('owner', 'team_leader', 'roster_coordinator', 'support_worker')
    )
  );

CREATE POLICY reminders_update ON reminders FOR UPDATE
  USING (
    deleted_at IS NULL
    AND organization_id = auth_user_org_id()
    AND (
      created_by = auth.uid()
      OR assigned_to = auth.uid()
      OR auth_user_role() IN ('owner', 'team_leader')
    )
  );


-- In-app notifications

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  type TEXT NOT NULL CHECK (type IN (
    'countdown_threshold', 'reminder_due', 'mention', 'message_in_channel',
    'shift_offered', 'shift_swap_request', 'compliance_pending', 'ai_nudge'
  )),
  title TEXT NOT NULL,
  body TEXT,
  action_url TEXT,
  related_entity_type TEXT,
  related_entity_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_related_entity ON notifications(related_entity_type, related_entity_id);

CREATE TRIGGER audit_notifications
  AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select ON notifications FOR SELECT
  USING (
    user_id = auth.uid()
    AND organization_id = auth_user_org_id()
  );

CREATE POLICY notifications_update ON notifications FOR UPDATE
  USING (
    user_id = auth.uid()
    AND organization_id = auth_user_org_id()
  );

-- Service role / edge functions insert via SECURITY DEFINER helpers in app layer;
-- authenticated users cannot forge notifications for other users
CREATE POLICY notifications_insert ON notifications FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id = auth_user_org_id()
  );


-- Storage bucket for message attachments and voice notes

INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY message_attachments_select ON storage.objects FOR SELECT
  USING (bucket_id = 'message-attachments');

CREATE POLICY message_attachments_insert ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY message_attachments_delete ON storage.objects FOR DELETE
  USING (
    bucket_id = 'message-attachments'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- Link topic channels to roster shifts (one channel per shift)

ALTER TABLE channels ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shifts(id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_channels_shift_id ON channels(shift_id) WHERE shift_id IS NOT NULL;


-- Restore API role privileges (required after manual schema reset)

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO postgres, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO postgres, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;

-- Onboarding: new owners can create their organisation (anon key path)
CREATE POLICY org_insert ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id IS NOT NULL
        AND p.deleted_at IS NULL
    )
  );

