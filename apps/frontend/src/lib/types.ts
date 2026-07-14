export type UserRole = "superadmin" | "admin" | "manager" | "collaborator";
export type CareerLevel = "L1" | "L2" | "L3" | "L4a" | "L4b";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  org_id: string;
  career_level: CareerLevel | null;
  job_title?: string | null;
  /** Reportes directos del usuario (para ocultar "Mi equipo" si es 0). */
  reports_count?: number;
  /** Lo provee el backend cuando el motor de assessment exista (B2-02/B2-03).
   * Si viene `false`, el SessionGate manda al onboarding. `undefined` = no
   * forzar (usuarios actuales no se ven afectados). */
  has_completed_onboarding?: boolean;
}

/** /api/v1/auth/me = User + org_name. */
export interface Me extends User {
  org_name: string;
}

/** Lo que las API routes de Next devuelven al cliente (sin refresh token). */
export interface AuthResult {
  user: User;
  accessToken: string;
}

export interface InviteInfo {
  email: string;
  role: UserRole;
  org_name: string;
  status: "pending" | "accepted" | "revoked" | "expired";
}

export interface Org {
  id: string;
  name: string;
  slug: string;
  tier: "A" | "B" | "C";
  country: string | null;
  billing_status: string;
  billing_cycle: string | null;
  licenses_total: number;
  licenses_used: number;
  is_active: boolean;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  career_level: CareerLevel | null;
  is_active: boolean;
  last_login_at: string | null;
  last_active_at: string | null;
  manager_id: string | null;
  created_at: string;
}

export interface PaginatedUsers {
  items: AdminUser[];
  total: number;
  page: number;
  page_size: number;
}

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

// ─────────────── Catálogo PMM (B2-06 / B2-09) ───────────────
// Nota: `CourseLevel` (L1..L6 del catálogo PMM) es distinto del `CareerLevel`
// del usuario (L1..L4b), para no colisionar con el enum de identity.

export interface CareerPath {
  id: string;
  code: "P1" | "P2" | "P3" | "P4" | "P5" | "P6";
  name: string;
  description: string | null;
  order_index: number;
}

export type CourseLevel = "L1" | "L2" | "L3" | "L4" | "L5" | "L6";
export type CompetencyCode = "C1" | "C2" | "C3" | "C4" | "C5";
export type CourseTrack =
  | "competency"
  | "foundation_ai"
  | "foundation_eth"
  | "foundation_specifics";

export interface Course {
  id: string;
  career_path_id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  hls_master_url: string | null;
  duration_seconds: number;
  career_level: CourseLevel;
  competency_code: CompetencyCode | null;
  track: CourseTrack;
  is_active: boolean;
}

export interface CourseFilters {
  level?: CourseLevel;
  competency?: CompetencyCode;
  track?: CourseTrack;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface CourseProgress {
  last_position_seconds: number;
  watch_pct: number;
  is_completed: boolean;
  completed_at: string | null;
}

export interface CourseDetail extends Course {
  progress: CourseProgress | null;
  pillar_code?: string | null;
}

export interface NextCourseResponse {
  next: Course | null;
}

export interface CourseProgressPayload {
  position_seconds: number;
  watch_pct: number;
}

// ─────────────── Manager & RRHH (B4-B) ───────────────
// career_level se tipa string|null (el enum de usuario ahora incluye L1..L6).

type PillarCodeKey = "P1" | "P2" | "P3" | "P4" | "P5" | "P6";

export interface Enrollment {
  id: string;
  user_id: string;
  career_path_id: string;
  career_path_code: PillarCodeKey;
  career_path_name: string;
  assigned_by_user_id: string | null;
  assigned_by_name: string | null;
  source: "manual" | "auto";
  is_active: boolean;
  enrolled_at: string;
  completed_at: string | null;
}

export interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  career_level: string | null;
  job_title: string | null;
  last_active_at: string | null;
  is_inactive: boolean;
  courses_in_progress: number;
  courses_completed: number;
  total_watch_minutes: number;
  active_enrollments: number;
}

