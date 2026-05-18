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
