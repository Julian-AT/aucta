import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoist mock functions so they're available when vi.mock factories run
const { mockGetFullOrg, mockGetSession } = vi.hoisted(() => ({
  mockGetFullOrg: vi.fn(),
  mockGetSession: vi.fn().mockResolvedValue(null),
}));

// Hoist mock repository instances
const { mockOrgSettingsRepo, mockAuditRepo } = vi.hoisted(() => ({
  mockOrgSettingsRepo: {
    findByOrgId: vi.fn().mockResolvedValue(null),
    upsert: vi.fn(),
  },
  mockAuditRepo: {
    log: vi.fn(),
  },
}));

// Mock auth to avoid Better Auth dependency
vi.mock("@aucta/auth", () => ({
  auth: {
    api: {
      getSession: mockGetSession,
      getFullOrganization: mockGetFullOrg,
      createOrganization: vi.fn(),
      setActiveOrganization: vi.fn(),
    },
  },
}));

// Mock rate limiting to avoid Redis dependency
vi.mock("../middleware/rate-limit.js", () => ({
  generalLimiter: {},
  createRateLimitMiddleware: () =>
    vi.fn().mockImplementation(async (opts: { next: () => Promise<unknown> }) => opts.next()),
}));

// Mock Redis to avoid Upstash dependency
vi.mock("@upstash/redis", () => ({
  Redis: {
    fromEnv: vi.fn().mockReturnValue({}),
  },
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: vi.fn().mockImplementation(() => ({
    limit: vi.fn().mockResolvedValue({ success: true }),
  })),
}));

// Mock repositories -- use class pattern so `new` works
vi.mock("@aucta/db/repositories/org-settings.repository", () => ({
  OrgSettingsRepository: class {
    findByOrgId = mockOrgSettingsRepo.findByOrgId;
    upsert = mockOrgSettingsRepo.upsert;
  },
}));

vi.mock("@aucta/db/repositories/audit.repository", () => ({
  AuditRepository: class {
    log = mockAuditRepo.log;
  },
}));

// Mock db client
vi.mock("@aucta/db/client", () => ({
  db: {},
}));

import { orgRouter } from "./org.router.js";

describe("orgRouter", () => {
  const createOrgCaller = () =>
    orgRouter.createCaller({
      session: {
        userId: "user_1",
        activeOrganizationId: "org_1",
      },
      headers: new Headers(),
      ip: "127.0.0.1",
    });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCurrent", () => {
    it("getCurrent returns org data with currentUserRole", async () => {
      mockGetFullOrg.mockResolvedValue({
        id: "org_1",
        name: "Acme HVAC",
        slug: "acme-hvac",
        logo: null,
        createdAt: new Date("2026-01-01"),
        members: [
          {
            userId: "user_1",
            role: "owner",
            user: { name: "John", email: "john@acme.com" },
          },
        ],
      });

      const caller = createOrgCaller();
      const result = await caller.getCurrent();

      expect(result.id).toBe("org_1");
      expect(result.name).toBe("Acme HVAC");
      expect(result.slug).toBe("acme-hvac");
      expect(result.currentUserRole).toBe("owner");
    });

    it("defaults role to 'member' when user not in members array", async () => {
      mockGetFullOrg.mockResolvedValue({
        id: "org_1",
        name: "Acme HVAC",
        slug: "acme-hvac",
        logo: null,
        createdAt: new Date("2026-01-01"),
        members: [
          {
            userId: "user_other",
            role: "technician",
            user: { name: "Jane", email: "jane@acme.com" },
          },
        ],
      });

      const caller = createOrgCaller();
      const result = await caller.getCurrent();

      expect(result.currentUserRole).toBe("member");
    });

    it("defaults role to 'member' when members array is empty", async () => {
      mockGetFullOrg.mockResolvedValue({
        id: "org_1",
        name: "Acme HVAC",
        slug: "acme-hvac",
        logo: null,
        createdAt: new Date("2026-01-01"),
        members: [],
      });

      const caller = createOrgCaller();
      const result = await caller.getCurrent();

      expect(result.currentUserRole).toBe("member");
    });

    it("throws NOT_FOUND when org not found", async () => {
      mockGetFullOrg.mockResolvedValue(null);

      const caller = createOrgCaller();
      await expect(caller.getCurrent()).rejects.toThrow(
        "Organization org_1 not found",
      );
    });
  });
});
