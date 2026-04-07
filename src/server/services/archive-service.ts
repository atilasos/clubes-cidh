type Semester = "S1" | "S2";

type ArchivePlacement = {
  studentId: string;
  clubId: string;
  semester: Semester;
  schoolYear: string;
};

type PriorArchive = {
  visibility: "active-for-next-semester" | "read-only";
} | null;

export function archiveCampaign(input: {
  campaignId: string;
  semester: Semester;
  schoolYear: string;
  finalPlacements: ArchivePlacement[];
  priorArchive: PriorArchive;
}) {
  const isFirstSemester = input.semester === "S1";

  return {
    campaignId: input.campaignId,
    schoolYear: input.schoolYear,
    semester: input.semester,
    visibility: isFirstSemester ? "active-for-next-semester" : "read-only",
    nextSemesterSeedHistory: isFirstSemester ? input.finalPlacements : [],
    snapshotLocked: !isFirstSemester,
    priorArchiveVisibility: input.priorArchive?.visibility ?? null,
  };
}
