import { describe, it, expect } from "vitest";
import { JsonErrorCodeRepository } from "./index.js";

describe("JsonErrorCodeRepository", () => {
  const repo = new JsonErrorCodeRepository();

  it("looks up Daikin U4 and returns entry with meaning containing 'communication'", async () => {
    const entry = await repo.lookup("Daikin", "U4");
    expect(entry).not.toBeNull();
    expect(entry!.manufacturer).toBe("Daikin");
    expect(entry!.code).toBe("U4");
    expect(entry!.meaning.toLowerCase()).toContain("communication");
    expect(entry!.severity).toBe("high");
    expect(entry!.repairSteps.length).toBeGreaterThan(0);
    expect(entry!.possibleCauses.length).toBeGreaterThan(0);
    expect(entry!.equipmentTypes.length).toBeGreaterThan(0);
  });

  it("is case-insensitive for manufacturer and code (D-01)", async () => {
    const upper = await repo.lookup("Daikin", "U4");
    const lower = await repo.lookup("daikin", "u4");
    expect(upper).not.toBeNull();
    expect(lower).not.toBeNull();
    expect(upper!.code).toBe(lower!.code);
    expect(upper!.meaning).toBe(lower!.meaning);
  });

  it("returns null for unknown manufacturer", async () => {
    const result = await repo.lookup("UnknownBrand", "X1");
    expect(result).toBeNull();
  });

  it("returns null for unknown code with valid manufacturer", async () => {
    const result = await repo.lookup("Daikin", "ZZZZ");
    expect(result).toBeNull();
  });

  it("lists all loaded manufacturers", async () => {
    const manufacturers = await repo.listManufacturers();
    expect(manufacturers).toContain("daikin");
    expect(manufacturers).toContain("fujitsu");
    expect(manufacturers).toContain("mitsubishi electric");
    expect(manufacturers).toHaveLength(3);
  });

  it("looks up Mitsubishi Electric E3 code", async () => {
    const entry = await repo.lookup("Mitsubishi Electric", "E3");
    expect(entry).not.toBeNull();
    expect(entry!.manufacturer).toBe("Mitsubishi Electric");
    expect(entry!.code).toBe("E3");
  });

  it("looks up Fujitsu EE:EE code", async () => {
    const entry = await repo.lookup("Fujitsu", "EE:EE");
    expect(entry).not.toBeNull();
    expect(entry!.manufacturer).toBe("Fujitsu");
    expect(entry!.code).toBe("EE:EE");
  });
});
