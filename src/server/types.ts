export type CampaignStatus = "draft" | "open" | "closed" | "finalized" | "archived";
export type PlacementSource = "reservation" | "submission" | "allocation" | "manual_exception";

export interface Student {
  id: string;
  name: string;
  grade: string;
  className: string;
  cc?: string;
  nif?: string;
  studentNumber: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  slug: string;
  title: string;
  semester: 1 | 2;
  schoolYear: string;
  status: CampaignStatus;
  startsAt: string;
  endsAt: string;
  defaultCapacity: number;
  createdAt: string;
}

export interface TimeSlot {
  id: string;
  campaignId: string;
  label: string;
  startsAt: string;
  endsAt: string;
  eligibleGrades: string[];
  capacityDivisor?: number | null;
  minimumPerClub?: number | null;
}

export interface Club {
  id: string;
  campaignId: string;
  slotId: string;
  name: string;
  teacher: string;
  description?: string;
  capacityOverride?: number | null;
}

export interface CampaignAccessCode {
  id: string;
  campaignId: string;
  studentId: string;
  code: string;
  expiresAt: string;
  revokedAt?: string | null;
}

export interface Reservation {
  id: string;
  campaignId: string;
  studentId: string;
  slotId: string;
  clubId: string;
  reason: string;
  createdAt: string;
  createdBy: string;
}

export interface EnrollmentChoice {
  slotId: string;
  clubId: string;
}

export interface EnrollmentSubmission {
  id: string;
  campaignId: string;
  studentId: string;
  submittedAt: string;
  status: "confirmed" | "rejected";
  choices: EnrollmentChoice[];
}

export interface FinalPlacement {
  id: string;
  campaignId: string;
  studentId: string;
  slotId: string;
  clubId: string;
  source: PlacementSource;
  reason: string;
  createdAt: string;
}

export interface CampaignException {
  id: string;
  campaignId: string;
  studentId: string;
  slotId: string;
  reason: string;
  createdAt: string;
}

export interface StudentClubHistory {
  id: string;
  studentId: string;
  slotId: string;
  clubId: string;
  clubName: string;
  schoolYear: string;
  semester: 1 | 2;
  createdAt: string;
}

export interface GeneratedDocument {
  id: string;
  campaignId: string;
  documentType: "club_list" | "student_schedule";
  subjectId: string;
  fileName: string;
  createdAt: string;
  contentsBase64: string;
}

export interface CampaignAccessExportRow {
  studentId: string;
  studentName: string;
  maskedIdentifier: string;
  code: string;
  publicUrl: string;
}

export interface CampaignAccessExport {
  id: string;
  campaignId: string;
  createdAt: string;
  rows: CampaignAccessExportRow[];
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actor: string;
  createdAt: string;
  details: Record<string, unknown>;
}

export interface StudentImportReject {
  rowNumber: number;
  reason: string;
  record: Record<string, string>;
}

export interface StudentImportReport {
  importedCount: number;
  rejected: StudentImportReject[];
  createdAt: string;
}

export interface DataStore {
  students: Student[];
  campaigns: Campaign[];
  timeSlots: TimeSlot[];
  clubs: Club[];
  accessCodes: CampaignAccessCode[];
  reservations: Reservation[];
  submissions: EnrollmentSubmission[];
  placements: FinalPlacement[];
  exceptions: CampaignException[];
  history: StudentClubHistory[];
  documents: GeneratedDocument[];
  accessExports: CampaignAccessExport[];
  auditLogs: AuditLog[];
  metrics: Record<string, number>;
  lastStudentImportReport: StudentImportReport | null;
}

export interface EligibleClubOption {
  slot: TimeSlot;
  clubs: Array<Club & { remainingCapacity: number }>;
}

export interface IdentifiedStudentView {
  campaign: Campaign;
  student: Pick<Student, "id" | "name" | "grade" | "className" | "studentNumber"> & {
    maskedCc?: string;
    maskedNif?: string;
  };
  options: EligibleClubOption[];
}

export interface AllocationPreviewPlacement {
  studentId: string;
  studentName: string;
  slotId: string;
  slotLabel: string;
  clubId: string;
  clubName: string;
  reason: string;
  repeatedClub: boolean;
}

export interface DashboardData {
  students: Student[];
  campaigns: Array<Campaign & {
    slots: TimeSlot[];
    clubs: Club[];
    placements: FinalPlacement[];
    exceptions: CampaignException[];
  }>;
  recentAuditLogs: AuditLog[];
  metrics: Record<string, number>;
  lastStudentImportReport: StudentImportReport | null;
}
