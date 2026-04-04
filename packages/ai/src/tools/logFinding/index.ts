import { generateId } from "@aucta/shared/utils/id";
import { buildTool } from "../base.js";
import {
  LogFindingInput,
  LogFindingOutput,
  type LogFindingInputType,
  type LogFindingOutputType,
  type Finding,
} from "./types.js";

export interface FindingStore {
  add(
    sessionId: string,
    finding: Omit<Finding, "id">,
  ): string;
  getBySession(sessionId: string): Finding[];
}

export class InMemoryFindingStore implements FindingStore {
  private store = new Map<string, Finding[]>();

  add(sessionId: string, finding: Omit<Finding, "id">): string {
    const id = generateId("fnd");
    const entry: Finding = { ...finding, id };

    const existing = this.store.get(sessionId);
    if (existing) {
      existing.push(entry);
    } else {
      this.store.set(sessionId, [entry]);
    }

    return id;
  }

  getBySession(sessionId: string): Finding[] {
    return this.store.get(sessionId) ?? [];
  }
}

export function createLogFindingTool(store: FindingStore) {
  return buildTool<LogFindingInputType, LogFindingOutputType>({
    name: "logFinding",
    description:
      "Record an observation, safety concern, or recommendation during the session",
    inputSchema: LogFindingInput,
    outputSchema: LogFindingOutput,
    isReadOnly: false,
    async call(input, context): Promise<LogFindingOutputType> {
      const findingId = store.add(context.sessionId, {
        category: input.category,
        description: input.description,
        severity: input.severity,
        equipmentModel: input.equipmentModel,
        manufacturer: input.manufacturer,
        timestamp: new Date(),
      });

      return {
        findingId,
        recorded: true,
        message: `Finding recorded: ${input.category} (${input.severity})`,
      };
    },
  });
}

export const logFindingTool = createLogFindingTool(new InMemoryFindingStore());

export type { Finding } from "./types.js";
