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
