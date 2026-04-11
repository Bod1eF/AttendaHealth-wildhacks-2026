# Attenda

Mobile-first nurse request management dashboard. Nurses see incoming patient requests in real time, accept tasks, and track them on a hospital floor plan.

Built with Next.js, Supabase, and Tailwind CSS.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
ELEVENLABS_API_KEY=your-elevenlabs-api-key
```

- **Gemini API key:** get one free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- **ElevenLabs API key:** get one at [elevenlabs.io](https://elevenlabs.io) (free tier available)

### 3. Database

Run the schema against your Supabase project to create tables and seed data:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db query --linked -f supabase/schema.sql
```

This creates: `rooms`, `beds`, `nurses`, `patients`, `requests`, `request_entries` tables with seed data (4 rooms, 8 beds, 1 nurse, 4 patients).

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Log in with:

- **Employee ID:** `NRS-001`
- **Password:** anything (not validated in MVP)

## Adding Patient Requests

The app has a backend API (`POST /api/ingest`) that handles the full pipeline:
1. Uploads audio to Supabase Storage
2. Transcribes audio to text using ElevenLabs (Scribe v1)
3. Classifies the transcript using Gemini 2.0 Flash (title, category, severity)
4. Inserts the request into the database
5. Audio is playable from the dashboard

### Python script

The Python script is a simple CLI wrapper around the API. Make sure the app is running first (`npm run dev`).

#### Install Python dependencies

```bash
pip install -r scripts/requirements.txt
```

#### List available patients

```bash
python scripts/ingest.py --list-patients
```

```
Patients:
  - Robert Chen → Room 1, Bed A (bed_id=1)
  - Maria Garcia → Room 2, Bed B (bed_id=4)
  - James Wilson → Room 4, Bed A (bed_id=7)
  - Eleanor Shellstrop → Room 3, Bed A (bed_id=5)
```

#### Submit a request with an audio file

```bash
python scripts/ingest.py --patient "Robert Chen" --audio path/to/recording.mp4
```

The script sends the audio file to the backend API. You'll see output like:

```
Sending to backend API: http://localhost:3000/api/ingest
Patient: Robert Chen
Audio: recording.mp4

  Patient: Robert Chen
  Bed ID: 1
  Transcript: Nurse, I need help with my IV...
  Classification: {'title': 'IV Assistance', 'category': 'MEDICATION', 'severity': 'NEEDS ATTENTION'}
  Audio URL: https://vnwogmibqucjycyscppw.supabase.co/storage/v1/object/public/audio-recordings/abc123.mp4

Done! Request added and audio is playable from the dashboard.
```

#### Insert demo requests (no audio needed)

```bash
python scripts/ingest.py --demo
```

Inserts 4 hardcoded requests directly into Supabase. No audio file or running backend needed.

### Using curl instead

You can also submit requests directly without the Python script:

```bash
curl -X POST http://localhost:3000/api/ingest \
  -F "patient=Robert Chen" \
  -F "audio=@recording.mp4"
```

## Project Structure

```
src/
  app/
    api/ingest/        # Backend API (audio upload, transcription, classification)
    dashboard/         # Main dashboard (layout + pages)
    login/             # Login page
  components/          # UI components (FloorPlanMap, RequestQueue, etc.)
  context/             # Auth + Toast context providers
  hooks/               # Data hooks (useRequests, useRooms)
  lib/                 # Supabase client, server actions
  types/               # TypeScript types
scripts/
  ingest.py            # Python CLI for submitting patient requests
supabase/
  schema.sql           # Database schema + seed data
```
