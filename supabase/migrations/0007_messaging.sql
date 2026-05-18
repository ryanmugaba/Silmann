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
