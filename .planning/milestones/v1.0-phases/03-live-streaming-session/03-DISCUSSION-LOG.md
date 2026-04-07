# Phase 3: Live Streaming Session - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 03-live-streaming-session
**Areas discussed:** Session screen layout, Audio interaction model, Session start & end flow, Connection state UX

---

## Session Screen Layout

### Screen Layout
| Option | Description | Selected |
|--------|-------------|----------|
| Full-screen camera with overlay HUD | Camera fills entire screen. Controls float as translucent overlays. Maximizes equipment view. | ✓ |
| Split view: camera top, controls bottom | Camera 60-70%, bottom panel for status/text/controls. More structured but less camera space. | |
| Adaptive: full camera + expandable drawer | Full camera default, swipeable drawer for transcript. Best of both but more complex. | |

**User's choice:** Full-screen camera with overlay HUD
**Notes:** None

### AI Indicator Placement
| Option | Description | Selected |
|--------|-------------|----------|
| Corner badge | Small persistent "AI" pill in top-left. Always visible. EU AI Act Art. 50 compliant. | ✓ |
| Top edge bar | Thin colored bar at screen top, changes color by AI state. | |
| Badge + bar combo | Both badge and bar. Maximum visibility but uses more space. | |

**User's choice:** Corner badge
**Notes:** None

### Landscape Orientation
| Option | Description | Selected |
|--------|-------------|----------|
| Same full-screen layout, repositioned controls | Camera fills screen, controls reposition. Simple and consistent. | ✓ |
| Side panel in landscape | Camera left 70%, controls panel on right. | |

**User's choice:** Same full-screen layout, repositioned controls
**Notes:** None

### AI State Feedback
| Option | Description | Selected |
|--------|-------------|----------|
| Animated audio indicator only | Waveform/pulse near mic icon. No text transcript. Clean and audio-first. | ✓ |
| Subtitles overlay + indicator | Brief text subtitle of AI speech overlaid on camera. Helps in noise but adds clutter. | |
| You decide | Claude decides best approach. | |

**User's choice:** Animated audio indicator only
**Notes:** None

---

## Audio Interaction Model

### Microphone Mode
| Option | Description | Selected |
|--------|-------------|----------|
| Always-on mic | Mic hot from session start. Hands-free. Gemini Live supports barge-in natively. | ✓ |
| Push-to-talk | Tap and hold to speak. Explicit control but less natural. | |
| Always-on with mute toggle | Always-on default with mute option. | |

**User's choice:** Always-on mic
**Notes:** None

### Audio Output
| Option | Description | Selected |
|--------|-------------|----------|
| Loudspeaker by default | AI plays through loudspeaker. Audible in noisy HVAC environments. | ✓ |
| Follow system audio route | Use headphones if connected, otherwise loudspeaker. | |
| You decide | Claude decides. | |

**User's choice:** Loudspeaker by default
**Notes:** None

### Barge-in Behavior
| Option | Description | Selected |
|--------|-------------|----------|
| Instant interrupt | AI stops immediately when technician speaks. Natural conversational flow. | ✓ |
| Soft fade-out | AI fades out over ~500ms. Smoother but may feel sluggish. | |

**User's choice:** Instant interrupt
**Notes:** None

### Background Behavior
| Option | Description | Selected |
|--------|-------------|----------|
| Audio continues in background | Session keeps running. Foreground service (Android), background audio (iOS). Camera pauses. | ✓ |
| Pause on background | Session pauses, auto-resumes on foreground. Simpler but disruptive. | |

**User's choice:** Audio continues in background
**Notes:** None

---

## Session Start & End Flow

### Start Flow
| Option | Description | Selected |
|--------|-------------|----------|
| Permission check → AI disclosure → Live | Check permissions, show AI disclosure with "I understand", then start. Two taps total. | ✓ |
| AI disclosure only on first use | Skip disclosure after first session. Reduces friction for repeat use. | |
| Inline disclosure (toast/banner) | Show disclosure as brief toast once session starts. Fastest but may not satisfy EU AI Act. | |

**User's choice:** Permission check → AI disclosure → Live
**Notes:** None

### Connecting State
| Option | Description | Selected |
|--------|-------------|----------|
| Camera-first: preview while connecting | Camera activates immediately, AI joins when WebSocket connects. Feels instant. | ✓ |
| Full loading screen until connected | Loading spinner until fully connected. Clean but adds perceived wait. | |

**User's choice:** Camera-first: preview while connecting
**Notes:** None

### End Flow
| Option | Description | Selected |
|--------|-------------|----------|
| Confirmation dialog, then Home | Tap stop → "End this session?" dialog → close → Home. Prevents accidental ends. Voice triggers same. | ✓ |
| Instant end, no confirmation | Tap stop → immediate end. Fast but risky with gloves. | |
| Countdown with cancel option | 3-second "Ending session..." countdown, cancellable. | |

**User's choice:** Confirmation dialog, then Home
**Notes:** None

### Voice End Command
| Option | Description | Selected |
|--------|-------------|----------|
| AI confirms verbally + closes | AI recognizes phrases, confirms verbally ("Ending the session now. Goodbye.") and closes. | ✓ |
| AI asks for verbal confirmation | AI asks "Would you like to end?" and waits for "yes." Two-step voice. | |
| You decide | Claude decides best voice-end behavior. | |

**User's choice:** AI confirms verbally + closes
**Notes:** None

---

## Connection State UX

### Reconnection UI
| Option | Description | Selected |
|--------|-------------|----------|
| Camera stays live, overlay status change | Camera keeps running, overlay shows "Reconnecting..." Audio pauses. Background reconnection. | ✓ |
| Full-screen reconnection overlay | Dims camera, prominent "Connection Lost" screen with retry button. Blocks camera. | |

**User's choice:** Camera stays live, overlay status change
**Notes:** None

### Give-up Threshold
| Option | Description | Selected |
|--------|-------------|----------|
| 2 minutes, then end session | Matches Gemini sessionResumption window. Shows "Connection lost" + "Start New Session" button. | ✓ |
| 5 minutes | More patient but Gemini token may expire anyway. | |
| Never — technician decides | Keep trying until manual end. Persistent but confusing if session expired server-side. | |

**User's choice:** 2 minutes, then end session
**Notes:** None

### Connection Status Display
| Option | Description | Selected |
|--------|-------------|----------|
| Traffic light: green/yellow/red | Green "Connected", yellow "Reconnecting...", red "Connection lost". Readable at a glance. | ✓ |
| Traffic light + countdown timer | Same colors plus reconnection countdown ("Reconnecting... 45s"). More info but noisier. | |
| You decide | Claude decides best status display. | |

**User's choice:** Traffic light: green/yellow/red
**Notes:** None

---

## Claude's Discretion

- WebSocket connection management implementation details
- Camera JPEG capture implementation
- Audio recording/playback library choice
- Zustand store shape for session state
- Session screen route structure in Expo Router
- Android foreground service notification content
- Screen wake lock implementation
- Tool call visual feedback
- Exact animation/transition details

## Deferred Ideas

None — discussion stayed within phase scope
