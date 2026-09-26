/**
 * Types de la base Supabase BuildOS (schéma `public`).
 * Générés depuis le projet puis condensés : à régénérer après chaque migration
 * (outil Supabase « generate_typescript_types » ou `supabase gen types typescript`).
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type AppRole = "founder" | "admin";
export type MemberRole = "owner" | "member" | "viewer";

export type ProfileRow = {
  id: string;
  email: string;
  name: string;
  app_role: AppRole;
  founder_role: string;
  tech_level: string;
  project_stage: string;
  goal: string;
  hours_per_week: number;
  onboarded: boolean;
  joined_club: boolean;
  plan: string;
  ai_quota_usd: number;
  suspended_at: string | null;
  suspended_reason: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectRow = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  emoji: string;
  kind: string;
  workspace_path: string;
  repo_path: string | null;
  base_branch: string;
  autonomy: string;
  integrations: Json;
  ai_model: string | null;
  ai_effort: string | null;
  context: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export type ProjectMemberRow = {
  project_id: string;
  user_id: string;
  role: MemberRole;
  invited_by: string | null;
  created_at: string;
};

export type ProjectInvitationRow = {
  id: string;
  project_id: string;
  email: string;
  role: MemberRole;
  invited_by: string | null;
  created_at: string;
  accepted_at: string | null;
};

export type TaskRow = {
  id: string;
  project_id: string;
  created_by: string | null;
  title: string;
  spec: string;
  type: string;
  priority: string;
  stage: string;
  status: string;
  position: number;
  autonomy: string | null;
  iteration: number;
  refined_spec: Json | null;
  plan: Json | null;
  answers: Json;
  build_result: Json | null;
  verify_result: Json | null;
  review: Json | null;
  integration: Json | null;
  feedback: Json;
  error: string | null;
  branch: string | null;
  workspace_path: string | null;
  session_id: string | null;
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
  ai_duration_ms: number;
  due_date: string | null;
  labels: Json;
  timings: Json;
  last_activity: string | null;
  started_at: string | null;
  completed_at: string | null;
  sim_owner: string | null;
  sim_heartbeat: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskEventRow = {
  id: number;
  task_id: string;
  project_id: string;
  ts: string;
  stage: string | null;
  kind: string;
  message: string;
  data: Json | null;
};

export type ArtifactRow = {
  id: string;
  task_id: string;
  project_id: string;
  kind: string;
  title: string;
  path: string | null;
  url: string | null;
  mime: string | null;
  size: number | null;
  content: string | null;
  created_at: string;
};

export type UserPreferencesRow = {
  user_id: string;
  settings: Json;
  agents: Json | null;
  routing: Json | null;
  strategy: string | null;
  updated_at: string;
};

export type ProjectBriefRow = {
  project_id: string;
  pitch: string;
  audience: string;
  problem: string;
  features: Json;
  constraints: string;
  app_type: string;
  created_at: string;
};

export type DeliverableRow = {
  id: string;
  project_id: string;
  kind: string;
  title: string;
  summary: string;
  status: string;
  version: number;
  content: string;
  format: string;
  updated_at: string;
};

export type ReleaseRow = {
  id: string;
  project_id: string;
  version: string;
  title: string;
  env: string;
  status: string;
  items: Json;
  checks: Json;
  url: string | null;
  reviewer: string | null;
  created_at: string;
};

export type AuditReportRow = {
  id: string;
  project_id: string;
  date: string;
  category: string;
  score: number;
  summary: string;
  findings: Json;
};

export type JourneyStepRow = {
  project_id: string;
  id: string;
  day: number;
  title: string;
  outcome: string;
  href: string;
  done: boolean;
};

export type AiUsageRow = {
  id: number;
  user_id: string | null;
  project_id: string | null;
  task_id: string | null;
  cost_usd: number;
  tokens: number;
  created_at: string;
};

export type ClubEventRow = {
  id: string;
  kind: string;
  title: string;
  description: string;
  starts_at: string;
  duration_min: number;
  host: string;
  price: number;
  seats: number;
  seats_taken: number;
  tags: string[];
  location: string;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type ClubEventRegistrationRow = { event_id: string; user_id: string; created_at: string };

export type ClubLabRow = {
  id: string;
  name: string;
  theme: string;
  cadence: string;
  members_count: number;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type ClubLabMemberRow = { lab_id: string; user_id: string; created_at: string };

export type ExpertRow = {
  id: string;
  name: string;
  initials: string;
  role: string;
  skills: string[];
  rate: number;
  rating: number;
  sessions: number;
  available: string;
  published: boolean;
  sort: number;
  created_at: string;
  updated_at: string;
};

export type ExpertBookingRow = {
  id: string;
  expert_id: string;
  user_id: string;
  slot: string;
  topic: string;
  shared: boolean;
  price: number;
  status: "requested" | "confirmed" | "cancelled";
  created_at: string;
};

export type ClubPostRow = {
  id: string;
  author_id: string | null;
  author_name: string;
  author_initials: string;
  author_role: string;
  kind: "build" | "question" | "win" | "feedback";
  content: string;
  project: string | null;
  likes_count: number;
  comments_count: number;
  hidden: boolean;
  hidden_reason: string | null;
  created_at: string;
};

export type ClubPostLikeRow = { post_id: string; user_id: string; created_at: string };

export type AdminAuditLogRow = {
  id: number;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Json;
  created_at: string;
};

/* ─────────── Retours des fonctions RPC ─────────── */

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  app_role: AppRole;
  plan: string;
  ai_quota_usd: number;
  suspended_at: string | null;
  suspended_reason: string | null;
  onboarded: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  projects_owned: number;
  projects_member: number;
  tasks_created: number;
  cost_month: number;
  cost_total: number;
};