export interface TeamResponse {
  items: TeamMember[];
  total: number;
  inactive_count: number;
}

export interface CourseProgressDetail {
  course_slug: string;
  course_title: string;
  career_level: string;
  competency_code: string | null;
  watch_pct: number;
  is_completed: boolean;
  last_played_at: string;
}

export interface TeamMemberPillarState {
  state?: string;
  state_label?: string;
  source?: ResultSource;
  suggested_next_step?: string | null;
  recaida_detected?: boolean;
}

export interface TeamMemberDetail extends TeamMember {
  enrollments: Enrollment[];
  courses_in_progress_list: CourseProgressDetail[];
  courses_completed_list: CourseProgressDetail[];
  pillar_completion_rate: Record<PillarCodeKey, number>;
  // Estados del assessment por pilar (manager ve estados, NO respuestas).
  assessment_states: Record<string, TeamMemberPillarState>;
}

export interface PillarMetric {
  completion_rate: number;
  active_users: number;
  total_courses_started: number;
}

export interface TopPerformer {
  user_id: string;
  full_name: string;
  courses_completed: number;
}

export interface OrgMetrics {
  total_licenses: number;
  active_licenses: number;
  adoption_rate: number;
  avg_watch_minutes_per_user: number;
  total_courses_completed: number;
  completion_rate_global: number;
  by_pillar: Record<PillarCodeKey, PillarMetric>;
  by_career_level: Record<string, number>;
  top_performers: TopPerformer[];
  inactive_users_count: number;
}

// ─────────────── Home colaborador (B3-04) ───────────────

export interface HomeNextStep {
  course_id: string;
  course_slug: string;
  course_title: string;
  pillar_code: PillarCodeKey;
  career_level: string;
  duration_seconds: number;
  watch_pct: number;
  last_played_at: string;
}

export interface HomeRecentActivity {
  course_id: string;
  course_slug: string;
  course_title: string;
  pillar_code: PillarCodeKey;
  is_completed: boolean;
  last_played_at: string;
  completed_at: string | null;
}

export interface HomeStats {
  courses_in_progress: number;
  courses_completed: number;
  total_watch_minutes: number;
  month_watch_minutes: number;
  streak_days: number;
}

export interface HomeDashboard {
  next_step: HomeNextStep | null;
  active_enrollments: Enrollment[];
  pillar_completion_rates: Record<PillarCodeKey, number>;
  recent_activity: HomeRecentActivity[];
  stats: HomeStats;
}

// ─────────────── Widgets dashboard v1 (B4-E) ───────────────

export interface StreakDay {
  date: string;
  minutes: number;
  has_activity: boolean;
}

export interface WeeklyMinutesBar {
  week_start: string;
  minutes: number;
}

export interface MeWidgets {
  streak: StreakDay[];
  weekly_minutes: WeeklyMinutesBar[];
}

export interface TeamActivityCell {
  user_id: string;
  user_full_name: string;
  date: string;
  minutes: number;
}

export interface InactivityBuckets {
  active: number;
  inactive_1_7d: number;
  inactive_8_14d: number;
  inactive_15_30d: number;
  inactive_gt_30d: number;
  never_active: number;
}

export interface ManagerWidgets {
  team_activity: TeamActivityCell[];
  inactivity_buckets: InactivityBuckets;
}

export interface AdoptionMonthPoint {
  month: string;
  active_users: number;
}

export interface OnboardingFunnel {
  invited: number;
  accepted: number;
  first_login: number;
  first_course: number;
  first_completion: number;
}

export interface MonthlyWatchPoint {
  month: string;
  minutes: number;
}

export interface OrgWidgets {
  adoption_curve: AdoptionMonthPoint[];
  onboarding_funnel: OnboardingFunnel;
  monthly_watch: MonthlyWatchPoint[];
}

export type TeamSort = "name" | "last_active" | "completion";

