# Attenda Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a mobile-first nurse web app with real-time patient request queue, AI classification, floor plan map, and request history.

**Architecture:** Next.js App Router frontend with Supabase for Postgres DB + Realtime subscriptions. Python script for data ingestion with Ollama-powered AI classification. Simple session-based auth against a nurses table.

**Tech Stack:** Next.js 15, Tailwind CSS v4, Supabase JS client, Manrope font, Python 3 + Ollama for ingestion script.

**Design doc:** `docs/plans/2026-04-11-attenda-design.md`

**Figma:** https://www.figma.com/design/rmrnible8rHFt7M1vm2yL9/callbell?node-id=0-1

**Supabase project:** `vnwogmibqucjycyscppw`

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/lib/supabase.ts`, `.env.local`

**Step 1: Initialize Next.js project**

Run:
```bash
cd /Users/andrewxue/project/wildhacks-2026
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```

Expected: Next.js project scaffolded with App Router, Tailwind, TypeScript.

**Step 2: Install Supabase client**

Run:
```bash
npm install @supabase/supabase-js
```

**Step 3: Add Manrope font**

Modify `src/app/layout.tsx`:
- Import Manrope from `next/font/google`
- Apply it as the default font via className on `<html>`

**Step 4: Create Supabase client**

Create `src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Step 5: Create `.env.local`**

```
NEXT_PUBLIC_SUPABASE_URL=https://vnwogmibqucjycyscppw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ask user for anon key>
```

Note: Ask the user for their Supabase anon key before proceeding.

**Step 6: Add design tokens to Tailwind config**

Extend `tailwind.config.ts` with custom colors from the design doc:
- `primary`: `#532AA8`
- `primary-light`: `#6B46C1`
- `primary-muted`: `#6D48B5`
- `bg-main`: `#F9F9FF`
- `bg-queue`: `#F0F3FF`
- `bg-tag`: `#DEE8FF`
- `bg-tag-category`: `rgba(109, 72, 181, 0.1)`
- `bg-critical`: `#FFDAD6`
- `text-primary`: `#111C2C`
- `text-secondary`: `#494453`
- `text-muted`: `#7A7484`
- `text-critical`: `#93000A`
- `border-subtle`: `rgba(203, 195, 213, 0.1)`

**Step 7: Verify dev server starts**

Run:
```bash
npm run dev
```

Expected: App runs on `http://localhost:3000` with no errors.

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Supabase client and design tokens"
```

---

## Task 2: Database Schema Setup

**Files:**
- Create: `supabase/schema.sql`

**Step 1: Write the full schema SQL**

Create `supabase/schema.sql` with all tables from the design doc:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create request status enum
CREATE TYPE request_status AS ENUM ('pending', 'on_the_way', 'resolved');

-- Rooms table
CREATE TABLE rooms (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  position_x REAL NOT NULL DEFAULT 0,
  position_y REAL NOT NULL DEFAULT 0
);

-- Beds table
CREATE TABLE beds (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  offset_x REAL NOT NULL DEFAULT 0,
  offset_y REAL NOT NULL DEFAULT 0
);

-- Nurses table
CREATE TABLE nurses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  employee_id TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  assigned_rooms INTEGER[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Patients table
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  bed_id INTEGER NOT NULL REFERENCES beds(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Requests table
CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bed_id INTEGER NOT NULL REFERENCES beds(id) ON DELETE CASCADE,
  status request_status NOT NULL DEFAULT 'pending',
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  repeat_count INTEGER NOT NULL DEFAULT 1,
  accepted_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Request entries table
CREATE TABLE request_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  transcript TEXT NOT NULL,
  audio_url TEXT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed data: rooms and beds (4 rooms, 2 beds each)
INSERT INTO rooms (id, label, position_x, position_y) VALUES
  (1, 'Room 1', 0, 0),
  (2, 'Room 2', 1, 0),
  (3, 'Room 3', 0, 1),
  (4, 'Room 4', 1, 1);

INSERT INTO beds (id, room_id, label, offset_x, offset_y) VALUES
  (1, 1, 'Bed A', 0, 0),
  (2, 1, 'Bed B', 1, 0),
  (3, 2, 'Bed A', 0, 0),
  (4, 2, 'Bed B', 1, 0),
  (5, 3, 'Bed A', 0, 0),
  (6, 3, 'Bed B', 1, 0),
  (7, 4, 'Bed A', 0, 0),
  (8, 4, 'Bed B', 1, 0);

-- Seed data: a test nurse
INSERT INTO nurses (name, employee_id, password_hash, assigned_rooms) VALUES
  ('Sarah Johnson', 'NRS-001', 'password123', ARRAY[1, 2, 3, 4]);

-- Seed data: patients
INSERT INTO patients (name, bed_id) VALUES
  ('Robert Chen', 1),
  ('Maria Garcia', 4),
  ('James Wilson', 7),
  ('Eleanor Shellstrop', 5);

-- Enable Realtime for requests and request_entries
ALTER PUBLICATION supabase_realtime ADD TABLE requests;
ALTER PUBLICATION supabase_realtime ADD TABLE request_entries;
```

