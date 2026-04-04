import { buildTool } from "../base.js";
import type { ErrorCodeRepository } from "../../data/error-codes/index.js";
import { JsonErrorCodeRepository } from "../../data/error-codes/index.js";
import {
  LookupErrorCodeInput,
  LookupErrorCodeOutput,
  type LookupErrorCodeInputType,
  type LookupErrorCodeOutputType,
} from "./types.js";

export function createLookupErrorCodeTool(repo: ErrorCodeRepository) {
  return buildTool<LookupErrorCodeInputType, LookupErrorCodeOutputType>({
    name: "lookupErrorCode",
    description:
      "Look up the meaning and repair steps for an HVAC error code displayed on equipment",
    inputSchema: LookupErrorCodeInput,
    outputSchema: LookupErrorCodeOutput,
    isReadOnly: true,
    async call(input): Promise<LookupErrorCodeOutputType> {
      const entry = await repo.lookup(input.manufacturer, input.errorCode);

      if (!entry) {
        return {
          found: false,
          message: `Error code "${input.errorCode}" not found for manufacturer "${input.manufacturer}". I don't have this specific code in my database, but I can still help diagnose the issue based on symptoms. Please describe what the equipment is doing.`,
        };
      }

      return {
        found: true,
        manufacturer: entry.manufacturer,
        code: entry.code,
        meaning: entry.meaning,
        severity: entry.severity,
        repairSteps: entry.repairSteps,
        possibleCauses: entry.possibleCauses,
        equipmentTypes: entry.equipmentTypes,
      };
    },
  });
}

export const lookupErrorCodeTool = createLookupErrorCodeTool(
  new JsonErrorCodeRepository(),
);