export interface TeamFilters {
  page?: number;
  page_size?: number;
  sort?: TeamSort;
  inactive_only?: boolean;
}

// ─────────────── Assessment engine (B2-02/B2-03) ───────────────

export type AssessmentPillarCode = "P1" | "P2" | "P3" | "P4" | "P5" | "P6A" | "P6B";
export type SessionKind = "onboarding_short" | "pillar_detail";
export type ResultSource = "preliminary" | "confirmed";
export type AssessmentResponseType =
  | "likert_1_5"
  | "likert_1_7"
  | "likert_0_4"
  | "multiple_choice";

export interface AssessmentItemOption {
  id: string;
  order_index: number;
  label: string;
  value: number;
}

export interface AssessmentItem {
  id: string;
  item_code: string;
  pillar_code: AssessmentPillarCode;
  sub_scale: string | null;
  sub_domain: string | null;
  response_type: AssessmentResponseType;
  scale_min: number | null;
  scale_max: number | null;
  prompt: string;
  order_index: number;
  options: AssessmentItemOption[] | null;
}

export interface AssessmentSession {
  id: string;
  kind: SessionKind;
  target_pillar: AssessmentPillarCode | null;
  status: "in_progress" | "completed" | "expired" | "abandoned";
  started_at: string;
  expires_at: string;
  completed_at: string | null;
  next_item: AssessmentItem | null;
  total_items: number;
  answered_items: number;
}

export interface PillarResult {
  pillar_code: AssessmentPillarCode;
  source: ResultSource;
  state_code: string;
  state_label: string;
  sub_scores: Record<string, unknown>;
  requires_user_confirmation: boolean;
  user_confirmed_at: string | null;
  recaida_detected: boolean;
  suggested_next_step: string | null;
  derived_at: string;
  next_retake_eligible_at: string;
}

export interface FinalizeResult {
  session_id: string;
  results: PillarResult[];
}

// ─────────────── Learning Units / Módulos (Fase 1, B-02) ───────────────
// Espejo de apps/backend/src/hg/modules/learning_units/schemas.py — solo el
// lado consumer (feed/detail/attempts/submit). El CMS admin es Fase 2.

export interface CitationOut {
  text: string;
  source: string;
  year: number;
  doi_or_url: string;
  tier: "meta_analysis" | "rct" | "observational" | "expert_opinion";
}

interface BlockBase {
  id: string;
  position: number;
  required: boolean;
}

export interface VideoBlock extends BlockBase {
  block_type: "video_intro" | "video_teaching" | "video_closing";
  video_url: string;
  poster_url: string | null;
  duration_seconds: number;
  subtitle_url: string | null;
  transcript_text: string | null;
  eyebrow_label: string | null;
}

export interface TextBlock extends BlockBase {
  block_type: "text_context" | "text_evidence" | "text_solution";
  variant: "context" | "evidence" | "solution";
  eyebrow: string;
  body: string;
  citation: CitationOut | null;
  applies_to: string[] | null;
  requires_evidence_block_id: string | null;
}

export interface QuizOptionOut {
  id: string;
  position: number;
  text: string;
}

interface QuizQuestionBase {
  id: string;
  position: number;
  prompt: string;
}

export interface QuizQuestionSingleChoice extends QuizQuestionBase {
  question_type: "single_choice";
  options: QuizOptionOut[];
}

export interface QuizQuestionMultipleChoice extends QuizQuestionBase {
  question_type: "multiple_choice";
  options: QuizOptionOut[];
  scoring: "all_or_nothing" | "partial";
}

export interface QuizQuestionTrueFalse extends QuizQuestionBase {
  question_type: "true_false";
  // correct_answer NO se expone acá — solo en el feedback post-submit.
}

export interface OrderingItemOut {
  id: string;
  text: string;
}

export interface QuizQuestionOrdering extends QuizQuestionBase {
  question_type: "ordering";
  items: OrderingItemOut[]; // shuffled por el backend, sin correct_position
}

