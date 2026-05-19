-- Allow notice-board posters to insert messages on announcement channels
-- (membership is synced after publish; poster must not be blocked)

DROP POLICY IF EXISTS messages_insert ON messages;

CREATE POLICY messages_insert ON messages FOR INSERT
  WITH CHECK (
    organization_id = auth_user_org_id()
    AND user_id = auth.uid()
    AND (
      user_is_channel_member(channel_id)
      OR (
        EXISTS (
          SELECT 1 FROM channels c
          WHERE c.id = messages.channel_id
            AND c.organization_id = auth_user_org_id()
            AND c.channel_type = 'announcement'
            AND c.archived_at IS NULL
        )
        AND auth_user_role() IN ('owner', 'team_leader', 'roster_coordinator')
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM channels c
      WHERE c.id = messages.channel_id
        AND c.is_post_only = TRUE
        AND auth_user_role() = 'support_worker'
    )
  );
