import { createId, nowIso } from "@/server/lib/utils";
import { recordAuditLog } from "@/server/services/audit-log-service";
import { DataStore, Student, StudentImportReject } from "@/server/types";

const REQUIRED_HEADERS = ["name", "grade", "className", "studentNumber"] as const;

function parseCsv(csv: string) {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return [] as Record<string, string>[];
  }
  const headers = lines[0].split(",").map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    return headers.reduce<Record<string, string>>((record, header, index) => {
      record[header] = (cells[index] ?? "").trim();
      return record;
    }, {});
  });
}

function normalizeStudentRecord(raw: Record<string, string>) {
  return {
    name: raw.name?.trim(),
    grade: raw.grade?.trim(),
    className: raw.className?.trim() ?? raw.class?.trim(),
    cc: raw.cc?.trim() || undefined,
    nif: raw.nif?.trim() || undefined,
    studentNumber: raw.studentNumber?.trim() ?? raw.number?.trim(),
  };
}

export function importStudents(
  store: DataStore,
  payload: { csv?: string; students?: Array<Record<string, string>>; actor?: string },
) {
  const rows = payload.students ?? (payload.csv ? parseCsv(payload.csv) : []);
  const imported: Student[] = [];
  const rejected: StudentImportReject[] = [];
  const seenStudentNumbers = new Set<string>();

  rows.forEach((row, index) => {
    const normalized = normalizeStudentRecord(row);
    const missing = REQUIRED_HEADERS.filter((header) => !normalized[header]);
    if (missing.length > 0) {
      rejected.push({ rowNumber: index + 2, reason: `Campos em falta: ${missing.join(", ")}`, record: row });
      return;
    }
    if (seenStudentNumbers.has(normalized.studentNumber!)) {
      rejected.push({ rowNumber: index + 2, reason: "Número de aluno duplicado no ficheiro", record: row });
      return;
    }
    seenStudentNumbers.add(normalized.studentNumber!);

    const existing = store.students.find((student) => student.studentNumber === normalized.studentNumber);
    const nextStudent: Student = existing
      ? { ...existing, ...normalized }
      : {
          id: createId(),
          name: normalized.name!,
          grade: normalized.grade!,
          className: normalized.className!,
          cc: normalized.cc,
          nif: normalized.nif,
          studentNumber: normalized.studentNumber!,
          createdAt: nowIso(),
        };

    if (existing) {
      Object.assign(existing, nextStudent);
    } else {
      store.students.push(nextStudent);
    }
    imported.push(nextStudent);
  });

  recordAuditLog(store, {
    entityType: "student_import",
    entityId: createId(),
    action: "students_imported",
    actor: payload.actor ?? "admin",
    details: {
      imported: imported.length,
      rejected: rejected.length,
    },
  });

  return { imported, rejected };
}
