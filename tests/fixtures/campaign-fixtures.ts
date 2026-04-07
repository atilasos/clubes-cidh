export type Semester = 'S1' | 'S2';

export type StudentFixture = {
  id: string;
  name: string;
  grade: number;
  classroom: string;
  studentNumber: string;
  cc: string;
  nif: string;
  eligibleSlotIds: string[];
};

export type ClubFixture = {
  id: string;
  slotId: string;
  name: string;
  defaultCapacity: number;
  manualCapacity?: number;
};

export type ReservationFixture = {
  studentId: string;
  clubId: string;
  slotId: string;
};

export type PlacementHistoryFixture = {
  studentId: string;
  clubId: string;
  semester: Semester;
  schoolYear: string;
};

export const slotFixtures = [
  { id: 'slot-arts', label: 'Terça 14:00' },
  { id: 'slot-science', label: 'Quinta 14:00' },
] as const;

export const clubFixtures: ClubFixture[] = [
  { id: 'robotics', slotId: 'slot-science', name: 'Robótica', defaultCapacity: 2 },
  { id: 'science-lab', slotId: 'slot-science', name: 'Ciência Viva', defaultCapacity: 2 },
  { id: 'theatre', slotId: 'slot-arts', name: 'Teatro', defaultCapacity: 2 },
  { id: 'music', slotId: 'slot-arts', name: 'Música', defaultCapacity: 2, manualCapacity: 1 },
];

export const studentFixtures: StudentFixture[] = [
  {
    id: 'ana',
    name: 'Ana Silva',
    grade: 5,
    classroom: '5A',
    studentNumber: '2025001',
    cc: '123456780AA1',
    nif: '123456789',
    eligibleSlotIds: ['slot-arts', 'slot-science'],
  },
  {
    id: 'bruno',
    name: 'Bruno Costa',
    grade: 5,
    classroom: '5A',
    studentNumber: '2025002',
    cc: '123456781BB2',
    nif: '223456789',
    eligibleSlotIds: ['slot-science'],
  },
  {
    id: 'carla',
    name: 'Carla Sousa',
    grade: 6,
    classroom: '6B',
    studentNumber: '2025003',
    cc: '123456782CC3',
    nif: '323456789',
    eligibleSlotIds: ['slot-arts', 'slot-science'],
  },
  {
    id: 'diogo',
    name: 'Diogo Matos',
    grade: 6,
    classroom: '6B',
    studentNumber: '2025004',
    cc: '123456783DD4',
    nif: '423456789',
    eligibleSlotIds: ['slot-arts'],
  },
] satisfies StudentFixture[];

export const reservationFixtures: ReservationFixture[] = [
  { studentId: 'ana', clubId: 'music', slotId: 'slot-arts' },
];

export const firstSemesterHistory: PlacementHistoryFixture[] = [
  { studentId: 'ana', clubId: 'robotics', semester: 'S1', schoolYear: '2025/2026' },
  { studentId: 'bruno', clubId: 'science-lab', semester: 'S1', schoolYear: '2025/2026' },
  { studentId: 'carla', clubId: 'theatre', semester: 'S1', schoolYear: '2025/2026' },
];

export const invalidImportRows = [
  {
    rowNumber: 2,
    row: { name: 'Aluno Sem NIF', grade: 5, classroom: '5A', cc: '123456780AA1', nif: '', studentNumber: '2025005' },
  },
  {
    rowNumber: 3,
    row: { name: 'Aluno Duplicado', grade: 5, classroom: '5A', cc: '123456781BB2', nif: '223456789', studentNumber: '2025002' },
  },
];

export const lastSeatRace = {
  slotId: 'slot-science',
  clubId: 'robotics',
  remainingCapacity: 1,
  submissions: [
    {
      studentId: 'ana',
      submittedAt: '2026-04-07T10:00:00.000Z',
      choices: [{ slotId: 'slot-science', clubId: 'robotics' }],
    },
    {
      studentId: 'bruno',
      submittedAt: '2026-04-07T10:00:00.001Z',
      choices: [{ slotId: 'slot-science', clubId: 'robotics' }],
    },
  ],
} as const;
