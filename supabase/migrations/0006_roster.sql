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
