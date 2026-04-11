import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema/index.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL environment variable is required. " +
      "Set it in .env.local or your deployment environment.",
  );
}

const sql = neon(databaseUrl);
export const db = drizzle({ client: sql, schema });

export type DrizzleClient = typeof db;