**Step 2: Run the schema in Supabase**

The user should run this SQL in the Supabase SQL Editor at:
`https://supabase.com/dashboard/project/vnwogmibqucjycyscppw/sql/new`

Or run via CLI if they have the Supabase CLI installed.

**Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add database schema with seed data"
```

---

## Task 3: TypeScript Types

**Files:**
- Create: `src/types/database.ts`

**Step 1: Define all database types**

Create `src/types/database.ts`:

```typescript
export type RequestStatus = 'pending' | 'on_the_way' | 'resolved'

export interface Room {
  id: number
  label: string
  position_x: number
  position_y: number
}

export interface Bed {
  id: number
  room_id: number
  label: string
  offset_x: number
  offset_y: number
  room?: Room
}

export interface Nurse {
  id: string
  name: string
  employee_id: string
  assigned_rooms: number[]
  created_at: string
}

export interface Patient {
  id: string
  name: string
  bed_id: number
  created_at: string
}

export interface Request {
  id: string
  bed_id: number
  status: RequestStatus
  is_pinned: boolean
  repeat_count: number
  accepted_at: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
  bed?: Bed
  entries?: RequestEntry[]
}

export interface RequestEntry {
  id: string
  request_id: string
  transcript: string
  audio_url: string | null
  title: string
  category: string
  severity: string
  created_at: string
}
```

**Step 2: Commit**

```bash
git add src/types/database.ts
git commit -m "feat: add TypeScript types for database models"
```

---

## Task 4: Authentication — Login Page

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/context/AuthContext.tsx`
- Modify: `src/app/layout.tsx`

**Step 1: Create AuthContext**

Create `src/context/AuthContext.tsx`:
- Stores the logged-in `Nurse` object in React context
- `login(employeeId, password)` — queries `nurses` table where `employee_id` matches and `password_hash` matches (plain comparison for MVP, no real hashing)
- `logout()` — clears state
- Persists nurse ID in `localStorage`, rehydrates on mount by fetching from Supabase
- Exports `useAuth()` hook

**Step 2: Create Login page**

Create `src/app/login/page.tsx`:
- Match Figma design: Attenda logo/title, "Staff Portal - Authentication required"
- Employee ID input (placeholder: `CP-XXXX-XXXX`)
- Access Key (password) input
- "Authenticate Session" button
- On success: redirect to `/dashboard`
- On failure: show error message
- Styling: purple gradient button, centered layout, Manrope font
- Uses design tokens from Tailwind config

**Step 3: Wrap app in AuthProvider**

Modify `src/app/layout.tsx`:
- Wrap children in `<AuthProvider>`

**Step 4: Test login flow manually**

Run: `npm run dev`
- Navigate to `/login`
- Enter `NRS-001` / `password123`
- Should redirect to `/dashboard`

