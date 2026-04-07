CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'open', 'closed', 'finalized', 'archived');
CREATE TYPE "PlacementSource" AS ENUM ('reservation', 'submission', 'allocation', 'manual_exception');
CREATE TYPE "SubmissionStatus" AS ENUM ('confirmed', 'rejected');
CREATE TYPE "DocumentType" AS ENUM ('club_list', 'student_schedule');

CREATE TABLE "AppState" (
  "id" TEXT PRIMARY KEY,
  "data" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Student" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "grade" TEXT NOT NULL,
  "className" TEXT NOT NULL,
  "cc" TEXT,
  "nif" TEXT,
  "studentNumber" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Campaign" (
  "id" TEXT PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "semester" INTEGER NOT NULL,
  "schoolYear" TEXT NOT NULL,
  "status" "CampaignStatus" NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "defaultCapacity" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "TimeSlot" (
  "id" TEXT PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "eligibleGrades" JSONB NOT NULL,
  "capacityDivisor" INTEGER,
  "minimumPerClub" INTEGER
);

CREATE TABLE "Club" (
  "id" TEXT PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "slotId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "teacher" TEXT NOT NULL,
  "description" TEXT,
  "capacityOverride" INTEGER
);

CREATE TABLE "CampaignAccessCode" (
  "id" TEXT PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3)
);
CREATE UNIQUE INDEX "CampaignAccessCode_campaignId_studentId_key" ON "CampaignAccessCode"("campaignId", "studentId");

CREATE TABLE "Reservation" (
  "id" TEXT PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "slotId" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT NOT NULL
);
CREATE UNIQUE INDEX "Reservation_campaignId_studentId_slotId_key" ON "Reservation"("campaignId", "studentId", "slotId");

CREATE TABLE "EnrollmentSubmission" (
  "id" TEXT PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL,
  "status" "SubmissionStatus" NOT NULL,
  "choices" JSONB NOT NULL
);
CREATE UNIQUE INDEX "EnrollmentSubmission_campaignId_studentId_key" ON "EnrollmentSubmission"("campaignId", "studentId");

CREATE TABLE "FinalPlacement" (
  "id" TEXT PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "slotId" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "source" "PlacementSource" NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "FinalPlacement_campaignId_studentId_slotId_key" ON "FinalPlacement"("campaignId", "studentId", "slotId");

CREATE TABLE "CampaignException" (
  "id" TEXT PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "slotId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "CampaignException_campaignId_studentId_slotId_key" ON "CampaignException"("campaignId", "studentId", "slotId");

CREATE TABLE "StudentClubHistory" (
  "id" TEXT PRIMARY KEY,
  "studentId" TEXT NOT NULL,
  "slotId" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "clubName" TEXT NOT NULL,
  "schoolYear" TEXT NOT NULL,
  "semester" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "GeneratedDocument" (
  "id" TEXT PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "documentType" "DocumentType" NOT NULL,
  "subjectId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "contentsBase64" TEXT NOT NULL
);

CREATE TABLE "CampaignAccessExport" (
  "id" TEXT PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rows" JSONB NOT NULL
);

CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actor" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "details" JSONB NOT NULL
);

CREATE TABLE "MetricSnapshot" (
  "id" TEXT PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  "value" INTEGER NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "StudentImportReport" (
  "id" TEXT PRIMARY KEY,
  "importedCount" INTEGER NOT NULL,
  "rejected" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
