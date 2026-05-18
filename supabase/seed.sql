-- Silman demo seed (local development only)
-- Run via: npx supabase db reset
-- Demo login password for all accounts: DemoPass123!

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Constants ───────────────────────────────────────────────────────────────
-- Organization: Demo SIL Co
-- Houses: Parramatta, Blacktown

CREATE OR REPLACE FUNCTION seed_demo_auth_user(
  p_id UUID,
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    p_id,
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name, 'role', p_role),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    p_id,
    p_id,
    p_email,
    jsonb_build_object('sub', p_id::text, 'email', p_email),
    'email',
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  UPDATE profiles
  SET
    organization_id = 'a0000000-0000-4000-8000-000000000001',
    email = p_email,
    full_name = p_full_name,
    role = p_role,
    is_active = TRUE
  WHERE id = p_id;
END;
$$;

-- Organisation
INSERT INTO organizations (id, name, abn, ndis_registration_number, timezone, settings)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'Demo SIL Co',
  '12 345 678 901',
  'NDIS-REG-DEMO-001',
  'Australia/Sydney',
  '{"brand_color":"#2563eb","state":"NSW"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Houses
INSERT INTO houses (id, organization_id, name, address, suburb, state, postcode, max_residents)
VALUES
  (
    'b0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'Parramatta House',
    '42 George St',
    'Parramatta',
    'NSW',
    '2150',
    3
  ),
  (
    'b0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'Blacktown House',
    '15 Main St',
    'Blacktown',
    'NSW',
    '2148',
    3
  )
ON CONFLICT (id) DO NOTHING;

-- Channels
INSERT INTO channels (id, organization_id, name, channel_type, house_id, is_post_only)
VALUES
  (
    'c0000000-0000-4000-8000-000000000010',
    'a0000000-0000-4000-8000-000000000001',
    'Notice Board',
    'announcement',
    NULL,
    TRUE
  ),
  (
    'c0000000-0000-4000-8000-000000000011',
    'a0000000-0000-4000-8000-000000000001',
    'parramatta-house',
    'house_channel',
    'b0000000-0000-4000-8000-000000000001',
    FALSE
  ),
  (
    'c0000000-0000-4000-8000-000000000012',
    'a0000000-0000-4000-8000-000000000001',
    'blacktown-house',
    'house_channel',
    'b0000000-0000-4000-8000-000000000002',
    FALSE
  )
ON CONFLICT (id) DO NOTHING;

-- Demo auth users (password: DemoPass123!)
SELECT seed_demo_auth_user(
  'f0000001-0000-4000-8000-000000000001',
  'owner@demo.silman.app',
  'DemoPass123!',
  'Alex Morgan',
  'owner'
);
SELECT seed_demo_auth_user(
  'f0000002-0000-4000-8000-000000000002',
  'tl.parramatta@demo.silman.app',
  'DemoPass123!',
  'Riley Parramatta',
  'team_leader'
);
SELECT seed_demo_auth_user(
  'f0000003-0000-4000-8000-000000000003',
  'tl.blacktown@demo.silman.app',
  'DemoPass123!',
  'Casey Blacktown',
  'team_leader'
);
SELECT seed_demo_auth_user(
  'f0000004-0000-4000-8000-000000000004',
  'roster@demo.silman.app',
  'DemoPass123!',
  'Sam Coordinator',
  'roster_coordinator'
);
SELECT seed_demo_auth_user(
  'f0000005-0000-4000-8000-000000000005',
  'worker1@demo.silman.app',
  'DemoPass123!',
  'Sarah Chen',
  'support_worker'
);
SELECT seed_demo_auth_user(
  'f0000006-0000-4000-8000-000000000006',
  'worker2@demo.silman.app',
  'DemoPass123!',
  'James O''Brien',
  'support_worker'
);
SELECT seed_demo_auth_user(
  'f0000007-0000-4000-8000-000000000007',
  'worker3@demo.silman.app',
  'DemoPass123!',
  'Priya Sharma',
  'support_worker'
);
SELECT seed_demo_auth_user(
  'f0000008-0000-4000-8000-000000000008',
  'worker4@demo.silman.app',
  'DemoPass123!',
  'Marcus Webb',
  'support_worker'
);
SELECT seed_demo_auth_user(
  'f0000009-0000-4000-8000-000000000009',
  'worker5@demo.silman.app',
  'DemoPass123!',
  'Jordan Lee',
  'support_worker'
);
SELECT seed_demo_auth_user(
  'f000000a-0000-4000-8000-000000000010',
  'worker6@demo.silman.app',
  'DemoPass123!',
  'Mia Nguyen',
  'support_worker'
);