**Step 5: Commit**

```bash
git add src/context/AuthContext.tsx src/app/login/page.tsx src/app/layout.tsx
git commit -m "feat: add login page and auth context"
```

---

## Task 5: Dashboard Layout with Bottom Nav

**Files:**
- Create: `src/app/dashboard/layout.tsx`
- Create: `src/app/dashboard/page.tsx`
- Create: `src/components/BottomNav.tsx`
- Create: `src/app/dashboard/history/page.tsx`
- Create: `src/app/dashboard/patients/page.tsx`
- Create: `src/app/dashboard/settings/page.tsx`

**Step 1: Create BottomNav component**

Create `src/components/BottomNav.tsx`:
- 4 tab icons: Home (house), History (clock), Patients (people), Settings (gear)
- Use simple SVG icons or unicode characters
- Active tab: purple background with white icon, label in purple
- Inactive tabs: muted icon and label
- Fixed to bottom of screen
- Match Figma: rounded top corners, backdrop blur, shadow
- Uses `usePathname()` from `next/navigation` to determine active tab
- Each tab is a `<Link>` to the corresponding route

**Step 2: Create dashboard layout**

Create `src/app/dashboard/layout.tsx`:
- Auth guard: redirect to `/login` if not authenticated
- Header bar: nurse avatar/name, "ATTENDA CARE" subtitle, "DAY SHIFT" badge, notification icon
- Render `{children}` in main content area
- Render `<BottomNav />` fixed at bottom
- Background color: `#F9F9FF`

**Step 3: Create placeholder pages**

Create `/dashboard/page.tsx` — empty for now, "Home" text
Create `/dashboard/history/page.tsx` — "Request History" placeholder
Create `/dashboard/patients/page.tsx` — "Patients - Coming Soon" placeholder
Create `/dashboard/settings/page.tsx` — "Settings - Coming Soon" placeholder

**Step 4: Test navigation manually**

Run: `npm run dev`
- Login → see dashboard with bottom nav
- Tap each tab → correct page loads, active state updates

**Step 5: Commit**

```bash
git add src/app/dashboard/ src/components/BottomNav.tsx
git commit -m "feat: add dashboard layout with bottom nav and placeholder pages"
```

---

## Task 6: Data Fetching Hooks

**Files:**
- Create: `src/hooks/useRequests.ts`
- Create: `src/hooks/useRooms.ts`

**Step 1: Create useRooms hook**

Create `src/hooks/useRooms.ts`:
- Fetches rooms and beds for the logged-in nurse's `assigned_rooms`
- Returns `{ rooms, beds, loading, error }`
- Joins beds onto rooms

**Step 2: Create useRequests hook**

Create `src/hooks/useRequests.ts`:
- Fetches all non-resolved requests where `bed_id` is in a bed belonging to the nurse's assigned rooms
- Joins `request_entries` onto each request
- Joins `beds` and `rooms` onto each request
- Sets up Supabase Realtime subscription for `requests` and `request_entries` tables
- On INSERT/UPDATE to `requests`: refetch or update local state
- On INSERT to `request_entries`: append to the matching request's entries
- Returns `{ requests, currentTask, loading, error, refetch }`
  - `currentTask`: the single request with `status = 'on_the_way'`, or null
  - `requests`: all non-resolved requests excluding the current task, sorted by pinned first then chronological

**Step 3: Commit**

```bash
git add src/hooks/
git commit -m "feat: add data fetching hooks with realtime subscriptions"
```

---

## Task 7: Request Actions

**Files:**
- Create: `src/lib/actions.ts`

**Step 1: Create server action functions**

Create `src/lib/actions.ts` with functions that call Supabase:

```typescript
// acceptRequest(requestId) — set status='on_the_way', accepted_at=now
// resolveRequest(requestId) — set status='resolved', resolved_at=now
// togglePin(requestId, isPinned) — toggle is_pinned
```

Each function:
- Takes request ID as input
- Updates the `requests` table via Supabase client
- Returns `{ success, error }`

