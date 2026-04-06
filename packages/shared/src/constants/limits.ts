export const RATE_LIMITS = {
  AUTH: { window: "60 s", max: 10 },
  TOKEN: { window: "60 s", max: 5 },
  GENERAL: { window: "60 s", max: 100 },
} as const;

export const INVITE_DEFAULTS = {
  CODE_LENGTH: 6,
  MAX_USES: 1,
  EXPIRY_DAYS: 7,
} as const;

export const ORG_LIMITS = {
  MAX_MEMBERS: 100,
  MAX_ORGS_PER_USER: 1,
} as const;
