import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/server/db/prisma";
import { DataStore } from "@/server/types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "clubes-db.json");

const EMPTY_STORE: DataStore = {
  students: [],
  campaigns: [],
  timeSlots: [],
  clubs: [],
  accessCodes: [],
  reservations: [],
  submissions: [],
  placements: [],
  exceptions: [],
  history: [],
  documents: [],
  accessExports: [],
  auditLogs: [],
  metrics: {
    campaign_identification_failures_total: 0,
    campaign_last_seat_race_total: 0,
    allocation_repeat_override_total: 0,
    pdf_generation_failures_total: 0,
  },
  lastStudentImportReport: null,
};

let queue = Promise.resolve();

export class PersistedStoreError extends Error {}

function shouldUsePrismaStore() {
  return Boolean(process.env.DATABASE_URL);
}

function toDate(value: string) {
  return new Date(value);
}

function readJsonArray<T>(value: unknown) {
  return Array.isArray(value) ? (value as T[]) : [];
}

async function readPrismaStore(): Promise<DataStore> {
  return readPrismaStoreWithClient(prisma);
}

type PrismaStoreClient = Pick<
  typeof prisma,
  | "student"
  | "campaign"
  | "timeSlot"
  | "club"
  | "campaignAccessCode"
  | "reservation"
  | "enrollmentSubmission"
  | "finalPlacement"
  | "campaignException"
  | "studentClubHistory"
  | "generatedDocument"
  | "campaignAccessExport"
  | "auditLog"
  | "metricSnapshot"
  | "studentImportReport"
>;

async function readPrismaStoreWithClient(client: PrismaStoreClient): Promise<DataStore> {
  const [
    students,
    campaigns,
    timeSlots,
    clubs,
    accessCodes,
    reservations,
    submissions,
    placements,
    exceptions,
    history,
    documents,
    accessExports,
    auditLogs,
    metricSnapshots,
    studentImportReports,
  ] = await Promise.all([
    client.student.findMany(),
    client.campaign.findMany(),
    client.timeSlot.findMany(),
    client.club.findMany(),
    client.campaignAccessCode.findMany(),
    client.reservation.findMany(),
    client.enrollmentSubmission.findMany(),
    client.finalPlacement.findMany(),
    client.campaignException.findMany(),
    client.studentClubHistory.findMany(),
    client.generatedDocument.findMany(),
    client.campaignAccessExport.findMany(),
    client.auditLog.findMany(),
    client.metricSnapshot.findMany(),
    client.studentImportReport.findMany({ orderBy: { createdAt: "desc" }, take: 1 }),
  ]);

  return {
    students: students.map((student) => ({
      ...student,
      cc: student.cc ?? undefined,
      nif: student.nif ?? undefined,
      createdAt: student.createdAt.toISOString(),
    })),
    campaigns: campaigns.map((campaign) => ({
      ...campaign,
      status: campaign.status,
      semester: campaign.semester as 1 | 2,
      startsAt: campaign.startsAt.toISOString(),
      endsAt: campaign.endsAt.toISOString(),
      createdAt: campaign.createdAt.toISOString(),
    })),
    timeSlots: timeSlots.map((slot) => ({
      ...slot,
      startsAt: slot.startsAt.toISOString(),
      endsAt: slot.endsAt.toISOString(),
      eligibleGrades: readJsonArray<string>(slot.eligibleGrades),
    })),
    clubs: clubs.map((club) => ({
      ...club,
      description: club.description ?? undefined,
    })),
    accessCodes: accessCodes.map((code) => ({
      ...code,
      expiresAt: code.expiresAt.toISOString(),
      revokedAt: code.revokedAt?.toISOString() ?? null,
    })),
    reservations: reservations.map((reservation) => ({
      ...reservation,
      createdAt: reservation.createdAt.toISOString(),
    })),
    submissions: submissions.map((submission) => ({
      ...submission,
      submittedAt: submission.submittedAt.toISOString(),
      status: submission.status,
      choices: readJsonArray<{ slotId: string; clubId: string }>(submission.choices),
    })),
    placements: placements.map((placement) => ({
      ...placement,
      source: placement.source,
      createdAt: placement.createdAt.toISOString(),
    })),
    exceptions: exceptions.map((exception) => ({
      ...exception,
      createdAt: exception.createdAt.toISOString(),
    })),
    history: history.map((entry) => ({
      ...entry,
      semester: entry.semester as 1 | 2,
      createdAt: entry.createdAt.toISOString(),
    })),
    documents: documents.map((document) => ({
      ...document,
      documentType: document.documentType,
      createdAt: document.createdAt.toISOString(),
    })),
    accessExports: accessExports.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt.toISOString(),
      rows: readJsonArray<{ studentId: string; studentName: string; maskedIdentifier: string; code: string; publicUrl: string }>(entry.rows),
    })),
    auditLogs: auditLogs.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt.toISOString(),
      details: (entry.details as Record<string, unknown>) ?? {},
    })),
    metrics: Object.fromEntries(metricSnapshots.map((metric) => [metric.key, metric.value])),
    lastStudentImportReport: studentImportReports[0]
      ? {
          importedCount: studentImportReports[0].importedCount,
          rejected: readJsonArray<{ rowNumber: number; reason: string; record: Record<string, string> }>(studentImportReports[0].rejected),
          createdAt: studentImportReports[0].createdAt.toISOString(),
        }
      : null,
  };
}

