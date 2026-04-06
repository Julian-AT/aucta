import { z } from "zod";
import daikinData from "./daikin.json" with { type: "json" };
import mitsubishiData from "./mitsubishi-electric.json" with { type: "json" };
import fujitsuData from "./fujitsu.json" with { type: "json" };

export const ErrorCodeEntrySchema = z.object({
  manufacturer: z.string(),
  code: z.string(),
  meaning: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  repairSteps: z.array(z.string()),
  possibleCauses: z.array(z.string()),
  equipmentTypes: z.array(z.string()),
});

export type ErrorCodeEntry = z.infer<typeof ErrorCodeEntrySchema>;

export interface ErrorCodeRepository {
  lookup(manufacturer: string, code: string): Promise<ErrorCodeEntry | null>;
  listManufacturers(): Promise<string[]>;
}

export class JsonErrorCodeRepository implements ErrorCodeRepository {
  private data: Map<string, ErrorCodeEntry[]>;

  constructor() {
    this.data = new Map();
    this.loadManufacturer(daikinData);
    this.loadManufacturer(mitsubishiData);
    this.loadManufacturer(fujitsuData);
  }

  private loadManufacturer(raw: {
    manufacturer: string;
    codes: unknown[];
  }): void {
    const entries = raw.codes.map((c) =>
      ErrorCodeEntrySchema.parse({
        ...(c as Record<string, unknown>),
        manufacturer: raw.manufacturer,
      }),
    );
    this.data.set(raw.manufacturer.toLowerCase(), entries);
  }

  async lookup(
    manufacturer: string,
    code: string,
  ): Promise<ErrorCodeEntry | null> {
    const entries = this.data.get(manufacturer.toLowerCase());
    if (!entries) return null;
    return (
      entries.find((e) => e.code.toUpperCase() === code.toUpperCase()) ?? null
    );
  }

  async listManufacturers(): Promise<string[]> {
    return Array.from(this.data.keys());
  }
}