These are client-side functions (not Next.js Server Actions) since we're using the Supabase JS client directly.

**Step 2: Commit**

```bash
git add src/lib/actions.ts
git commit -m "feat: add request action functions"
```

---

## Task 8: Current Task Bar Component

**Files:**
- Create: `src/components/CurrentTaskBar.tsx`

**Step 1: Build the component**

Create `src/components/CurrentTaskBar.tsx`:
- Props: `currentTask: Request | null`
- If null: show "CURRENT TASK" label with empty state (no active task)
- If set: show purple gradient card with:
  - Location icon (fork/knife SVG or similar from Figma)
  - "ROOM X, BED Y" label (from `currentTask.bed.room.label` + `currentTask.bed.label`)
  - Truncated patient request title from latest entry
  - Chevron right icon
  - Live timer: `useEffect` with `setInterval` every 1s, computes `now - accepted_at`, displays as "Active Xm Ys"
  - Pulsing green dot next to timer
- Tapping the card opens the expanded modal (handled by parent via callback prop)
- Background: `#F0F3FF` section with padding

**Step 2: Commit**

```bash
git add src/components/CurrentTaskBar.tsx
git commit -m "feat: add current task bar component with live timer"
```

---

## Task 9: Request Card Component

**Files:**
- Create: `src/components/RequestCard.tsx`

**Step 1: Build the component**

Create `src/components/RequestCard.tsx`:
- Props: `request: Request`, `onTap: (request) => void`, `onBedHighlight: (bedId) => void`
- Left side: bed label badge (circle, e.g. "1A") with time indicator below (e.g. "NOW", "08M" — computed from `created_at`)
- Right side:
  - Title (bold, uppercase) from latest `request_entry.title`
  - Repeat badge "x2" if `repeat_count > 1` (red background, positioned top-right of title row)
  - Transcript bubble: light blue rounded pill with audio icon + truncated transcript text
  - Category and severity tags below transcript
- Active card (first in queue, has purple left border accent): uses `border-l-4 border-primary` and slightly elevated shadow
- Regular card: white bg, subtle border, minimal shadow
- On tap: calls `onTap(request)` to open modal
- On render: calls `onBedHighlight` for cross-linking (handled by parent)

**Step 2: Commit**

```bash
git add src/components/RequestCard.tsx
git commit -m "feat: add request card component"
```

---

## Task 10: Request Queue Component

**Files:**
- Create: `src/components/RequestQueue.tsx`

**Step 1: Build the component**

Create `src/components/RequestQueue.tsx`:
- Props: `requests: Request[]`, `onCardTap: (request) => void`, `onBedHighlight: (bedId) => void`, `highlightedRequestId: string | null`
- Header row: "Request Queue" title + filter pills ("All (N)", "Critical (N)")
  - "All" shows all requests
  - "Critical" filters to `severity === 'CRITICAL'` or `severity === 'NEEDS ATTENTION'`
  - Active filter pill: purple gradient bg, white text
  - Inactive pill: light blue bg, dark text
- Scrollable list of `<RequestCard>` components
- Each card gets a `ref` for scroll-to functionality (used by map cross-linking)
- When `highlightedRequestId` changes, scroll to that card and apply a brief highlight animation
- Expose scroll-to function via `useImperativeHandle` or callback ref map

**Step 2: Commit**

```bash
git add src/components/RequestQueue.tsx
git commit -m "feat: add request queue component with filter pills"
```

---

## Task 11: Floor Plan Map Component

**Files:**
- Create: `src/components/FloorPlanMap.tsx`

**Step 1: Build the component**

Create `src/components/FloorPlanMap.tsx`:
- Props: `rooms: Room[]`, `beds: Bed[]`, `requests: Request[]`, `currentTask: Request | null`, `onBedTap: (bedId) => void`, `highlightedBedId: number | null`
- Layout matching Figma:
  - Top row: Room 1 (beds 1A, 1B) | Room 2 (beds 2A, 2B)
  - Central corridor: "CORRIDOR 4B" label with dashed line
  - Bottom row: Room 3 (beds 3A, 3B) | Room 4 (beds 4A, 4B)
  - Station indicator on right edge (purple rounded tab with "STATION" text rotated 90deg)
