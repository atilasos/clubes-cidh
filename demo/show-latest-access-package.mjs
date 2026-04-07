import fs from "node:fs";
import path from "node:path";

const dbPath = path.join(process.cwd(), ".data", "clubes-db.json");

if (!fs.existsSync(dbPath)) {
  console.error("Não existe .data/clubes-db.json. Gere primeiro um pacote de acesso no painel administrativo.");
  process.exit(1);
}

const store = JSON.parse(fs.readFileSync(dbPath, "utf8"));
const latestExport = store.accessExports?.[0];

if (!latestExport || !Array.isArray(latestExport.rows) || latestExport.rows.length === 0) {
  console.error("Ainda não existe nenhum pacote de acesso exportado.");
  process.exit(1);
}

console.log("Último pacote de acesso gerado:\n");
for (const row of latestExport.rows) {
  console.log(`${row.studentName} | ${row.maskedIdentifier} | código: ${row.code} | ${row.publicUrl}`);
}
