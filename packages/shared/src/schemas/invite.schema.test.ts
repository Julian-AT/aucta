import { describe, expect, it } from "vitest";
import { CreateInviteInput, InviteCodeDTO } from "./invite.schema.js";

describe("InviteCodeDTO", () => {
  it("validates a complete valid invite code object", () => {
    const valid = {
      id: "inv_abc123",
      orgId: "org_xyz789",
      code: "AB3CD5",
      createdBy: "usr_123",
      role: "technician" as const,
      maxUses: 1,
      usedCount: 0,
      expiresAt: new Date(),
      createdAt: new Date(),
    };
    const result = InviteCodeDTO.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects when required field code is missing", () => {
    const invalid = {
      id: "inv_abc123",
      orgId: "org_xyz789",
      createdBy: "usr_123",
      role: "technician",
      maxUses: 1,
      usedCount: 0,
      expiresAt: new Date(),
      createdAt: new Date(),
    };
    const result = InviteCodeDTO.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects when code length is not 6", () => {
    const invalid = {
      id: "inv_abc123",
      orgId: "org_xyz789",
      code: "ABC",
      createdBy: "usr_123",
      role: "technician",
      maxUses: 1,
      usedCount: 0,
      expiresAt: new Date(),
      createdAt: new Date(),
    };
    const result = InviteCodeDTO.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects when role is not technician or manager", () => {
    const invalid = {
      id: "inv_abc123",
      orgId: "org_xyz789",
      code: "AB3CD5",
      createdBy: "usr_123",
      role: "admin",
      maxUses: 1,
      usedCount: 0,
      expiresAt: new Date(),
      createdAt: new Date(),
    };
    const result = InviteCodeDTO.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("CreateInviteInput", () => {
  it("applies default values for maxUses and expiresInDays", () => {
    const result = CreateInviteInput.parse({ role: "technician" });
    expect(result.maxUses).toBe(1);
    expect(result.expiresInDays).toBe(7);
  });

  it("accepts custom maxUses and expiresInDays values", () => {
    const result = CreateInviteInput.parse({
      role: "manager",
      maxUses: 5,
      expiresInDays: 14,
    });
    expect(result.role).toBe("manager");
    expect(result.maxUses).toBe(5);
    expect(result.expiresInDays).toBe(14);
  });

  it("rejects invalid role values", () => {
    const result = CreateInviteInput.safeParse({ role: "admin" });
    expect(result.success).toBe(false);
  });
});