- Each room: light bg rounded container with room label bar at top/bottom + bed markers
- Bed marker states (determined by matching bed ID to requests):
  - No request: neutral `#E7EEFF` bg, gray text
  - Pending: `rgba(83,42,168,0.3)` border, purple text, small dot indicator
  - Current task: `#532AA8` border (thick), purple text, solid dot
  - Critical: `rgba(186,26,26,0.3)` border, red text, red dot
- Header: "Unit 4B Floor Plan" + "ACTIVE: 1A" indicator (shows current task bed)
- On bed tap: calls `onBedTap(bedId)`
- When `highlightedBedId` is set, that bed marker pulses briefly

**Step 2: Commit**

```bash
git add src/components/FloorPlanMap.tsx
git commit -m "feat: add floor plan map component"
```

---

## Task 12: Expanded Card Modal

**Files:**
- Create: `src/components/RequestModal.tsx`

**Step 1: Build the component**

Create `src/components/RequestModal.tsx`:
- Props: `request: Request | null`, `isCurrentTask: boolean`, `hasCurrentTask: boolean`, `onClose: () => void`, `onAccept: (id) => void`, `onResolve: (id) => void`, `onPin: (id, pinned) => void`
- If `request` is null, don't render
- Modal overlay: semi-transparent backdrop, modal slides up from bottom (not full screen)
- Header: "CURRENT TASK" label, "Room X, Bed Y" title, patient name + ID, "VOICE REQUEST TRANSCRIPT" label with timestamp
- Audio player: play button (purple circle), progress bar, duration display
- Full transcript text in scrollable container
- AI Analysis Engine section:
  - "AI ANALYSIS ENGINE" label
  - Severity tag (e.g. red dot + "POTENTIAL INFILTRATION")
  - Category tag (e.g. "PAIN REPORTED")
- Action buttons at bottom:
  - "Pin Patient" — purple outline button, calls `onPin`
  - "On the Way" — green/purple filled button, calls `onAccept`. If `hasCurrentTask && !isCurrentTask`, show toast "Current task exists" instead
  - "Mark Resolved" — red filled button, only shown if `isCurrentTask`, calls `onResolve`
- Close button (X) in top right

**Step 2: Commit**

```bash
git add src/components/RequestModal.tsx
git commit -m "feat: add expanded request modal"
```

---

## Task 13: Home Page Assembly

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Step 1: Wire up all components**

Modify `src/app/dashboard/page.tsx`:
- Use `useAuth()` to get the nurse
- Use `useRequests()` to get requests + current task
- Use `useRooms()` to get rooms + beds
- State: `selectedRequest`, `highlightedBedId`, `highlightedRequestId`
- Layout (top to bottom):
  1. `<CurrentTaskBar currentTask={currentTask} onTap={openModal} />`
  2. `<RequestQueue requests={requests} onCardTap={openModal} highlightedRequestId={highlightedRequestId} onBedHighlight={setHighlightedBedId} />`
  3. `<FloorPlanMap rooms={rooms} beds={beds} requests={requests} currentTask={currentTask} onBedTap={handleBedTap} highlightedBedId={highlightedBedId} />`
  4. `<RequestModal request={selectedRequest} ... />`

**Cross-linking logic:**
- `handleBedTap(bedId)`: find the request for that bed, set `highlightedRequestId` to scroll queue to it
- `onBedHighlight(bedId)`: set `highlightedBedId` to pulse the bed on the map
- Both highlights clear after 2 seconds via `setTimeout`

**Step 2: Test manually with seed data**

Need to insert some test requests first (Task 15 covers the Python script, but we can insert manually via Supabase dashboard for now).

