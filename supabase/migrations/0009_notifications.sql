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