export interface MatchingItemOut {
  /** No siempre es un UUID válido: los distractors llevan sufijo -L/-R
   * (ver router.py::_build_matching_items) para que nunca puedan enviarse
   * como un par real al submit — QuizMatching.tsx debe filtrarlos. */
  id: string;
  text: string;
}

export interface QuizQuestionMatching extends QuizQuestionBase {
  question_type: "matching";
  left_items: MatchingItemOut[];
  right_items: MatchingItemOut[];
}

export interface QuizQuestionFillBlank extends QuizQuestionBase {
  question_type: "fill_blank";
  blanks_count: number;
}

export type QuizQuestion =
  | QuizQuestionSingleChoice
  | QuizQuestionMultipleChoice
  | QuizQuestionTrueFalse
  | QuizQuestionOrdering
  | QuizQuestionMatching
  | QuizQuestionFillBlank;

export interface QuizBlock extends BlockBase {
  block_type: "quiz_recall";
  eyebrow: string;
  questions: QuizQuestion[];
}

export interface ReflectionBlock extends BlockBase {
  block_type: "reflection_write";
  eyebrow: string;
  prompt: string;
  min_chars: number;
  max_chars: number;
  example: string | null;
}

export type Block = VideoBlock | TextBlock | QuizBlock | ReflectionBlock;

export interface LearningUnitDetail {
  id: string;
  slug: string;
  title: string;
  pillar_code: string;
  competency_code: string | null;
  level_code: string;
  mentor_id: string | null;
  published_at: string | null;
  estimated_duration_seconds: number | null;
  blocks: Block[];
}

export type LearningUnitAttemptStatus = "not_started" | "in_progress" | "completed";

export interface LearningUnitFeedItem {
  id: string;
  slug: string;
  title: string;
  pillar_code: string;
  level_code: string;
  estimated_duration_seconds: number | null;
  blocks_count: number;
  attempt_status: LearningUnitAttemptStatus;
  poster_url: string | null;
}

export interface LearningUnitFeed {
  hero: LearningUnitFeedItem | null;
  next: LearningUnitFeedItem[];
}

export interface BlockProgressOut {
  unit_block_id: string;
  status: "started" | "completed";
  submitted_at: string | null;
}

export interface LearningUnitAttempt {
  id: string;
  unit_id: string;
  started_at: string | null;
  completed_at: string | null;
  block_progress: BlockProgressOut[];
}

// ─── Quiz submit (discriminado por question_type, un shape por tipo) ───

export interface QuizSubmitSingleChoice {
  question_id: string;
  question_type: "single_choice";
  selected_option_ids: string[];
}

export interface QuizSubmitMultipleChoice {
  question_id: string;
  question_type: "multiple_choice";
  selected_option_ids: string[];
}

export interface QuizSubmitTrueFalse {
  question_id: string;
  question_type: "true_false";
  boolean_answer: boolean;
}

export interface QuizSubmitOrdering {
  question_id: string;
  question_type: "ordering";
  ordering: string[];
}

export interface QuizSubmitMatching {
  question_id: string;
  question_type: "matching";
  /** Tuplas [left_id, right_id] — SOLO ids de pares reales (UUID puro), los
   * distractors (id con sufijo -L/-R) nunca deben incluirse acá. */
  matching: [string, string][];
}

export interface QuizSubmitFillBlank {
  question_id: string;
  question_type: "fill_blank";
  fill_blank_answers: string[];
}

export type QuizSubmitPayload =
  | QuizSubmitSingleChoice
  | QuizSubmitMultipleChoice
  | QuizSubmitTrueFalse
  | QuizSubmitOrdering
  | QuizSubmitMatching
  | QuizSubmitFillBlank;

export interface QuizSubmitResult {
  question_id: string;
  is_correct: boolean;
  explanation: string | null;
  correct_answer: Record<string, unknown> | null;
}

export interface QuizSubmitResponse {
  results: QuizSubmitResult[];
  block_completed: boolean;
}
