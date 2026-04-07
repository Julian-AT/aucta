import { generateId } from "@aucta/shared/utils/id";
import { buildTool } from "../base.js";
import {
  LogFindingInput,
  LogFindingOutput,
  type LogFindingInputType,
  type LogFindingOutputType,
} from "./types.js";

export const logFindingTool = buildTool<LogFindingInputType, LogFindingOutputType>({
  name: "logFinding",
  description:
    "Record an observation, safety concern, or recommendation during the session",
  inputSchema: LogFindingInput,
  outputSchema: LogFindingOutput,
  isReadOnly: false,
  async call(input, _context): Promise<LogFindingOutputType> {
    const findingId = generateId("fnd");
    return {
      findingId,
      recorded: true,
      message: `Finding recorded: ${input.category} (${input.severity})`,
    };
  },
});

export type { Finding } from "./types.js";
