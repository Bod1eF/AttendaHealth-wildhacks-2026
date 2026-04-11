# Attenda - Design Document

## Problem

Hospital call bell systems route all patient requests to a central desk computer, creating bottlenecks, delays when the desk attendant is unavailable, and signal noise where non-urgent complaints pollute the same queue as medical needs.

## Solution

Mobile-first nurse web app that replaces the central desk with a real-time request queue on each nurse's phone, with AI-powered transcription and classification.

## Tech Stack

- **Frontend:** Next.js (App Router), Tailwind CSS
- **Backend:** Supabase (Postgres + Realtime subscriptions)
- **AI Pipeline:** Ollama (local LLM) for classification, local Whisper for transcription (swap to Gemini later)
- **Data Ingestion (MVP):** Python script inserts requests into Supabase
- **Font:** Manrope

## Pages & Navigation

Bottom nav with 4 tabs (visible on all `/dashboard/*` routes):

1. **Home** (`/dashboard`) — Current Task bar, Request Queue, Floor Plan map
2. **History** (`/dashboard/history`) — Request History with stats and resolved request log
3. **Patients** (`/dashboard/patients`) — Placeholder for MVP
4. **Settings** (`/dashboard/settings`) — Placeholder for MVP

**Login** (`/login`) — Nurse ID + password, redirects to Home on success. No bottom nav.

**Expanded Card Modal** — Modal overlay on Home tab, not a separate page.

## Data Model

### `nurses`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| name | text | |
| password_hash | text | |
| assigned_rooms | integer[] | Array of room IDs |
| created_at | timestamp | |

### `rooms`
| Column | Type | Notes |
|--------|------|-------|
| id | integer, PK | |
| label | text | e.g. "Room 1" |
| position_x | float | Position on single floor map |
| position_y | float | |

### `beds`
| Column | Type | Notes |
|--------|------|-------|
| id | integer, PK | |
| room_id | FK → rooms | |
| label | text | e.g. "Bed A" |
| offset_x | float | Position relative to room |
| offset_y | float | |

### `patients`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| name | text | |
| bed_id | FK → beds | |
| created_at | timestamp | |

### `requests`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| bed_id | FK → beds | |
| status | enum | `pending`, `on_the_way`, `resolved` |
| is_pinned | boolean | Default false |
| repeat_count | integer | Default 1 |
| accepted_at | timestamp, nullable | Set on "On the Way" |
| resolved_at | timestamp, nullable | Set on "Mark Resolved" |
| created_at | timestamp | |
| updated_at | timestamp | |

### `request_entries`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| request_id | FK → requests | |
| transcript | text | Voice-to-text output |
| audio_url | text | URL to audio file |
| title | text | AI-generated, e.g. "PAIN MANAGEMENT" |
| category | text | e.g. DIETARY, MEDICATION, RESTROOM ASSIST |
| severity | text | e.g. STABLE, NEEDS ATTENTION, CRITICAL |
| created_at | timestamp | |

## Home Page — Three Sections

### Current Task Bar (fixed top)
- Shows the single active "on the way" request, or empty state
- Displays: room/bed label, truncated patient request, live timer (`now - accepted_at`)
- "Mark Resolved" button — sets `status = resolved`, `resolved_at = now`, clears the bar
- Max one current task at a time

### Request Queue (scrollable middle)
- Cards sorted by: pinned first (chronological), then non-pinned (chronological, newest first)
- Current task is NOT in the queue — it lives in the top bar

**Card (collapsed):**
- Bed label badge (e.g. "1A") with time indicator (e.g. "NOW", "08M")
- Title from AI classification (e.g. "ACTIVE REQUEST", "PAIN MANAGEMENT")
- Single-line truncated transcript with play button
- Category and severity tags
- Repeat badge (e.g. "x2") if `repeat_count > 1`

**Expanded Card Modal (tap a card):**
- Full transcript in scrollable view
- Audio playback for each entry
- All `request_entries` listed (newest first) for repeat calls
- AI Analysis Engine section with category and severity tags
- "On the Way" button — sets `status = on_the_way`, `accepted_at = now`, promotes to Current Task bar. Blocked if a current task already exists (shows message).
- "Pin Patient" button — toggles `is_pinned`
- "Mark Resolved" button (current task only, replaces "On the Way")

### Floor Plan Map (bottom)
- Visual floor plan with interactive bed markers
- Single floor assumed — all nurse's rooms visible without panning
- Rooms positioned via `position_x/y`, beds via `offset_x/y` relative to room
- Central corridor divider between top and bottom room rows
- Station indicator on the right edge

**Bed marker states:**
| State | Visual |
|-------|--------|
| No request | Default neutral |
| Pending request | Highlighted with dot indicator |
| Pinned request | Elevated highlight |
| On the Way (current) | Active color (purple), matching Current Task bar |

**Cross-linking:**
- Tap bed marker → queue scrolls to that bed's card, highlights it
- Tap request card → bed marker highlights/pulses on map
- Tap bed with no active request → no action

## History Page

**Stats header:**
- Total Today — count of resolved requests, with % change vs yesterday
- Avg Response Time — average `resolved_at - created_at` for today
- Success Rate — resolved / total received

**Recent Resolutions list:**
- Each entry: patient name, room number, category tag, "RESOLVED" status, timestamp
- Filter button for category/date filtering
- Scoped to logged-in nurse's assigned rooms

**Implementation:** Stats computed client-side from query results. No separate analytics table.

## AI Analysis Engine

**MVP pipeline (Python script):**
1. Audio file → local Whisper transcription
2. Transcript → Ollama LLM classification → JSON output
3. Insert into Supabase: audio URL, transcript, category, severity, title

**Classification output:**
```json
{ "title": "PAIN MANAGEMENT", "category": "MEDICATION", "severity": "STABLE" }
```

**Predefined categories:** DIETARY, MEDICATION, RESTROOM ASSIST, PAIN REPORTED, EQUIPMENT, GENERAL

**Predefined severities:** STABLE, NEEDS ATTENTION, CRITICAL

**Future:** Swap Ollama calls with Gemini API — same input/output contract.

## Real-Time Updates

**Supabase Realtime subscriptions:**
- `requests` table — filtered by beds in nurse's assigned rooms
- `request_entries` table — joined through bed/room assignment

**Events:**
- New request → card appears in queue, bed highlights on map
- Repeat call → `repeat_count` increments, new entry appended
- Status change → card moves to/from Current Task bar, map updates

**Optimistic UI:** Update UI immediately on nurse actions, sync to Supabase in background. Revert with error toast on failure.

## Authentication

Simple nurse ID + password login validated against the `nurses` table. Session stored in local state/cookie. No Supabase Auth.

## Design Tokens (from Figma)

- **Primary gradient:** `linear-gradient(135deg, #532AA8 0%, #6B46C1 100%)`
- **Background:** `#F9F9FF`
- **Card background:** `#FFFFFF`
- **Queue section bg:** `#F0F3FF`
- **Tag bg (category):** `rgba(109, 72, 181, 0.1)` with `#6D48B5` text
- **Tag bg (severity):** `#D8E3FA` with `#494453` text
- **Critical/repeat badge:** `#FFDAD6` with `#93000A` text
- **Bed active border:** `#532AA8`
- **Bed pending border:** `rgba(83, 42, 168, 0.3)`
- **Text primary:** `#111C2C`
- **Text secondary:** `#494453`
- **Text muted:** `#7A7484`
- **Text on primary:** `#FFFFFF`
- **Font:** Manrope (ExtraBold for labels/headings, Bold for subtext, Regular for body)
