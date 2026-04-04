import { describe, expect, it } from "vitest";
import {
  SessionDTO,
  SessionStatus,
  CreateSessionDTO,
  UpdateSessionDTO,
  FeedbackInputDTO,
  SessionSummaryDTO,
} from "./session.schema.js";
import { SessionFindingDTO, CreateSessionFindingDTO, FindingCategory, FindingSeverity } from "./session-finding.schema.js";
import { SessionToolCallDTO, CreateSessionToolCallDTO } from "./session-tool-call.schema.js";

describe("SessionDTO", () => {
  it("validates a complete valid session object", () => {
    const valid = {
      id: "ses_abc123",
      orgId: "org_xyz789",
      userId: "usr_123",
      status: "active" as const,
      startedAt: new Date(),
      endedAt: null,
      durationMs: null,
      modelVersion: null,
      languageDetected: null,
      tokenCountInput: null,
      tokenCountOutput: null,
      feedbackRating: null,
      feedbackNote: null,
      summary: null,
      isAiGenerated: false,
      toolsUsed: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = SessionDTO.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects invalid status values", () => {
    const invalid = {
      id: "ses_abc123",
      orgId: "org_xyz789",
      userId: "usr_123",
      status: "invalid",
      startedAt: new Date(),
      endedAt: null,
      durationMs: null,
      modelVersion: null,
      languageDetected: null,
      tokenCountInput: null,
      tokenCountOutput: null,
      feedbackRating: null,
      feedbackNote: null,
      summary: null,
      isAiGenerated: false,
      toolsUsed: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = SessionDTO.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("coerces string dates to Date objects", () => {
    const withStringDates = {
      id: "ses_abc123",
      orgId: "org_xyz789",
      userId: "usr_123",
      status: "completed" as const,
      startedAt: "2026-04-04T10:00:00Z",
      endedAt: "2026-04-04T10:30:00Z",
      durationMs: 1800000,
      modelVersion: "gemini-2.5-flash",
      languageDetected: "de",
      tokenCountInput: 5000,
      tokenCountOutput: 3000,
      feedbackRating: 4,
      feedbackNote: "Helpful session",
      summary: "Diagnosed refrigerant leak",
      isAiGenerated: true,
      toolsUsed: ["lookupErrorCode", "searchKnowledgeBase"],
      metadata: { equipmentType: "split-system" },
      createdAt: "2026-04-04T10:00:00Z",
      updatedAt: "2026-04-04T10:30:00Z",
    };
    const result = SessionDTO.safeParse(withStringDates);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startedAt).toBeInstanceOf(Date);
      expect(result.data.endedAt).toBeInstanceOf(Date);
    }
  });
});

describe("SessionStatus", () => {
  it("accepts all valid statuses", () => {
    for (const status of ["connecting", "active", "completed", "failed", "timeout", "abandoned"]) {
      expect(SessionStatus.safeParse(status).success).toBe(true);
    }
  });

  it("rejects invalid status", () => {
    expect(SessionStatus.safeParse("invalid").success).toBe(false);
  });
});

describe("CreateSessionDTO", () => {
  it("validates minimal creation input", () => {
    const result = CreateSessionDTO.safeParse({
      orgId: "org_123",
      userId: "usr_456",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional modelVersion", () => {
    const result = CreateSessionDTO.safeParse({
      orgId: "org_123",
      userId: "usr_456",
      modelVersion: "gemini-2.5-flash",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing orgId", () => {
    const result = CreateSessionDTO.safeParse({ userId: "usr_456" });
    expect(result.success).toBe(false);
  });
});

describe("FeedbackInputDTO", () => {
  it("accepts rating of 3 with no note", () => {
    const result = FeedbackInputDTO.safeParse({ rating: 3 });
    expect(result.success).toBe(true);
  });

  it("accepts rating with optional note", () => {
    const result = FeedbackInputDTO.safeParse({ rating: 5, note: "Great session" });
    expect(result.success).toBe(true);
  });

  it("rejects rating of 0 (min is 1)", () => {
    const result = FeedbackInputDTO.safeParse({ rating: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects rating of 6 (max is 5)", () => {
    const result = FeedbackInputDTO.safeParse({ rating: 6 });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer rating", () => {
    const result = FeedbackInputDTO.safeParse({ rating: 3.5 });
    expect(result.success).toBe(false);
  });
});

describe("SessionSummaryDTO", () => {
  it("validates a summary object", () => {
    const result = SessionSummaryDTO.safeParse({
      id: "ses_abc",
      summary: "Diagnosed compressor failure in Daikin VRV system",
      isAiGenerated: true,
      updatedAt: new Date(),
    });
    expect(result.success).toBe(true);
  });
});

describe("UpdateSessionDTO", () => {
  it("accepts partial updates", () => {
    const result = UpdateSessionDTO.safeParse({
      status: "completed",
      durationMs: 1800000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status in update", () => {
    const result = UpdateSessionDTO.safeParse({ status: "bogus" });
    expect(result.success).toBe(false);
  });
});

describe("SessionFindingDTO", () => {
  it("validates a complete finding", () => {
    const valid = {
      id: "fnd_abc",
      sessionId: "ses_123",
      category: "safety" as const,
      description: "Refrigerant leak detected near compressor",
      severity: "high" as const,
      equipmentModel: "Daikin FTXM25",
      manufacturer: "Daikin",
      createdAt: new Date(),
    };
    const result = SessionFindingDTO.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("requires valid category", () => {
    const invalid = {
      id: "fnd_abc",
      sessionId: "ses_123",
      category: "invalid_category",
      description: "Something",
      severity: "low",
      equipmentModel: null,
      manufacturer: null,
      createdAt: new Date(),
    };
    const result = SessionFindingDTO.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("requires valid severity", () => {
    const invalid = {
      id: "fnd_abc",
      sessionId: "ses_123",
      category: "maintenance",
      description: "Something",
      severity: "extreme",
      equipmentModel: null,
      manufacturer: null,
      createdAt: new Date(),
    };
    const result = SessionFindingDTO.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("CreateSessionFindingDTO", () => {
  it("validates minimal finding creation", () => {
    const result = CreateSessionFindingDTO.safeParse({
      sessionId: "ses_123",
      category: "regulatory",
      description: "F-Gas threshold exceeded",
      severity: "critical",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional equipment fields", () => {
    const result = CreateSessionFindingDTO.safeParse({
      sessionId: "ses_123",
      category: "observation",
      description: "Unusual noise from outdoor unit",
      severity: "medium",
      equipmentModel: "Mitsubishi MXZ-3F68VF",
      manufacturer: "Mitsubishi Electric",
    });
    expect(result.success).toBe(true);
  });
});

describe("FindingCategory", () => {
  it("accepts all valid categories", () => {
    for (const cat of ["safety", "maintenance", "regulatory", "observation", "recommendation"]) {
      expect(FindingCategory.safeParse(cat).success).toBe(true);
    }
  });
});

describe("FindingSeverity", () => {
  it("accepts all valid severities", () => {
    for (const sev of ["low", "medium", "high", "critical"]) {
      expect(FindingSeverity.safeParse(sev).success).toBe(true);
    }
  });
});

describe("SessionToolCallDTO", () => {
  it("validates a complete tool call", () => {
    const valid = {
      id: "tc_abc",
      sessionId: "ses_123",
      toolName: "lookupErrorCode",
      input: { errorCode: "E01", manufacturer: "Daikin" },
      output: { found: true, description: "Compressor error" },
      durationMs: 250,
      success: true,
      errorMessage: null,
      createdAt: new Date(),
    };
    const result = SessionToolCallDTO.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("requires toolName", () => {
    const invalid = {
      id: "tc_abc",
      sessionId: "ses_123",
      input: null,
      output: null,
      durationMs: null,
      success: true,
      errorMessage: null,
      createdAt: new Date(),
    };
    const result = SessionToolCallDTO.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("requires success boolean", () => {
    const invalid = {
      id: "tc_abc",
      sessionId: "ses_123",
      toolName: "searchKnowledgeBase",
      input: null,
      output: null,
      durationMs: null,
      errorMessage: null,
      createdAt: new Date(),
    };
    const result = SessionToolCallDTO.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("CreateSessionToolCallDTO", () => {
  it("validates minimal tool call creation", () => {
    const result = CreateSessionToolCallDTO.safeParse({
      sessionId: "ses_123",
      toolName: "lookupErrorCode",
      success: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional fields", () => {
    const result = CreateSessionToolCallDTO.safeParse({
      sessionId: "ses_123",
      toolName: "searchKnowledgeBase",
      input: { query: "refrigerant charge" },
      output: { results: [] },
      durationMs: 350,
      success: false,
      errorMessage: "Qdrant connection timeout",
    });
    expect(result.success).toBe(true);
  });
});

describe("COMP-08: No emotion recognition fields", () => {
  it("SessionDTO has no sentiment/emotion/mood/tone fields", () => {
    const shape = SessionDTO.shape;
    const keys = Object.keys(shape);
    const forbidden = ["sentiment", "emotion", "mood", "tone"];
    for (const field of forbidden) {
      expect(keys).not.toContain(field);
    }
  });

  it("SessionFindingDTO has no sentiment/emotion/mood/tone fields", () => {
    const shape = SessionFindingDTO.shape;
    const keys = Object.keys(shape);
    const forbidden = ["sentiment", "emotion", "mood", "tone"];
    for (const field of forbidden) {
      expect(keys).not.toContain(field);
    }
  });

  it("SessionToolCallDTO has no sentiment/emotion/mood/tone fields", () => {
    const shape = SessionToolCallDTO.shape;
    const keys = Object.keys(shape);
    const forbidden = ["sentiment", "emotion", "mood", "tone"];
    for (const field of forbidden) {
      expect(keys).not.toContain(field);
    }
  });
});
