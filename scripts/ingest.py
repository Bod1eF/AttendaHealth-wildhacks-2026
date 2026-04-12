#!/usr/bin/env python3
"""Ingestion script for inserting patient requests into Supabase.

Usage:
  # Demo mode — inserts hardcoded requests (no audio/AI needed)
  python scripts/ingest.py --demo

  # Audio mode — pick a patient, provide an audio file
  python scripts/ingest.py --patient "Robert Chen" --audio recording.mp4

  # List available patients
  python scripts/ingest.py --list-patients
"""

import argparse
import json
import mimetypes
import os
import sys
import uuid
from datetime import datetime, timezone

import requests as http_requests
from dotenv import load_dotenv
from supabase import create_client, Client

# Load .env.local from project root
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")

STORAGE_BUCKET = "audio-recordings"

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "gemma4:26b"

CLASSIFICATION_PROMPT = """You are a hospital request classifier. Given a patient's voice transcript, classify it.

Respond ONLY with valid JSON:
{{"title": "SHORT TITLE", "category": "CATEGORY", "severity": "SEVERITY"}}

Categories: DIETARY, MEDICATION, RESTROOM ASSIST, PAIN REPORTED, EQUIPMENT, GENERAL
Severities: STABLE, NEEDS ATTENTION, CRITICAL

Transcript: {transcript}"""

