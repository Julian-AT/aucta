import { z } from "zod";

/**
 * Validate environment variables at startup.
 * Throws with a clear message listing all missing/invalid vars.
 */
export function validateEnv<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): z.infer<z.ZodObject<T>> {
  const result = schema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Environment validation failed:\n${issues}`);
  }
  return result.data;
}

/** Common env schemas for reuse across packages */
export const envSchemas = {
  database: z.object({
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  }),

  redis: z.object({
    UPSTASH_REDIS_REST_URL: z.string().url("UPSTASH_REDIS_REST_URL must be a valid URL"),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1, "UPSTASH_REDIS_REST_TOKEN is required"),
  }),

  auth: z.object({
    BETTER_AUTH_SECRET: z.string().min(16, "BETTER_AUTH_SECRET must be at least 16 characters"),
    BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL"),
  }),

  gemini: z.object({
    GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  }),

  qdrant: z.object({
    QDRANT_URL: z.string().url("QDRANT_URL must be a valid URL"),
    QDRANT_API_KEY: z.string().optional(),
  }),

  server: z.object({
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    ALLOWED_ORIGINS: z
      .string()
      .default("http://localhost:8081,http://localhost:3001")
      .transform((s) => s.split(",").map((o) => o.trim()).filter(Boolean)),
  }),
};
