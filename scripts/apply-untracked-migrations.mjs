// One-off: apply the untracked migrations (0002, 0003) to whatever DB
// $DATABASE_URL points at. Idempotent — safe to re-run.
import { Pool, neonConfig } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { config } from "dotenv";
import ws from "ws";

config({ path: ".env.local" });
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const files = [
  "drizzle/0002_difficulty_1_to_3.sql",
  "drizzle/0003_questions_teacher_id.sql",
];

for (const file of files) {
  console.log(`\n→ Applying ${file}`);
  const text = readFileSync(file, "utf8");
  await pool.query(text);
  console.log(`  ✓ done`);
}

await pool.end();
console.log("\nAll untracked migrations applied.");