**Step 3: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: assemble home page with all components"
```

---

## Task 14: History Page

**Files:**
- Modify: `src/app/dashboard/history/page.tsx`
- Create: `src/hooks/useHistory.ts`

**Step 1: Create useHistory hook**

Create `src/hooks/useHistory.ts`:
- Fetches resolved requests for the nurse's assigned rooms
- Fetches today's resolved requests and yesterday's for comparison
- Computes:
  - `totalToday`: count of today's resolved
  - `percentChange`: vs yesterday
  - `avgResponseTime`: average `resolved_at - created_at` in seconds, format as "Xm Ys"
  - `successRate`: resolved / (resolved + pending + on_the_way) for today
- Returns `{ stats, recentResolutions, loading }`

**Step 2: Build the History page**

Modify `src/app/dashboard/history/page.tsx`:
- Header: "Attenda" title with search and avatar icons
- "Request History" heading + "Review completed interactions" subtitle
- Stats cards row:
  - Total Today: big number + percent change badge (green if positive)
  - Avg Response: formatted time
  - Success Rate: percentage
- "Recent Resolutions" list with filter button
- Each resolution entry: patient name, room number, category tag, "RESOLVED" badge (green), timestamp
- Match Figma styling: purple accents, rounded cards, Manrope font

**Step 3: Commit**

```bash
git add src/app/dashboard/history/page.tsx src/hooks/useHistory.ts
git commit -m "feat: add history page with stats and resolution list"
```

---

## Task 15: Python Ingestion Script

**Files:**
- Create: `scripts/ingest.py`
- Create: `scripts/requirements.txt`
- Create: `scripts/sample_audio/` (directory with sample audio files or a note about them)

**Step 1: Create requirements.txt**

```
supabase
openai-whisper
requests
```

**Step 2: Create the ingestion script**

Create `scripts/ingest.py`:
- Takes an audio file path as CLI argument (or generates a test request with hardcoded data)
- If audio file provided:
  1. Transcribe with local Whisper (`whisper` Python package)
  2. Send transcript to Ollama (`http://localhost:11434/api/generate`) using `gemma4:26b` model
  3. Parse JSON response for `title`, `category`, `severity`
  4. Upload audio to Supabase Storage (or skip for MVP, use local path)
- Check if there's an existing unresolved request for that bed:
  - If yes: increment `repeat_count`, insert new `request_entry`
  - If no: create new `request` + `request_entry`
- Config: Supabase URL + service role key from env vars
- Include a `--demo` flag that inserts sample requests with hardcoded data (no audio/AI needed) for testing

**Step 3: Create classification prompt**

The Ollama prompt:
```
You are a hospital request classifier. Given a patient's voice transcript, classify it.

Respond ONLY with valid JSON:
{"title": "SHORT TITLE", "category": "CATEGORY", "severity": "SEVERITY"}

Categories: DIETARY, MEDICATION, RESTROOM ASSIST, PAIN REPORTED, EQUIPMENT, GENERAL
Severities: STABLE, NEEDS ATTENTION, CRITICAL

Transcript: {transcript}
```

**Step 4: Test with demo mode**

Run:
```bash
cd scripts
pip install -r requirements.txt
python ingest.py --demo
```

Expected: Sample requests appear in Supabase.

**Step 5: Commit**

```bash
git add scripts/
git commit -m "feat: add Python ingestion script with Ollama classification"
```

---

## Task 16: Audio Playback

**Files:**
- Create: `src/components/AudioPlayer.tsx`

**Step 1: Build audio player component**

Create `src/components/AudioPlayer.tsx`:
- Props: `audioUrl: string | null`
- Uses browser-native `Audio` API
- Play/pause button (purple circle with play/pause icon)
- Progress bar showing current time / total duration
- Time display: `0:14 / 0:42` format
- Compact inline layout matching Figma
- If `audioUrl` is null, show disabled state

**Step 2: Integrate into RequestModal**

Add `<AudioPlayer>` to the expanded modal where the playback UI is shown.

