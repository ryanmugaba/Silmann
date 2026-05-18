-- Workers module: profile extension and compliance documents

CREATE TABLE workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  worker_profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  employment_type TEXT CHECK (employment_type IN ('casual', 'part_time', 'full_time')),
  schads_level INT,
  visa_type TEXT,
  visa_max_hours_per_fortnight INT,
  bank_details_encrypted JSONB,
  tax_file_number_encrypted TEXT,
  super_fund JSONB NOT NULL DEFAULT '{}',
  languages TEXT[] DEFAULT '{}',
  certifications_summary JSONB NOT NULL DEFAULT '{}',
  vehicle_info JSONB NOT NULL DEFAULT '{}',
  preferences JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived', 'onboarding')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_workers_organization_id ON workers(organization_id);
CREATE INDEX idx_workers_worker_profile_id ON workers(worker_profile_id);
CREATE INDEX idx_workers_status ON workers(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_workers_deleted_at ON workers(deleted_at);

CREATE TRIGGER workers_updated_at
  BEFORE UPDATE ON workers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE compliance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  worker_id UUID NOT NULL REFERENCES workers(id),
  doc_type TEXT NOT NULL CHECK (doc_type IN (
    'ndis_worker_screening', 'first_aid_cpr', 'wwcc', 'drivers_license',
    'right_to_work', 'vaccination', 'vehicle_insurance', 'manual_handling',
    'peg_feeding', 'mental_health_first_aid', 'other'
  )),
  doc_name TEXT NOT NULL,
  file_url TEXT,
  issued_date DATE,
  expiry_date DATE,
  issuing_body TEXT,
  document_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN (
    'pending_approval', 'approved', 'rejected', 'expired'
  )),
  rejected_reason TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_compliance_documents_organization_id ON compliance_documents(organization_id);
CREATE INDEX idx_compliance_documents_worker_id ON compliance_documents(worker_id);
CREATE INDEX idx_compliance_documents_doc_type ON compliance_documents(doc_type);
CREATE INDEX idx_compliance_documents_status ON compliance_documents(status);
CREATE INDEX idx_compliance_documents_expiry_date ON compliance_documents(expiry_date);
CREATE INDEX idx_compliance_documents_deleted_at ON compliance_documents(deleted_at);

CREATE TRIGGER compliance_documents_updated_at
  BEFORE UPDATE ON compliance_documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION sync_compliance_document_org()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT w.organization_id INTO NEW.organization_id
    FROM workers w
    WHERE w.id = NEW.worker_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER compliance_documents_sync_org
  BEFORE INSERT ON compliance_documents
  FOR EACH ROW EXECUTE FUNCTION sync_compliance_document_org();

CREATE TRIGGER audit_workers
  AFTER INSERT OR UPDATE OR DELETE ON workers
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();

CREATE TRIGGER audit_compliance_documents
  AFTER INSERT OR UPDATE OR DELETE ON compliance_documents
  FOR EACH ROW EXECUTE FUNCTION write_audit_log();

ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;

-- Workers: managers see house-scoped workers; workers see own record
CREATE POLICY workers_select ON workers FOR SELECT
  USING (
    deleted_at IS NULL
    AND organization_id = auth_user_org_id()
    AND (
      worker_profile_id = auth.uid()
      OR auth_user_role() IN ('owner', 'team_leader', 'roster_coordinator', 'read_only')
    )
  );

CREATE POLICY workers_insert ON workers FOR INSERT
  WITH CHECK (
    organization_id = auth_user_org_id()
    AND auth_user_role() IN ('owner', 'team_leader')
  );

CREATE POLICY workers_update_manager ON workers FOR UPDATE
  USING (
    deleted_at IS NULL
    AND organization_id = auth_user_org_id()
    AND auth_user_role() IN ('owner', 'team_leader')
  );

CREATE POLICY workers_update_self ON workers FOR UPDATE
  USING (
    deleted_at IS NULL
    AND worker_profile_id = auth.uid()
    AND auth_user_role() = 'support_worker'
  );

-- Compliance documents
CREATE POLICY compliance_documents_select ON compliance_documents FOR SELECT
  USING (
    deleted_at IS NULL
    AND organization_id = auth_user_org_id()
    AND (
      EXISTS (
        SELECT 1 FROM workers w
        WHERE w.id = compliance_documents.worker_id
          AND w.worker_profile_id = auth.uid()
          AND w.deleted_at IS NULL
      )
      OR auth_user_role() IN ('owner', 'team_leader', 'roster_coordinator', 'read_only')
    )
  );

CREATE POLICY compliance_documents_insert ON compliance_documents FOR INSERT
  WITH CHECK (
    organization_id = auth_user_org_id()
    AND (
      (
        auth_user_role() = 'support_worker'
        AND EXISTS (
          SELECT 1 FROM workers w
          WHERE w.id = compliance_documents.worker_id
            AND w.worker_profile_id = auth.uid()
            AND w.deleted_at IS NULL
        )
      )
      OR auth_user_role() IN ('owner', 'team_leader')
    )
  );

CREATE POLICY compliance_documents_update_worker ON compliance_documents FOR UPDATE
  USING (
    deleted_at IS NULL
    AND organization_id = auth_user_org_id()
    AND status IN ('pending_approval', 'rejected', 'expired')
    AND EXISTS (
      SELECT 1 FROM workers w
      WHERE w.id = compliance_documents.worker_id
        AND w.worker_profile_id = auth.uid()
        AND w.deleted_at IS NULL
    )
  );

CREATE POLICY compliance_documents_update_manager ON compliance_documents FOR UPDATE
  USING (
    deleted_at IS NULL
    AND organization_id = auth_user_org_id()
    AND auth_user_role() IN ('owner', 'team_leader')
  );
