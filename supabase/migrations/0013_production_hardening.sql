-- Production hardening: close invitation RLS leak and allow scoped audit inserts.

DROP POLICY IF EXISTS invitations_select ON invitations;
CREATE POLICY invitations_select ON invitations FOR SELECT
  TO authenticated
  USING (organization_id = auth_user_org_id());

DROP POLICY IF EXISTS audit_log_insert ON audit_log;
CREATE POLICY audit_log_insert ON audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = auth_user_org_id()
    AND user_id = auth.uid()
  );
