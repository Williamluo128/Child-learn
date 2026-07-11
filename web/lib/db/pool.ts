import "server-only";
import { Pool } from "pg";

// Single shared pool across hot reloads in dev (avoid exhausting connections).
const globalForPg = globalThis as unknown as { _pgPool?: Pool };

export const pool =
  globalForPg._pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") globalForPg._pgPool = pool;

// Target grade band. Topics inside it are learning targets; topics outside are
// backtrack-only ancestor prerequisites. Passed as query params ($subject,
// $ageEnd, $ageStart) — see lib/db/queries.ts.
export const GRADE = {
  subject: process.env.GRADE_SUBJECT ?? "Mathematics",
  ageStart: Number(process.env.GRADE_AGE_START ?? 10),
  ageEnd: Number(process.env.GRADE_AGE_END ?? 11),
};
