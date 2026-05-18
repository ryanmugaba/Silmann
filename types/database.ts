export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrganizationRow = {
  id: string;
  name: string;
  abn: string | null;
  ndis_registration_number: string | null;
  logo_url: string | null;
  timezone: string;
  settings: Json;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ProfileRow = {
  id: string;
  organization_id: string | null;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: string;
  is_active: boolean;
  notification_preferences: Json;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type HouseRow = {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  max_residents: number | null;
  vehicle_info: Json | null;
  settings: Json;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
};

export type ParticipantRow = {
  id: string;
  organization_id: string;
  house_id: string;
  ndis_number: string;
  full_name: string;
  preferred_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  primary_language: string | null;
  secondary_languages: string[] | null;
  cultural_background: string | null;
  photo_url: string | null;
  emergency_contacts: Json | null;
  gp_details: Json | null;
  plan_start_date: string | null;
  plan_end_date: string | null;
  plan_total_budget: number | null;
  plan_budget_by_category: Json | null;
  goals: Json | null;
  dietary: Json | null;
  preferences: Json | null;
  has_vehicle_access: boolean;
  mobility_aids: string[] | null;
  communication_methods: string[] | null;
  behaviour_support_plan_url: string | null;
  restrictive_practice_register: Json | null;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
};

export type ParticipantMedicationRow = {
  id: string;
  organization_id: string;
  participant_id: string;
  drug_name: string;
  strength: string | null;
  form: string | null;
  prescriber: string | null;
  script_date: string | null;
  expiry_date: string | null;
  indication: string | null;
  max_dose_per_24h: string | null;
  min_interval_hours: number | null;
  photo_url: string | null;
  storage_location: string | null;
  stock_count: number | null;
  type: string;
  webster_pak_pharmacy_name: string | null;
  webster_pak_collection_day: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
};

export type PrnAdministrationLogRow = {
  id: string;
  organization_id: string;
  participant_id: string;
  medication_id: string;
  administered_by: string;
  administered_at: string;
  reason: string;
  dose_given: string;
  effect_30min_followup: string | null;
  notes: string | null;
  created_at: string;
};

export type ShiftRow = {
  id: string;
  organization_id: string;
  house_id: string;
  participant_id: string | null;
  worker_id: string | null;
  start_at: string;
  end_at: string;
  shift_type: string;
  status: string;
  ratio: string;
  notes: string | null;
  schads_classification?: Json;
  clock_in_at?: string | null;
  clock_out_at?: string | null;
  override_rule_ids?: string[] | null;
  override_reasons?: Json[] | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by?: string | null;
  updated_by?: string | null;
};

export type ShiftSwapRequestRow = {
  id: string;
  organization_id: string;
  shift_id: string;
  requesting_worker_id: string;
  target_worker_id: string | null;
  reason: string | null;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkerRow = {
  id: string;
  organization_id: string;
  worker_profile_id: string;
  employment_type: string | null;
  schads_level: number | null;
  visa_type: string | null;
  visa_max_hours_per_fortnight: number | null;
  languages: string[] | null;
  certifications_summary: Json;
  preferences: Json;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
};

export type ComplianceDocumentRow = {
  id: string;
  organization_id: string;
  worker_id: string;
  doc_type: string;
  doc_name: string;
  file_url: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  issuing_body: string | null;
  document_number: string | null;
  status: string;
  rejected_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
};

export type WorkerAvailabilityRow = {
  id: string;
  organization_id: string;
  worker_id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  notes: string | null;
  submitted_at: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  organization_id: string;
  type: string;
  title: string;
  body: string | null;
  action_url: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  read_at: string | null;
  created_at: string;
};

export type PublicHolidayRow = {
  id: string;
  organization_id: string;
  date: string;
  name: string;
  state: string | null;
  created_at: string;
  updated_at: string;
};

export type ChannelRow = {
  id: string;
  organization_id: string;
  name: string;
  channel_type: string;
  house_id: string | null;
  shift_id: string | null;
  is_post_only: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type MessageMentionRow = {
  id: string;
  message_id: string;
  mentioned_user_id: string;
  read_at: string | null;
  created_at: string;
};

export type VoiceMessageRow = {
  id: string;
  message_id: string;
  audio_url: string;
  duration_seconds: number | null;
  transcript: string | null;
  created_at: string;
  updated_at: string;
};

export type ChannelMemberRow = {
  id: string;
  channel_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string | null;
  notification_preference: string;
};

export type MessageRow = {
  id: string;
  organization_id: string;
  channel_id: string;
  parent_message_id: string | null;
  user_id: string;
  content: string;
  content_html: string | null;
  attachments: Json;
  reactions: Json;
  edited_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  ai_invoked: boolean;
  shift_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AnnouncementRow = {
  id: string;
  organization_id: string;
  channel_id: string;
  message_id: string;
  title: string;
  priority: string;
  category: string | null;
  target_audience: Json;
  requires_acknowledgment: boolean;
  pinned: boolean;
  expires_at: string | null;
  scheduled_for: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type AnnouncementAcknowledgmentRow = {
  id: string;
  announcement_id: string;
  user_id: string;
  acknowledged_at: string;
};

export type ReminderRow = {
  id: string;
  organization_id: string;
  created_by: string;
  assigned_to: string | null;
  title: string;
  description: string | null;
  due_at: string;
  recurrence_rule: string | null;
  category: string | null;
  status: string;
  house_id: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  completed_at: string | null;
  snoozed_until: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CountdownEntityRow = {
  id: string;
  organization_id: string;
  entity_type: string;
  entity_id: string;
  label: string;
  expiry_date: string;
  thresholds: number[];
  severity_per_threshold: string[];
  notify_roles: string[];
  notify_users: string[] | null;
  house_id: string | null;
  metadata: Json;
  last_notified_at: string | null;
  status: string;
  resolution: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
};

export type CountdownEventRow = {
  id: string;
  countdown_entity_id: string;
  threshold_days: number;
  severity: string;
  fired_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
};

export type RuleRow = {
  id: string;
  organization_id: string;
  entity_type: string;
  entity_id: string;
  house_id: string | null;
  condition: Json;
  severity: string;
  message: string;
  requires_reason: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
};

export type RuleOverrideRow = {
  id: string;
  organization_id: string;
  rule_id: string;
  action_context: Json;
  override_reason: string;
  overridden_by: string;
  overridden_at: string;
};

export type InvitationRow = {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  invited_by: string | null;
  token: string;
  house_ids: string[] | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

export type HouseAssignmentRow = {
  id: string;
  user_id: string;
  house_id: string;
  assigned_at: string;
  assigned_by: string | null;
};

export type PermissionRow = {
  id: string;
  organization_id: string;
  role_name: string;
  permission_key: string;
  granted: boolean;
  created_at: string;
  updated_at: string;
};

export type AuditLogRow = {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_state: Json | null;
  after_state: Json | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: OrganizationRow;
        Insert: Partial<OrganizationRow> & { name: string };
        Update: Partial<OrganizationRow>;
        Relationships: [];
      };
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string; email: string };
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      houses: {
        Row: HouseRow;
        Insert: Partial<HouseRow> & { organization_id: string; name: string };
        Update: Partial<HouseRow>;
        Relationships: [];
      };
      participants: {
        Row: ParticipantRow;
        Insert: Partial<ParticipantRow> & {
          organization_id: string;
          house_id: string;
          ndis_number: string;
          full_name: string;
        };
        Update: Partial<ParticipantRow>;
        Relationships: [];
      };
      participant_medications: {
        Row: ParticipantMedicationRow;
        Insert: Partial<ParticipantMedicationRow> & {
          participant_id: string;
          drug_name: string;
          type: string;
        };
        Update: Partial<ParticipantMedicationRow>;
        Relationships: [];
      };
      prn_administration_log: {
        Row: PrnAdministrationLogRow;
        Insert: Partial<PrnAdministrationLogRow> & {
          participant_id: string;
          medication_id: string;
          administered_by: string;
          reason: string;
          dose_given: string;
        };
        Update: Partial<PrnAdministrationLogRow>;
        Relationships: [];
      };
      shifts: {
        Row: ShiftRow;
        Insert: Partial<ShiftRow> & {
          organization_id: string;
          house_id: string;
          start_at: string;
          end_at: string;
        };
        Update: Partial<ShiftRow>;
        Relationships: [];
      };
      shift_swap_requests: {
        Row: ShiftSwapRequestRow;
        Insert: Partial<ShiftSwapRequestRow> & {
          organization_id: string;
          shift_id: string;
          requesting_worker_id: string;
        };
        Update: Partial<ShiftSwapRequestRow>;
        Relationships: [];
      };
      workers: {
        Row: WorkerRow;
        Insert: Partial<WorkerRow> & {
          organization_id: string;
          worker_profile_id: string;
        };
        Update: Partial<WorkerRow>;
        Relationships: [];
      };
      compliance_documents: {
        Row: ComplianceDocumentRow;
        Insert: Partial<ComplianceDocumentRow> & {
          organization_id: string;
          worker_id: string;
          doc_type: string;
          doc_name: string;
        };
        Update: Partial<ComplianceDocumentRow>;
        Relationships: [];
      };
      worker_availability: {
        Row: WorkerAvailabilityRow;
        Insert: Partial<WorkerAvailabilityRow> & {
          organization_id: string;
          worker_id: string;
          date: string;
          status: string;
        };
        Update: Partial<WorkerAvailabilityRow>;
        Relationships: [];
      };
      notifications: {
        Row: NotificationRow;
        Insert: Partial<NotificationRow> & {
          user_id: string;
          organization_id: string;
          type: string;
          title: string;
        };
        Update: Partial<NotificationRow>;
        Relationships: [];
      };
      channels: {
        Row: ChannelRow;
        Insert: Partial<ChannelRow> & {
          organization_id: string;
          name: string;
          channel_type: string;
        };
        Update: Partial<ChannelRow>;
        Relationships: [];
      };
      channel_members: {
        Row: ChannelMemberRow;
        Insert: Partial<ChannelMemberRow> & {
          channel_id: string;
          user_id: string;
        };
        Update: Partial<ChannelMemberRow>;
        Relationships: [];
      };
      messages: {
        Row: MessageRow;
        Insert: Partial<MessageRow> & {
          organization_id: string;
          channel_id: string;
          user_id: string;
          content: string;
        };
        Update: Partial<MessageRow>;
        Relationships: [];
      };
      message_mentions: {
        Row: MessageMentionRow;
        Insert: Partial<MessageMentionRow> & {
          message_id: string;
          mentioned_user_id: string;
        };
        Update: Partial<MessageMentionRow>;
        Relationships: [];
      };
      voice_messages: {
        Row: VoiceMessageRow;
        Insert: Partial<VoiceMessageRow> & {
          message_id: string;
          audio_url: string;
        };
        Update: Partial<VoiceMessageRow>;
        Relationships: [];
      };
      announcements: {
        Row: AnnouncementRow;
        Insert: Partial<AnnouncementRow> & {
          organization_id: string;
          channel_id: string;
          message_id: string;
          title: string;
        };
        Update: Partial<AnnouncementRow>;
        Relationships: [];
      };
      announcement_acknowledgments: {
        Row: AnnouncementAcknowledgmentRow;
        Insert: Partial<AnnouncementAcknowledgmentRow> & {
          announcement_id: string;
          user_id: string;
        };
        Update: Partial<AnnouncementAcknowledgmentRow>;
        Relationships: [];
      };
      reminders: {
        Row: ReminderRow;
        Insert: Partial<ReminderRow> & {
          organization_id: string;
          created_by: string;
          title: string;
          due_at: string;
        };
        Update: Partial<ReminderRow>;
        Relationships: [];
      };
      public_holidays: {
        Row: PublicHolidayRow;
        Insert: Partial<PublicHolidayRow> & {
          organization_id: string;
          date: string;
          name: string;
        };
        Update: Partial<PublicHolidayRow>;
        Relationships: [];
      };
      countdown_entities: {
        Row: CountdownEntityRow;
        Insert: Partial<CountdownEntityRow> & {
          organization_id: string;
          entity_type: string;
          entity_id: string;
          label: string;
          expiry_date: string;
        };
        Update: Partial<CountdownEntityRow>;
        Relationships: [];
      };
      countdown_events: {
        Row: CountdownEventRow;
        Insert: Partial<CountdownEventRow> & {
          countdown_entity_id: string;
          threshold_days: number;
          severity: string;
        };
        Update: Partial<CountdownEventRow>;
        Relationships: [];
      };
      rules: {
        Row: RuleRow;
        Insert: Partial<RuleRow> & {
          organization_id: string;
          entity_type: string;
          entity_id: string;
          condition: Json;
          severity: string;
          message: string;
        };
        Update: Partial<RuleRow>;
        Relationships: [];
      };
      rule_overrides: {
        Row: RuleOverrideRow;
        Insert: Partial<RuleOverrideRow> & {
          organization_id: string;
          rule_id: string;
          action_context: Json;
          override_reason: string;
          overridden_by: string;
        };
        Update: Partial<RuleOverrideRow>;
        Relationships: [];
      };
      invitations: {
        Row: InvitationRow;
        Insert: Partial<InvitationRow> & {
          organization_id: string;
          email: string;
          role: string;
          token: string;
          expires_at: string;
        };
        Update: Partial<InvitationRow>;
        Relationships: [];
      };
      house_assignments: {
        Row: HouseAssignmentRow;
        Insert: Partial<HouseAssignmentRow> & {
          user_id: string;
          house_id: string;
        };
        Update: Partial<HouseAssignmentRow>;
        Relationships: [];
      };
      permissions: {
        Row: PermissionRow;
        Insert: Partial<PermissionRow> & {
          organization_id: string;
          role_name: string;
          permission_key: string;
        };
        Update: Partial<PermissionRow>;
        Relationships: [];
      };
      audit_log: {
        Row: AuditLogRow;
        Insert: Partial<AuditLogRow> & { action: string; entity_type: string };
        Update: Partial<AuditLogRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type OrganizationInsert = Database["public"]["Tables"]["organizations"]["Insert"];
