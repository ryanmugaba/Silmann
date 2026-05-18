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
