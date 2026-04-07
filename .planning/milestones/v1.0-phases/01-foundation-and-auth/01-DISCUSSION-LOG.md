# Phase 1: Foundation and Auth - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 01-foundation-and-auth
**Areas discussed:** Onboarding flow, Invite code experience, Mobile app shell, Role permissions scope

---

## Onboarding Flow

### Q1: After sign-up, how should a new user get into an organization?

| Option | Description | Selected |
|--------|-------------|----------|
| Split path (Recommended) | Sign up then choose: "Create organization" or "Join with invite code" | ✓ |
| Owner-first | Always create org first. Joining happens from settings. | |
| Deferred org setup | Land on "no org" state. Create/join from home screen. | |

**User's choice:** Split path
**Notes:** None

### Q2: What info should sign-up collect?

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal (Recommended) | Name, email, password | ✓ |
| Extended | Name, email, password, phone, preferred language | |
| You decide | Let Claude decide based on Better Auth needs | |

**User's choice:** Minimal
**Notes:** None

### Q3: What info should org creation collect?

| Option | Description | Selected |
|--------|-------------|----------|
| Name only (Recommended) | Company name only, rest in settings later | |
| Name + industry | Company name + industry type | |
| Name + industry + location | Company name + industry + location | ✓ |

**User's choice:** Name + industry + location
**Notes:** None

---

## Invite Code Experience

### Q4: What format should invite codes use?

| Option | Description | Selected |
|--------|-------------|----------|
| 6-char alphanumeric (Recommended) | Like "A3K9X2" — easy to type, read aloud, case-insensitive | ✓ |
| Branded prefix + segments | Like "AUCTA-A3K9-X2B7" — branded but longer | |
| Deep link only | Full URL — works as deep link but hard to communicate verbally | |

**User's choice:** 6-char alphanumeric
**Notes:** None

### Q5: Should joining show a confirmation before joining?

| Option | Description | Selected |
|--------|-------------|----------|
| Preview + confirm (Recommended) | See org name and role, tap "Join" to confirm | ✓ |
| Auto-join immediately | Instantly added to org, no verification step | |

**User's choice:** Preview + confirm
**Notes:** None

### Q6: What should the default invite code expiry be?

| Option | Description | Selected |
|--------|-------------|----------|
| 7-day default (Recommended) | Expires after 7 days, owner can set custom expiry | ✓ |
| 24-hour default | More secure but requires frequent regeneration | |
| No expiry | Never expires unless manually revoked | |

**User's choice:** 7-day default
**Notes:** None

### Q7: How should QR code scanning work alongside manual entry?

| Option | Description | Selected |
|--------|-------------|----------|
| Camera QR scan (Recommended) | Scan QR code that contains invite code | |
| QR scan + share link | QR scanning plus shareable deep links via messaging apps | ✓ |
| Manual entry only | No QR scanning, simplest to build | |

**User's choice:** QR scan + share link
**Notes:** None

---

## Mobile App Shell

### Q8: What navigation pattern should the mobile app use?

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom tabs (Recommended) | Bottom tab bar with 2-3 tabs, standard mobile pattern | ✓ |
| Stack only | No tab bar, every screen pushes onto a stack | |
| Drawer navigation | Hamburger drawer, less common on modern mobile | |

**User's choice:** Bottom tabs
**Notes:** None

### Q9: What should the home screen emphasize?

| Option | Description | Selected |
|--------|-------------|----------|
| Session-first (Recommended) | One dominant "Start Session" button, minimal chrome | ✓ |
| Dashboard home | Recent sessions, stats, session start button less prominent | |

**User's choice:** Session-first
**Notes:** None

### Q10: Which screens should exist in Phase 1?

| Option | Description | Selected |
|--------|-------------|----------|
| Core set (Recommended) | Login, Sign-up, Org choice, Home, Settings/Profile | ✓ |
| Core + placeholders | Core plus History tab placeholder and member list | |

**User's choice:** Core set
**Notes:** None

### Q11: What visual theme should the app use?

| Option | Description | Selected |
|--------|-------------|----------|
| Dark theme (Recommended) | Dark backgrounds, better for field work and sunlight | |
| Light theme | Light backgrounds, standard app feel | |
| Both (auto-switch) | Support both with a toggle | ✓ (modified) |

**User's choice:** Both, white (light) default
**Notes:** User specified light theme as default, with dark theme available via toggle.

---

## Role Permissions Scope

### Q12: What can managers do beyond technicians in Phase 1?

| Option | Description | Selected |
|--------|-------------|----------|
| Invite + view team (Recommended) | Generate invites (technician-only), view team, see profile | ✓ |
| Near-owner level | Same as owners except deleting the org | |
| Same as technician for now | Differentiation in later phases | |

**User's choice:** Invite + view team
**Notes:** None

### Q13: How strict should owner vs technician separation be?

| Option | Description | Selected |
|--------|-------------|----------|
| Clear hierarchy (Recommended) | Owner manages everything, technician uses app + own profile only | ✓ |
| You decide | Let Claude design permissions based on Better Auth capabilities | |

**User's choice:** Clear hierarchy
**Notes:** None

### Q14: Can a user belong to multiple organizations?

| Option | Description | Selected |
|--------|-------------|----------|
| Single org (Recommended) | One org per user, covers standard HVAC business use case | ✓ |
| Multi-org membership | Multiple orgs, handles contractors | |

**User's choice:** Single org
**Notes:** None

### Q15: Should an organization have a single owner or multiple?

| Option | Description | Selected |
|--------|-------------|----------|
| Single owner + transfer (Recommended) | One owner, can transfer ownership | ✓ |
| Multiple owners | Multiple users can have owner role | |

**User's choice:** Single owner + transfer
**Notes:** None

---

## Claude's Discretion

- Tab bar icon and label choices
- Form validation rules and error messages
- Database schema column details
- CI pipeline configuration
- Better Auth plugin config
- Loading states and transitions

## Deferred Ideas

None — discussion stayed within phase scope