async function writePrismaStore(store: DataStore) {
  await prisma.$transaction(async (tx) => {
    await writePrismaStoreWithClient(tx, store);
  });
}

async function writePrismaStoreWithClient(tx: PrismaStoreClient, store: DataStore) {
    await tx.studentImportReport.deleteMany();
    await tx.metricSnapshot.deleteMany();
    await tx.auditLog.deleteMany();
    await tx.campaignAccessExport.deleteMany();
    await tx.generatedDocument.deleteMany();
    await tx.studentClubHistory.deleteMany();
    await tx.campaignException.deleteMany();
    await tx.finalPlacement.deleteMany();
    await tx.enrollmentSubmission.deleteMany();
    await tx.reservation.deleteMany();
    await tx.campaignAccessCode.deleteMany();
    await tx.club.deleteMany();
    await tx.timeSlot.deleteMany();
    await tx.campaign.deleteMany();
    await tx.student.deleteMany();

    if (store.students.length > 0) {
      await tx.student.createMany({
        data: store.students.map((student) => ({
          ...student,
          createdAt: toDate(student.createdAt),
        })),
      });
    }

    if (store.campaigns.length > 0) {
      await tx.campaign.createMany({
        data: store.campaigns.map((campaign) => ({
          ...campaign,
          status: campaign.status,
          startsAt: toDate(campaign.startsAt),
          endsAt: toDate(campaign.endsAt),
          createdAt: toDate(campaign.createdAt),
        })),
      });
    }

    if (store.timeSlots.length > 0) {
      await tx.timeSlot.createMany({
        data: store.timeSlots.map((slot) => ({
          ...slot,
          startsAt: toDate(slot.startsAt),
          endsAt: toDate(slot.endsAt),
          eligibleGrades: slot.eligibleGrades as never,
        })),
      });
    }

    if (store.clubs.length > 0) {
      await tx.club.createMany({ data: store.clubs });
    }

    if (store.accessCodes.length > 0) {
      await tx.campaignAccessCode.createMany({
        data: store.accessCodes.map((code) => ({
          ...code,
          expiresAt: toDate(code.expiresAt),
          revokedAt: code.revokedAt ? toDate(code.revokedAt) : null,
        })),
      });
    }

    if (store.reservations.length > 0) {
      await tx.reservation.createMany({
        data: store.reservations.map((reservation) => ({
          ...reservation,
          createdAt: toDate(reservation.createdAt),
        })),
      });
    }

    if (store.submissions.length > 0) {
      await tx.enrollmentSubmission.createMany({
        data: store.submissions.map((submission) => ({
          ...submission,
          submittedAt: toDate(submission.submittedAt),
          status: submission.status,
          choices: submission.choices as never,
        })),
      });
    }

    if (store.placements.length > 0) {
      await tx.finalPlacement.createMany({
        data: store.placements.map((placement) => ({
          ...placement,
          source: placement.source,
          createdAt: toDate(placement.createdAt),
        })),
      });
    }

    if (store.exceptions.length > 0) {
      await tx.campaignException.createMany({
        data: store.exceptions.map((exception) => ({
          ...exception,
          createdAt: toDate(exception.createdAt),
        })),
      });
    }

    if (store.history.length > 0) {
      await tx.studentClubHistory.createMany({
        data: store.history.map((entry) => ({
          ...entry,
          createdAt: toDate(entry.createdAt),
        })),
      });
    }

    if (store.documents.length > 0) {
      await tx.generatedDocument.createMany({
        data: store.documents.map((document) => ({
          ...document,
          documentType: document.documentType,
          createdAt: toDate(document.createdAt),
        })),
      });
    }

    if (store.accessExports.length > 0) {
      await tx.campaignAccessExport.createMany({
        data: store.accessExports.map((entry) => ({
          ...entry,
          createdAt: toDate(entry.createdAt),
          rows: entry.rows as never,
        })),
      });
    }

    if (store.auditLogs.length > 0) {
      await tx.auditLog.createMany({
        data: store.auditLogs.map((entry) => ({
          ...entry,
          createdAt: toDate(entry.createdAt),
          details: entry.details as never,
        })),
      });
    }

    const metrics = Object.entries(store.metrics).map(([key, value]) => ({
      key,
      value,
    }));
    if (metrics.length > 0) {
      await tx.metricSnapshot.createMany({ data: metrics });
    }

    if (store.lastStudentImportReport) {
      await tx.studentImportReport.create({
        data: {
          importedCount: store.lastStudentImportReport.importedCount,
          rejected: store.lastStudentImportReport.rejected as never,
          createdAt: toDate(store.lastStudentImportReport.createdAt),
        },
      });
    }
}