**Step 3: Integrate into RequestCard**

Add a small play button on the transcript bubble in collapsed cards.

**Step 4: Commit**

```bash
git add src/components/AudioPlayer.tsx src/components/RequestModal.tsx src/components/RequestCard.tsx
git commit -m "feat: add audio playback component"
```

---

## Task 17: Toast Notifications

**Files:**
- Create: `src/components/Toast.tsx`
- Create: `src/context/ToastContext.tsx`

**Step 1: Create toast system**

Create `src/context/ToastContext.tsx`:
- `showToast(message, type)` — displays a toast notification
- Types: `success`, `error`, `info`
- Auto-dismisses after 3 seconds
- Positioned at top center of screen

Create `src/components/Toast.tsx`:
- Renders the toast message with appropriate styling
- Slide-down animation

**Step 2: Wire into layout**

Add `<ToastProvider>` to `src/app/layout.tsx`.

**Step 3: Use in actions**

When "On the Way" is blocked (current task exists), call `showToast("Current task exists — resolve it first", "error")`.
When "Mark Resolved" succeeds, call `showToast("Task resolved", "success")`.

**Step 4: Commit**

```bash
git add src/components/Toast.tsx src/context/ToastContext.tsx src/app/layout.tsx
git commit -m "feat: add toast notification system"
```

---

## Task 18: Auth Guard & Routing

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/dashboard/layout.tsx`

**Step 1: Root redirect**

Modify `src/app/page.tsx`:
- Redirect to `/login` (or `/dashboard` if already authenticated)

**Step 2: Dashboard auth guard**

Modify `src/app/dashboard/layout.tsx`:
- Check `useAuth()` — if no nurse, redirect to `/login`
- Show loading state while auth is rehydrating from localStorage

**Step 3: Login redirect**

Modify `src/app/login/page.tsx`:
- If already authenticated, redirect to `/dashboard`

**Step 4: Test the full auth flow**

- Visit `/` → redirects to `/login`
- Login → redirects to `/dashboard`
- Visit `/dashboard` without login → redirects to `/login`
- Refresh `/dashboard` while logged in → stays on dashboard (localStorage rehydration)

**Step 5: Commit**

```bash
git add src/app/page.tsx src/app/dashboard/layout.tsx src/app/login/page.tsx
git commit -m "feat: add auth guards and routing"
```

---

## Task 19: Polish & Responsive Design

**Files:**
- Modify: various component files

**Step 1: Mobile viewport**

Ensure `src/app/layout.tsx` has proper viewport meta tag:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
```

**Step 2: Touch interactions**

- Add `touch-action: manipulation` to interactive elements to prevent double-tap zoom
- Ensure buttons have adequate tap targets (min 44x44px)
- Add active/pressed states on buttons

**Step 3: Scrolling**

- Request queue: `-webkit-overflow-scrolling: touch` for smooth scrolling
- Ensure bottom nav doesn't overlap content (add bottom padding to main content)
- Modal: prevent body scroll when modal is open

**Step 4: Loading states**

- Add skeleton loaders for request cards while data loads
- Show spinner on login button during auth

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: polish responsive design and mobile interactions"
```

---

## Task 20: End-to-End Test

**Step 1: Start dev server and run through the full flow**

1. Start dev server: `npm run dev`
2. Run Python demo script: `python scripts/ingest.py --demo`
3. Login as nurse NRS-001
4. Verify request cards appear in queue
5. Tap a card → modal opens with transcript + AI tags
6. Tap "On the Way" → card moves to Current Task bar, timer starts
7. Tap a bed on the map → queue scrolls to that card
8. Tap "Mark Resolved" → current task clears
9. Navigate to History → verify resolved request appears with stats
10. Run `python scripts/ingest.py --demo` again → verify new request appears in real-time

**Step 2: Fix any issues found**

**Step 3: Final commit**

```bash
git add -A
git commit -m "fix: address issues from end-to-end testing"
```
