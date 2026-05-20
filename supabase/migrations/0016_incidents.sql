-- Incidents register for NDIS SIL operational and governance records

CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  house_id UUID REFERENCES houses(id),
  participant_id UUID REFERENCES participants(id),
  reported_by UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  incident_type TEXT NOT NULL DEFAULT 'other' CHECK (incident_type IN (
    'injury', 'behaviour', 'medication', 'property', 'restrictive_practice', 'other'
  )),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN (
    'low', 'medium', 'high', 'critical'
  )),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'investigating', 'closed'
  )),
  occurred_at TIMESTAMPTZ NOT NULL,
  immediate_actions TEXT,
  follow_up_notes TEXT,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_incidents_organization_id ON incidents(organization_id);
CREATE INDEX idx_incidents_house_id ON incidents(house_id);
CREATE INDEX idx_incidents_participant_id ON incidents(participant_id);
CREATE INDEX idx_incidents_status ON incidents(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_incidents_occurred_at ON incidents(occurred_at);
CREATE INDEX idx_incidents_deleted_at ON incidents(deleted_at);

CREATE TRIGGER incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER audit_incidents
  AFTER INSERT OR UPDATE OR DELETE ON incidents
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY incidents_select ON incidents FOR SELECT
  USING (
    deleted_at IS NULL
    AND organization_id = auth_user_org_id()
    AND (
      auth_user_role() IN ('owner', 'team_leader', 'roster_coordinator', 'read_only')
      AND (
        auth_user_role() = 'owner'
        OR house_id IS NULL
        OR house_id = ANY(auth_user_houses())
      )
    )
  );

CREATE POLICY incidents_insert ON incidents FOR INSERT
  WITH CHECK (
    organization_id = auth_user_org_id()
    AND created_by = auth.uid()
    AND reported_by = auth.uid()
    AND auth_user_role() IN ('owner', 'team_leader', 'roster_coordinator')
  );

CREATE POLICY incidents_update ON incidents FOR UPDATE
  USING (
    deleted_at IS NULL
    AND organization_id = auth_user_org_id()
    AND auth_user_role() IN ('owner', 'team_leader', 'roster_coordinator')
  );