async function ensureStoreFile() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DB_PATH, "utf8");
  } catch {
    await writeFile(DB_PATH, JSON.stringify(EMPTY_STORE, null, 2));
  }
}

export async function readStore(): Promise<DataStore> {
  if (shouldUsePrismaStore()) {
    return readPrismaStore();
  }

  await ensureStoreFile();
  const raw = await readFile(DB_PATH, "utf8");
  return JSON.parse(raw) as DataStore;
}

export async function writeStore(store: DataStore) {
  if (shouldUsePrismaStore()) {
    await writePrismaStore(store);
    return;
  }

  await ensureStoreFile();
  await writeFile(DB_PATH, JSON.stringify(store, null, 2));
}

export async function withStore<T>(mutator: (store: DataStore) => Promise<T> | T): Promise<T> {
  const operation = queue.catch(() => undefined).then(async () => {
    if (shouldUsePrismaStore()) {
      return prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(947231)");
        const store = await readPrismaStoreWithClient(tx);
        let result: T;
        try {
          result = await mutator(store);
        } catch (error) {
          if (error instanceof PersistedStoreError) {
            await writePrismaStoreWithClient(tx, store);
          }
          throw error;
        }
        await writePrismaStoreWithClient(tx, store);
        return result;
      }, {
        isolationLevel: "Serializable",
      });
    }

    const store = await readStore();
    let result: T;
    try {
      result = await mutator(store);
    } catch (error) {
      if (error instanceof PersistedStoreError) {
        await writeStore(store);
      }
      throw error;
    }
    await writeStore(store);
    return result;
  });

  queue = operation.then(
    () => undefined,
    () => undefined,
  );

  return operation;
}
