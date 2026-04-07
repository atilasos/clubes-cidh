import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createId, invariant, nowIso, slugify } from "@/server/lib/utils";
import { DataStore, GeneratedDocument } from "@/server/types";

type TextLine = {
  text: string;
  bold?: boolean;
};

async function buildPdfDocument(title: string, lines: TextLine[]) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([595.28, 841.89]);
  let y = 790;

  const addPage = () => {
    page = pdf.addPage([595.28, 841.89]);
    y = 790;
  };

  const drawLine = (line: TextLine) => {
    if (y < 60) {
      addPage();
    }

    page.drawText(line.text, {
      x: 48,
      y,
      size: line.bold ? 15 : 11,
      font: line.bold ? bold : regular,
      color: rgb(0.1, 0.14, 0.2),
      maxWidth: 500,
      lineHeight: 14,
    });
    y -= line.bold ? 24 : 16;
  };

  drawLine({ text: title, bold: true });
  y -= 4;
  lines.forEach(drawLine);

  return Buffer.from(await pdf.save()).toString("base64");
}

export async function generateCampaignDocuments(store: DataStore, campaignId: string): Promise<GeneratedDocument[]> {
  const campaign = store.campaigns.find((entry) => entry.id === campaignId);
  invariant(campaign, "Campanha não encontrada para geração de documentos.");

  const placements = store.placements.filter((entry) => entry.campaignId === campaignId);
  const exceptions = store.exceptions.filter((entry) => entry.campaignId === campaignId);
  const clubs = store.clubs.filter((entry) => entry.campaignId === campaignId);
  const slots = store.timeSlots.filter((entry) => entry.campaignId === campaignId);
  const students = store.students;

  const documents: GeneratedDocument[] = [];

  for (const club of clubs.sort((left, right) => left.name.localeCompare(right.name))) {
    const slot = slots.find((entry) => entry.id === club.slotId);
    const lines: TextLine[] = [
      { text: `Campanha: ${campaign.title}` },
      { text: `Horário: ${slot?.label ?? club.slotId}` },
      { text: `Professor: ${club.teacher}` },
      { text: "" },
      { text: "Lista de alunos", bold: true },
    ];

    const clubPlacements = placements
      .filter((entry) => entry.clubId === club.id)
      .map((placement) => {
        const student = students.find((entry) => entry.id === placement.studentId);
        return student
          ? `${student.name} — ${student.grade} / ${student.className}`
          : `Aluno desconhecido (${placement.studentId})`;
      })
      .sort((left, right) => left.localeCompare(right));

    if (clubPlacements.length === 0) {
      lines.push({ text: "Sem alunos colocados." });
    } else {
      clubPlacements.forEach((entry, index) => lines.push({ text: `${index + 1}. ${entry}` }));
    }

    documents.push({
      id: createId(),
      campaignId,
      documentType: "club_list",
      subjectId: club.id,
      fileName: `${slugify(campaign.title)}-${slugify(club.name)}-lista.pdf`,
      createdAt: nowIso(),
      contentsBase64: await buildPdfDocument(`Lista do clube — ${club.name}`, lines),
    });
  }

  for (const student of students.sort((left, right) => left.name.localeCompare(right.name))) {
    const studentPlacements = placements
      .filter((entry) => entry.studentId === student.id)
      .map((placement) => {
        const club = clubs.find((entry) => entry.id === placement.clubId);
        const slot = slots.find((entry) => entry.id === placement.slotId);
        return {
          slotLabel: slot?.label ?? placement.slotId,
          clubName: club?.name ?? placement.clubId,
        };
      })
      .sort((left, right) => left.slotLabel.localeCompare(right.slotLabel));
    const studentExceptions = exceptions
      .filter((entry) => entry.studentId === student.id)
      .map((exception) => {
        const slot = slots.find((entry) => entry.id === exception.slotId);
        return {
          slotLabel: slot?.label ?? exception.slotId,
          reason: exception.reason,
        };
      })
      .sort((left, right) => left.slotLabel.localeCompare(right.slotLabel));

    const lines: TextLine[] = [
      { text: `Campanha: ${campaign.title}` },
      { text: `Aluno: ${student.name}` },
      { text: `Turma: ${student.grade} / ${student.className}` },
      { text: "" },
      { text: "Horário individual", bold: true },
    ];

    if (studentPlacements.length === 0 && studentExceptions.length === 0) {
      lines.push({ text: "Sem colocação final registada nesta campanha." });
    }

    studentPlacements.forEach((placement, index) => {
      lines.push({ text: `${index + 1}. ${placement.slotLabel} — ${placement.clubName}` });
    });

    studentExceptions.forEach((exception, index) => {
      lines.push({ text: `${studentPlacements.length + index + 1}. ${exception.slotLabel} — Exceção: ${exception.reason}` });
    });

    documents.push({
      id: createId(),
      campaignId,
      documentType: "student_schedule",
      subjectId: student.id,
      fileName: `${slugify(campaign.title)}-${slugify(student.name)}-horario.pdf`,
      createdAt: nowIso(),
      contentsBase64: await buildPdfDocument(`Horário individual — ${student.name}`, lines),
    });
  }

  return documents;
}
