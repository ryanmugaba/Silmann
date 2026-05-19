-- Stripe subscription billing (one subscription per organisation)

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'incomplete'
    CHECK (
      subscription_status IN (
        'incomplete',
        'trialing',
        'active',
        'past_due',
        'canceled',
        'unpaid'
      )
    ),
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer_id
  ON organizations(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_subscription_status
  ON organizations(subscription_status);

COMMENT ON COLUMN organizations.subscription_status IS
  'Stripe subscription state; active or trialing grants app access.';