-- House assignments
INSERT INTO house_assignments (user_id, house_id, assigned_by)
VALUES
  ('f0000002-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'f0000001-0000-4000-8000-000000000001'),
  ('f0000003-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000002', 'f0000001-0000-4000-8000-000000000001'),
  ('f0000005-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000001', 'f0000001-0000-4000-8000-000000000001'),
  ('f0000006-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000001', 'f0000001-0000-4000-8000-000000000001'),
  ('f0000007-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000001', 'f0000001-0000-4000-8000-000000000001'),
  ('f0000008-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000002', 'f0000001-0000-4000-8000-000000000001'),
  ('f0000009-0000-4000-8000-000000000009', 'b0000000-0000-4000-8000-000000000001', 'f0000001-0000-4000-8000-000000000001'),
  ('f000000a-0000-4000-8000-000000000010', 'b0000000-0000-4000-8000-000000000002', 'f0000001-0000-4000-8000-000000000001')
ON CONFLICT (user_id, house_id) DO NOTHING;

-- Roster coordinator sees all houses (no house assignment = owner-style; coordinator gets org-wide via role)

-- Worker records
INSERT INTO workers (id, organization_id, worker_profile_id, employment_type, schads_level, languages, preferences, status, created_by)
VALUES
  ('w0000001-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'f0000005-0000-4000-8000-000000000005', 'part_time', 2, ARRAY['English', 'Mandarin'], '{"gender":"female"}'::jsonb, 'active', 'f0000001-0000-4000-8000-000000000001'),
  ('w0000002-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'f0000006-0000-4000-8000-000000000006', 'casual', 2, ARRAY['English'], '{"gender":"male"}'::jsonb, 'active', 'f0000001-0000-4000-8000-000000000001'),
  ('w0000003-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'f0000007-0000-4000-8000-000000000007', 'part_time', 3, ARRAY['English', 'Hindi'], '{"gender":"female"}'::jsonb, 'active', 'f0000001-0000-4000-8000-000000000001'),
  ('w0000004-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'f0000008-0000-4000-8000-000000000008', 'casual', 2, ARRAY['English'], '{"gender":"male"}'::jsonb, 'active', 'f0000001-0000-4000-8000-000000000001'),
  ('w0000005-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'f0000009-0000-4000-8000-000000000009', 'casual', 2, ARRAY['English'], '{"gender":"male"}'::jsonb, 'active', 'f0000001-0000-4000-8000-000000000001'),
  ('w0000006-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'f000000a-0000-4000-8000-000000000010', 'part_time', 3, ARRAY['English', 'Vietnamese'], '{"gender":"female"}'::jsonb, 'active', 'f0000001-0000-4000-8000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Participants (3 per house)
INSERT INTO participants (
  id, organization_id, house_id, ndis_number, full_name, preferred_name,
  date_of_birth, gender, primary_language, plan_start_date, plan_end_date,
  plan_total_budget, has_vehicle_access, status, created_by
) VALUES
  (
    '10000001-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000001',
    '430123456',
    'Marcus Chen',
    'Marcus',
    '1992-04-12',
    'male',
    'English',
    '2025-07-01',
    '2026-06-30',
    185000.00,
    FALSE,
    'active',
    'f0000001-0000-4000-8000-000000000001'
  ),
  (
    '10000002-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000001',
    '430234567',
    'Sofia Nguyen',
    'Sofia',
    '1988-11-03',
    'female',
    'English',
    '2025-07-01',
    '2026-06-30',
    210000.00,
    TRUE,
    'active',
    'f0000001-0000-4000-8000-000000000001'
  ),
  (
    '10000003-0000-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000001',
    '430345678',
    'David Walsh',
    'Dave',
    '1995-01-20',
    'male',
    'English',
    '2025-07-01',
    '2026-06-30',
    192000.00,
    TRUE,
    'active',
    'f0000001-0000-4000-8000-000000000001'
  ),
  (
    '10000004-0000-4000-8000-000000000004',
    'a0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000002',
    '430456789',
    'Aisha Rahman',
    'Aisha',
    '1990-08-15',
    'female',
    'English',
    '2025-07-01',
    '2026-06-30',
    178000.00,
    TRUE,
    'active',
    'f0000001-0000-4000-8000-000000000001'
  ),
  (
    '10000005-0000-4000-8000-000000000005',
    'a0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000002',
    '430567890',
    'Ethan Brooks',
    'Ethan',
    '1993-06-22',
    'male',
    'English',
    '2025-07-01',
    '2026-06-30',
    165000.00,
    TRUE,
    'active',
    'f0000001-0000-4000-8000-000000000001'
  ),
  (
    '10000006-0000-4000-8000-000000000006',
    'a0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000002',
    '430678901',
    'Emma Wilson',
    'Emma',
    '1991-02-28',
    'female',
    'English',
    '2025-07-01',
    '2026-06-30',
    201000.00,
    TRUE,
    'active',
    'f0000001-0000-4000-8000-000000000001'
  )
ON CONFLICT (id) DO NOTHING;

-- Medications
INSERT INTO participant_medications (
  id, organization_id, participant_id, drug_name, strength, form, type, status, indication, max_dose_per_24h, min_interval_hours
) VALUES
  ('m0000001-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', '10000001-0000-4000-8000-000000000001', 'Paracetamol', '500mg', 'tablet', 'prn', 'active', 'Pain / fever', '4g', 4),
  ('m0000002-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', '10000001-0000-4000-8000-000000000001', 'Sertraline', '50mg', 'tablet', 'webster_pak', 'active', 'Anxiety', NULL, NULL),
  ('m0000003-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', '10000002-0000-4000-8000-000000000002', 'Risperidone', '1mg', 'tablet', 'webster_pak', 'active', 'Behaviour support', NULL, NULL),
  ('m0000004-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', '10000002-0000-4000-8000-000000000002', 'Lorazepam', '1mg', 'tablet', 'prn', 'active', 'Agitation', '2mg', 6),
  ('m0000005-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', '10000004-0000-4000-8000-000000000004', 'Metformin', '500mg', 'tablet', 'webster_pak', 'active', 'Diabetes', NULL, NULL),
  ('m0000006-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', '10000006-0000-4000-8000-000000000006', 'Melatonin', '2mg', 'tablet', 'prn', 'active', 'Sleep', '4mg', 8)
ON CONFLICT (id) DO NOTHING;

-- Care / rostering rules
INSERT INTO rules (id, organization_id, entity_type, entity_id, house_id, condition, severity, message, is_active, created_by)
VALUES
  (
    'r0000001-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'participant',
    '10000001-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000001',
    '{"type":"participant_no_vehicle","shift_type":"community_access"}'::jsonb,
    'block',
    'Marcus does not have vehicle access — community access shifts require alternate transport.',
    TRUE,
    'f0000001-0000-4000-8000-000000000001'
  ),
  (
    'r0000002-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'participant',
    '10000002-0000-4000-8000-000000000002',
    'b0000000-0000-4000-8000-000000000001',
    '{"type":"worker_gender_restriction","not_gender":"male"}'::jsonb,
    'block',
    'Sofia requires female support workers for all shifts.',
    TRUE,
    'f0000001-0000-4000-8000-000000000001'
  ),
  (
    'r0000003-0000-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000001',
    'participant',
    '10000003-0000-4000-8000-000000000003',
    'b0000000-0000-4000-8000-000000000001',
    '{"type":"restricted_pairing","participant_id":"10000003-0000-4000-8000-000000000003","worker_id":"f0000009-0000-4000-8000-000000000009"}'::jsonb,
    'block',
    'Jordan Lee cannot be rostered with David Walsh (restricted pairing).',
    TRUE,
    'f0000001-0000-4000-8000-000000000001'
  )
ON CONFLICT (id) DO NOTHING;

-- Compliance documents (one nearing expiry per worker for countdown demo)
INSERT INTO compliance_documents (
  id, organization_id, worker_id, doc_type, doc_name, issued_date, expiry_date,
  issuing_body, status, approved_by, approved_at, created_by
)
SELECT
  gen_random_uuid(),
  'a0000000-0000-4000-8000-000000000001',
  w.id,
  'ndis_worker_screening',
  'NDIS Worker Screening Check',
  (CURRENT_DATE - INTERVAL '2 years')::date,
  (CURRENT_DATE + INTERVAL '12 days')::date,
  'NDIS Commission',
  'approved',
  'f0000001-0000-4000-8000-000000000001',
  NOW(),
  'f0000001-0000-4000-8000-000000000001'
FROM workers w
WHERE w.organization_id = 'a0000000-0000-4000-8000-000000000001';

-- Shifts: 2 weeks history + 1 week ahead (day + evening per house, some unfilled in future)
INSERT INTO shifts (
  organization_id, house_id, participant_id, worker_id,
  start_at, end_at, shift_type, status, ratio, created_by
)
SELECT
  'a0000000-0000-4000-8000-000000000001',
  CASE WHEN gs.slot % 2 = 0 THEN 'b0000000-0000-4000-8000-000000000001'::uuid ELSE 'b0000000-0000-4000-8000-000000000002'::uuid END,
  CASE
    WHEN gs.slot % 2 = 0 THEN (ARRAY[
      '10000001-0000-4000-8000-000000000001'::uuid,
      '10000002-0000-4000-8000-000000000002'::uuid,
      '10000003-0000-4000-8000-000000000003'::uuid
    ])[1 + (gs.day % 3)]
    ELSE (ARRAY[
      '10000004-0000-4000-8000-000000000004'::uuid,
      '10000005-0000-4000-8000-000000000005'::uuid,
      '10000006-0000-4000-8000-000000000006'::uuid
    ])[1 + (gs.day % 3)]
  END,
  CASE
    WHEN gs.day > 14 AND gs.day % 4 = 0 THEN NULL
    WHEN gs.slot % 2 = 0 THEN (ARRAY[
      'f0000005-0000-4000-8000-000000000005'::uuid,
      'f0000007-0000-4000-8000-000000000007'::uuid,
      'f0000006-0000-4000-8000-000000000006'::uuid
    ])[1 + (gs.day % 3)]
    ELSE (ARRAY[
      'f0000008-0000-4000-8000-000000000008'::uuid,
      'f000000a-0000-4000-8000-000000000010'::uuid,
      'f0000008-0000-4000-8000-000000000008'::uuid
    ])[1 + (gs.day % 3)]
  END,
  ((CURRENT_DATE + (gs.day - 14))::timestamp + (CASE WHEN gs.slot % 2 = 0 THEN 7 ELSE 15 END || ' hours')::interval) AT TIME ZONE 'Australia/Sydney',
  ((CURRENT_DATE + (gs.day - 14))::timestamp + (CASE WHEN gs.slot % 2 = 0 THEN 15 ELSE 23 END || ' hours')::interval) AT TIME ZONE 'Australia/Sydney',
  CASE WHEN gs.slot % 2 = 0 THEN 'day' ELSE 'evening' END,
  CASE
    WHEN gs.day > 14 AND gs.day % 4 = 0 THEN 'unfilled'
    ELSE 'confirmed'
  END,
  '1:1',
  'f0000001-0000-4000-8000-000000000001'
FROM (
  SELECT d AS day, s AS slot
  FROM generate_series(0, 20) AS d
  CROSS JOIN generate_series(0, 1) AS s
) AS gs;

-- Worker availability (next 14 days for all 6 support workers)
INSERT INTO worker_availability (
  organization_id, worker_id, date, start_time, end_time, status, submitted_at
)
SELECT
  'a0000000-0000-4000-8000-000000000001',
  w.profile_id,
  (CURRENT_DATE + d)::date,
  '06:00'::time,
  '22:00'::time,
  CASE WHEN (d + w.idx) % 5 = 0 THEN 'unavailable' WHEN (d + w.idx) % 3 = 0 THEN 'preferred' ELSE 'available' END,
  NOW()
FROM generate_series(0, 13) AS d
CROSS JOIN (
  VALUES
    (1, 'f0000005-0000-4000-8000-000000000005'::uuid),
    (2, 'f0000006-0000-4000-8000-000000000006'::uuid),
    (3, 'f0000007-0000-4000-8000-000000000007'::uuid),
    (4, 'f0000008-0000-4000-8000-000000000008'::uuid),
    (5, 'f0000009-0000-4000-8000-000000000009'::uuid),
    (6, 'f000000a-0000-4000-8000-000000000010'::uuid)
) AS w(idx, profile_id)
ON CONFLICT (worker_id, date, start_time, end_time) DO NOTHING;

-- Channel members (all demo users on notice board + house channels)
INSERT INTO channel_members (channel_id, user_id)
SELECT c.id, p.id
FROM channels c
CROSS JOIN profiles p
WHERE c.organization_id = 'a0000000-0000-4000-8000-000000000001'
  AND p.organization_id = 'a0000000-0000-4000-8000-000000000001'
  AND c.channel_type IN ('announcement', 'house_channel')
ON CONFLICT (channel_id, user_id) DO NOTHING;

-- Notice board
INSERT INTO messages (id, organization_id, channel_id, user_id, content)
VALUES
  (
    'd0000001-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000010',
    'f0000001-0000-4000-8000-000000000001',
    'Welcome to Demo SIL Co on Silman. Please review the updated medication administration policy before your next shift.'
  ),
  (
    'd0000002-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000010',
    'f0000002-0000-4000-8000-000000000002',
    'Parramatta House fire drill scheduled for next Wednesday at 10:00am. All workers on shift must participate.'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO announcements (
  id, organization_id, channel_id, message_id, title, priority, category,
  requires_acknowledgment, pinned, created_by
) VALUES
  (
    'e0000001-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000010',
    'd0000001-0000-4000-8000-000000000001',
    'Welcome to Silman',
    'standard',
    'General',
    TRUE,
    TRUE,
    'f0000001-0000-4000-8000-000000000001'
  ),
  (
    'e0000002-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000010',
    'd0000002-0000-4000-8000-000000000002',
    'Fire drill — Parramatta',
    'urgent',
    'Safety',
    TRUE,
    FALSE,
    'f0000002-0000-4000-8000-000000000002'
  )
ON CONFLICT (id) DO NOTHING;

-- Reminders
INSERT INTO reminders (
  organization_id, created_by, assigned_to, title, description, due_at, category, status, house_id
) VALUES
  (
    'a0000000-0000-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000001',
    'f0000004-0000-4000-8000-000000000004',
    'Review roster for next week',
    'Confirm all shifts are filled before Friday 5pm.',
    (date_trunc('day', NOW() AT TIME ZONE 'Australia/Sydney') + INTERVAL '1 day' + INTERVAL '17 hours') AT TIME ZONE 'Australia/Sydney',
    'Roster',
    'pending',
    NULL
  ),
  (
    'a0000000-0000-4000-8000-000000000001',
    'f0000002-0000-4000-8000-000000000002',
    'f0000002-0000-4000-8000-000000000002',
    'Submit Parramatta house report',
    'Monthly house summary due to owner.',
    (date_trunc('day', NOW() AT TIME ZONE 'Australia/Sydney') + INTERVAL '3 days' + INTERVAL '12 hours') AT TIME ZONE 'Australia/Sydney',
    'Admin',
    'pending',
    'b0000000-0000-4000-8000-000000000001'
  ),
  (
    'a0000000-0000-4000-8000-000000000001',
    'f0000001-0000-4000-8000-000000000001',
    'f0000005-0000-4000-8000-000000000005',
    'Renew first aid certificate',
    'Upload updated certificate to My compliance.',
    (date_trunc('day', NOW() AT TIME ZONE 'Australia/Sydney') + INTERVAL '12 days') AT TIME ZONE 'Australia/Sydney',
    'Compliance',
    'pending',
    NULL
  );

DROP FUNCTION IF EXISTS seed_demo_auth_user(UUID, TEXT, TEXT, TEXT, TEXT);

COMMENT ON TABLE organizations IS 'Demo seed: Demo SIL Co — login owner@demo.silman.app / DemoPass123!';
