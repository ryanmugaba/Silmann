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