export type AdminProjectRow = {
  id: string;
  name: string;
  emoji: string;
  archived: boolean;
  owner_id: string;
  owner_name: string | null;
  owner_email: string | null;
  members: number;
  tasks_total: number;
  tasks_running: number;
  tasks_waiting: number;
  tasks_failed: number;
  tasks_done: number;
  cost_total: number;
  last_activity: string | null;
  created_at: string;
};

export type AdminBookingRow = {
  id: string;
  expert_id: string;
  expert_name: string;
  user_id: string;
  user_name: string;
  user_email: string;
  slot: string;
  topic: string;
  shared: boolean;
  price: number;
  status: string;
  created_at: string;
};

export type InvitationForMeRow = {
  id: string;
  project_id: string;
  project_name: string;
  project_emoji: string;
  role: MemberRole;
  invited_by_name: string | null;
  created_at: string;
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" };
  public: {
    Tables: {
      profiles: Table<ProfileRow, "id">;
      projects: Table<ProjectRow, "id" | "owner_id" | "name">;
      project_members: Table<ProjectMemberRow, "project_id" | "user_id">;
      project_invitations: Table<ProjectInvitationRow, "project_id" | "email">;
      tasks: Table<TaskRow, "id" | "project_id" | "title">;
      task_events: Table<TaskEventRow, "id" | "task_id" | "project_id" | "kind">;
      artifacts: Table<ArtifactRow, "id" | "task_id" | "project_id" | "kind" | "title">;
      user_preferences: Table<UserPreferencesRow, never>;
      project_briefs: Table<ProjectBriefRow, "project_id">;
      deliverables: Table<DeliverableRow, "id" | "project_id" | "kind" | "title">;
      releases: Table<ReleaseRow, "id" | "project_id" | "version" | "title">;
      audit_reports: Table<AuditReportRow, "id" | "project_id" | "category">;
      journey_steps: Table<JourneyStepRow, "project_id" | "id" | "day" | "title">;
      ai_usage: Table<AiUsageRow, "cost_usd">;
      club_events: Table<ClubEventRow, "title" | "starts_at">;
      club_event_registrations: Table<ClubEventRegistrationRow, "event_id">;
      club_labs: Table<ClubLabRow, "name">;
      club_lab_members: Table<ClubLabMemberRow, "lab_id">;
      experts: Table<ExpertRow, "name">;
      expert_bookings: Table<ExpertBookingRow, "expert_id" | "slot">;
      club_posts: Table<ClubPostRow, "content">;
      club_post_likes: Table<ClubPostLikeRow, "post_id">;
      admin_audit_log: Table<AdminAuditLogRow, "action" | "target_type">;
    };
    Views: { [_ in never]: never };
    Functions: {
      accept_invitation: { Args: { invitation_id: string }; Returns: string };
      my_invitations: { Args: never; Returns: InvitationForMeRow[] };
      my_ai_usage: { Args: never; Returns: { month_cost_usd: number; quota_usd: number }[] };
      claim_task_lease: { Args: { task_id: string; owner: string; stale_seconds?: number }; Returns: boolean };
      renew_task_leases: { Args: { task_ids: string[]; owner: string }; Returns: number };
      admin_overview: { Args: never; Returns: Json };
      admin_list_users: { Args: never; Returns: AdminUserRow[] };
      admin_set_role: { Args: { target: string; new_role: AppRole }; Returns: undefined };
      admin_set_suspended: { Args: { target: string; suspend: boolean; reason?: string }; Returns: undefined };
      admin_set_quota: { Args: { target: string; quota: number; new_plan?: string }; Returns: undefined };
      admin_list_projects: { Args: never; Returns: AdminProjectRow[] };
      admin_cost_by_day: { Args: { days?: number }; Returns: { day: string; cost_usd: number; tokens: number }[] };
      admin_cancel_task: { Args: { task_id: string; reason?: string }; Returns: undefined };
      admin_moderate_post: { Args: { post_id: string; hide: boolean; reason?: string }; Returns: undefined };
      admin_event_registrations: { Args: { event_id: string }; Returns: { user_id: string; name: string; email: string; created_at: string }[] };
      admin_list_bookings: { Args: never; Returns: AdminBookingRow[] };
      admin_set_booking_status: { Args: { booking_id: string; new_status: string }; Returns: undefined };
    };
    Enums: { app_role: AppRole; member_role: MemberRole };
    CompositeTypes: { [_ in never]: never };
  };
};
