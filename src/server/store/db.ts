import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
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
};

let queue = Promise.resolve();

async function ensureStoreFile() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DB_PATH, "utf8");
  } catch {
    await writeFile(DB_PATH, JSON.stringify(EMPTY_STORE, null, 2));
  }
}

export async function readStore(): Promise<DataStore> {
  await ensureStoreFile();
  const raw = await readFile(DB_PATH, "utf8");
  return JSON.parse(raw) as DataStore;
}

export async function writeStore(store: DataStore) {
  await ensureStoreFile();
  await writeFile(DB_PATH, JSON.stringify(store, null, 2));
}

export async function withStore<T>(mutator: (store: DataStore) => Promise<T> | T): Promise<T> {
  let result!: T;
  queue = queue.then(async () => {
    const store = await readStore();
    result = await mutator(store);
    await writeStore(store);
  });
  await queue;
  return result;
}