DEMO_REQUESTS = [
    {
        "bed_id": 1,
        "transcript": "Nurse, I'm sorry to bother you. My IV alarm started beeping and I'm feeling a bit of sharp pain around the site. Could you please come take a look when you have a moment?",
        "title": "IV ALARM & PAIN",
        "category": "MEDICATION",
        "severity": "CRITICAL",
    },
    {
        "bed_id": 4,
        "transcript": "The incision on my leg is starting to throb again. I think the pain medication might be wearing off. Could someone check on it?",
        "title": "PAIN MANAGEMENT",
        "category": "PAIN REPORTED",
        "severity": "NEEDS ATTENTION",
    },
    {
        "bed_id": 7,
        "transcript": "I need help getting to the bathroom please. I'm not feeling very steady on my feet today.",
        "title": "RESTROOM ASSIST",
        "category": "RESTROOM ASSIST",
        "severity": "STABLE",
    },
    {
        "bed_id": 5,
        "transcript": "Hello, Nurse? I'm feeling a bit hungry. Could I get something to eat? Maybe some soup or a sandwich?",
        "title": "DIETARY REQUEST",
        "category": "DIETARY",
        "severity": "STABLE",
    },
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def get_supabase() -> Client:
    """Create and return a Supabase client."""
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def upload_audio(supabase: Client, audio_path: str) -> str:
    """Upload an audio file to Supabase Storage and return the public URL."""
    ext = os.path.splitext(audio_path)[1]
    filename = f"{uuid.uuid4().hex}{ext}"
    content_type = mimetypes.guess_type(audio_path)[0] or "audio/mpeg"

    with open(audio_path, "rb") as f:
        file_data = f.read()

    supabase.storage.from_(STORAGE_BUCKET).upload(
        filename,
        file_data,
        {"content-type": content_type},
    )

    public_url = supabase.storage.from_(STORAGE_BUCKET).get_public_url(filename)
    print(f"  Uploaded audio: {public_url}")
    return public_url


def transcribe_audio(audio_path: str) -> str:
    """Transcribe an audio file using local Whisper."""
    try:
        import whisper

        model = whisper.load_model("base")
        result = model.transcribe(audio_path)
        return result["text"].strip()
    except ImportError:
        print("  Whisper not installed — using filename as transcript fallback.")
        return os.path.splitext(os.path.basename(audio_path))[0]


def classify_transcript(transcript: str) -> dict:
    """Send transcript to Ollama for classification."""
    prompt = CLASSIFICATION_PROMPT.format(transcript=transcript)

    resp = http_requests.post(
        OLLAMA_URL,
        json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
        timeout=120,
    )
    resp.raise_for_status()

    raw = resp.json().get("response", "")
    start = raw.find("{")
    end = raw.rfind("}") + 1
    if start == -1 or end == 0:
        raise ValueError(f"Could not parse JSON from Ollama response: {raw}")

    return json.loads(raw[start:end])


def lookup_patient(supabase: Client, patient_name: str) -> dict:
    """Look up a patient by name and return their record."""
    result = (
        supabase.table("patients")
        .select("*, beds(*, rooms(*))")
        .ilike("name", f"%{patient_name}%")
        .execute()
    )

    if not result.data:
        print(f"Error: No patient found matching '{patient_name}'", file=sys.stderr)
        print("\nAvailable patients:")
        list_patients(supabase)
        sys.exit(1)

    if len(result.data) > 1:
        print(f"Multiple patients match '{patient_name}':")
        for p in result.data:
            bed = p.get("beds", {})
            room = bed.get("rooms", {}) if bed else {}
            print(f"  - {p['name']} (Room {room.get('label', '?')}, {bed.get('label', '?')})")
        sys.exit(1)

    return result.data[0]


def list_patients(supabase: Client) -> None:
    """Print all patients with their bed/room assignments."""
    result = (
        supabase.table("patients")
        .select("*, beds(*, rooms(*))")
        .execute()
    )

    for p in result.data:
        bed = p.get("beds", {})
        room = bed.get("rooms", {}) if bed else {}
        print(f"  - {p['name']} → {room.get('label', '?')}, {bed.get('label', '?')} (bed_id={p['bed_id']})")


def insert_request(
    supabase: Client,
    bed_id: int,
    transcript: str,
    title: str,
    category: str,
    severity: str,
    audio_url: str | None = None,
) -> None:
    """Insert a new request and request_entry into Supabase."""
    now = datetime.now(timezone.utc).isoformat()

    # Check for existing pending request for this bed
    existing = (
        supabase.table("requests")
        .select("*")
        .eq("bed_id", bed_id)
        .neq("status", "resolved")
        .execute()
    )

    if existing.data:
        req = existing.data[0]
        req_id = req["id"]
        new_count = (req.get("repeat_count") or 1) + 1

        supabase.table("requests").update(
            {"repeat_count": new_count, "updated_at": now}
        ).eq("id", req_id).execute()

        print(f"  Updated request {req_id} (repeat #{new_count})")
    else:
        insert_resp = (
            supabase.table("requests")
            .insert({
                "bed_id": bed_id,
                "status": "pending",
                "repeat_count": 1,
                "created_at": now,
                "updated_at": now,
            })
            .execute()
        )
        req_id = insert_resp.data[0]["id"]
        print(f"  Created request {req_id}")

    # Add request entry with audio URL
    supabase.table("request_entries").insert({
        "request_id": req_id,
        "transcript": transcript,
        "audio_url": audio_url,
        "title": title,
        "category": category,
        "severity": severity,
        "created_at": now,
    }).execute()
    print(f"  Added entry (title={title}, severity={severity})")


# ---------------------------------------------------------------------------
# Modes
# ---------------------------------------------------------------------------


def run_demo() -> None:
    """Insert hardcoded demo requests (no audio)."""
    print("Running DEMO mode...\n")
    supabase = get_supabase()

    for item in DEMO_REQUESTS:
        print(f"Bed {item['bed_id']}: {item['title']}")
        insert_request(
            supabase,
            bed_id=item["bed_id"],
            transcript=item["transcript"],
            title=item["title"],
            category=item["category"],
            severity=item["severity"],
        )
        print()

    print("Demo ingestion complete.")


def run_audio(patient_name: str, audio_path: str, api_url: str = "http://localhost:3000/api/ingest") -> None:
    """Send audio to the Next.js backend API for processing."""
    print(f"Sending to backend API: {api_url}")
    print(f"Patient: {patient_name}")
    print(f"Audio: {audio_path}\n")

    with open(audio_path, "rb") as f:
        resp = http_requests.post(
            api_url,
            files={"audio": (os.path.basename(audio_path), f)},
            data={"patient": patient_name},
            timeout=120,
        )

    if resp.status_code != 200:
        print(f"Error ({resp.status_code}): {resp.text}", file=sys.stderr)
        sys.exit(1)

    result = resp.json()
    print(f"  Patient: {result.get('patient')}")
    print(f"  Bed ID: {result.get('bed_id')}")
    print(f"  Transcript: {result.get('transcript')}")
    print(f"  Classification: {result.get('classification')}")
    print(f"  Audio URL: {result.get('audio_url')}")
    print("\nDone! Request added and audio is playable from the dashboard.")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Ingest patient requests into Supabase.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/ingest.py --demo
  python scripts/ingest.py --patient "Robert Chen" --audio recording.mp4
  python scripts/ingest.py --list-patients
        """,
    )
    parser.add_argument("--demo", action="store_true", help="Insert demo requests.")
    parser.add_argument("--patient", type=str, help="Patient name (partial match OK).")
    parser.add_argument("--audio", type=str, help="Path to audio file (.mp3, .mp4, .wav, etc).")
    parser.add_argument("--list-patients", action="store_true", help="List all patients.")

    args = parser.parse_args()

    if args.list_patients:
        supabase = get_supabase()
        print("Patients:")
        list_patients(supabase)
    elif args.demo:
        run_demo()
    elif args.patient and args.audio:
        if not os.path.isfile(args.audio):
            print(f"Error: file not found: {args.audio}", file=sys.stderr)
            sys.exit(1)
        run_audio(args.patient, args.audio)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
