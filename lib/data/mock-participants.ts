import type { ParticipantListItem } from "@/lib/data/participants-queries";
import type {
  AuditLogRow,
  HouseRow,
  ParticipantMedicationRow,
  ParticipantRow,
  ProfileRow,
  RuleRow,
} from "@/types/database";

export const MOCK_ORG_ID = "00000000-0000-4000-8000-000000000001";
export const MOCK_HOUSE_PARRAMATTA = "10000000-0000-4000-8000-000000000001";
export const MOCK_HOUSE_BLACKTOWN = "10000000-0000-4000-8000-000000000002";

export const MOCK_HOUSES: Pick<HouseRow, "id" | "name">[] = [
  { id: MOCK_HOUSE_PARRAMATTA, name: "Parramatta SIL" },
  { id: MOCK_HOUSE_BLACKTOWN, name: "Blacktown SIL" },
];

const now = new Date().toISOString();

function baseParticipant(
  overrides: Partial<ParticipantRow> & Pick<ParticipantRow, "id" | "full_name" | "ndis_number" | "house_id">
): ParticipantRow {
  return {
    organization_id: MOCK_ORG_ID,
    preferred_name: null,
    date_of_birth: "1998-04-12",
    gender: null,
    primary_language: "English",
    secondary_languages: [],
    cultural_background: null,
    photo_url: null,
    emergency_contacts: [
      {
        name: "Jane Smith",
        relationship: "Mother",
        phone: "0400 000 001",
        email: "",
      },
    ],
    gp_details: { name: "Dr Patel", clinic: "Westmead Medical", phone: "02 9000 0000" },
    plan_start_date: "2025-07-01",
    plan_end_date: "2026-06-30",
    plan_total_budget: 185000,
    plan_budget_by_category: { core: 120000, capacity: 45000, capital: 20000 },
    goals: [
      { title: "Daily living skills", description: "Build independence in meal preparation" },
    ],
    dietary: { notes: "Soft foods preferred in evenings" },
    preferences: {},
    has_vehicle_access: true,
    mobility_aids: [],
    communication_methods: ["Verbal", "Picture cards"],
    behaviour_support_plan_url: null,
    restrictive_practice_register: null,
    status: "active",
    created_at: now,
    updated_at: now,
    deleted_at: null,
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}

export const MOCK_PARTICIPANTS: ParticipantListItem[] = [
  {
    ...baseParticipant({
      id: "20000000-0000-4000-8000-000000000001",
      full_name: "Alex Nguyen",
      preferred_name: "Alex",
      ndis_number: "43012345678",
      house_id: MOCK_HOUSE_PARRAMATTA,
      has_vehicle_access: false,
      plan_end_date: "2026-03-15",
    }),
    house_name: "Parramatta SIL",
  },
  {
    ...baseParticipant({
      id: "20000000-0000-4000-8000-000000000002",
      full_name: "Jordan Mitchell",
      ndis_number: "43098765432",
      house_id: MOCK_HOUSE_PARRAMATTA,
      gender: "female",
      plan_end_date: "2026-09-30",
    }),
    house_name: "Parramatta SIL",
  },
  {
    ...baseParticipant({
      id: "20000000-0000-4000-8000-000000000003",
      full_name: "Samira Hassan",
      ndis_number: "43055512345",
      house_id: MOCK_HOUSE_PARRAMATTA,
      primary_language: "Arabic",
      plan_end_date: "2025-12-01",
    }),
    house_name: "Parramatta SIL",
  },
  {
    ...baseParticipant({
      id: "20000000-0000-4000-8000-000000000004",
      full_name: "Chris O'Connor",
      ndis_number: "43011122233",
      house_id: MOCK_HOUSE_BLACKTOWN,
      has_vehicle_access: false,
    }),
    house_name: "Blacktown SIL",
  },
  {
    ...baseParticipant({
      id: "20000000-0000-4000-8000-000000000005",
      full_name: "Taylor Brooks",
      ndis_number: "43044455566",
      house_id: MOCK_HOUSE_BLACKTOWN,
      status: "inactive",
    }),
    house_name: "Blacktown SIL",
  },
  {
    ...baseParticipant({
      id: "20000000-0000-4000-8000-000000000006",
      full_name: "Riley Chen",
      ndis_number: "43077788899",
      house_id: MOCK_HOUSE_BLACKTOWN,
    }),
    house_name: "Blacktown SIL",
  },
];

export const MOCK_MEDICATIONS: ParticipantMedicationRow[] = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    organization_id: MOCK_ORG_ID,
    participant_id: "20000000-0000-4000-8000-000000000001",
    drug_name: "Paracetamol",
    strength: "500mg",
    form: "tablet",
    prescriber: "Dr Patel",
    script_date: "2025-01-10",
    expiry_date: "2026-01-10",
    indication: "Pain relief",
    max_dose_per_24h: "4g",
    min_interval_hours: 4,
    photo_url: null,
    storage_location: "Kitchen cupboard",
    stock_count: 20,
    type: "prn",
    webster_pak_pharmacy_name: null,
    webster_pak_collection_day: null,
    status: "active",
    created_at: now,
    updated_at: now,
    created_by: null,
    updated_by: null,
    deleted_at: null,
  },
];

export const MOCK_RULE_ROWS: RuleRow[] = [
  {
    id: "40000000-0000-4000-8000-000000000001",
    organization_id: MOCK_ORG_ID,
    entity_type: "participant",
    entity_id: "20000000-0000-4000-8000-000000000001",
    house_id: MOCK_HOUSE_PARRAMATTA,
    condition: {
      type: "participant_no_vehicle",
      shift_type: "community_access",
    },
    severity: "confirm",
    message: "Participant does not have vehicle access for community access shifts.",
    requires_reason: true,
    is_active: true,
    created_by: null,
    created_at: now,
    updated_at: now,
    updated_by: null,
    deleted_at: null,
  },
];

export const MOCK_WORKER_PROFILES: Pick<ProfileRow, "id" | "full_name">[] = [
  { id: "p1", full_name: "Sarah Chen" },
  { id: "p2", full_name: "James O'Brien" },
];

export const MOCK_AUDIT_LOGS: AuditLogRow[] = [];

export function getMockParticipantById(
  id: string
): ParticipantListItem | undefined {
  return MOCK_PARTICIPANTS.find((p) => p.id === id);
}
