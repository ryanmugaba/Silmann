-- Link topic channels to roster shifts (one channel per shift)

ALTER TABLE channels ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shifts(id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_channels_shift_id ON channels(shift_id) WHERE shift_id IS NOT NULL;
