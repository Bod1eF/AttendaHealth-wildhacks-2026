#!/usr/bin/env python3
"""Ingestion script for inserting patient requests into Supabase."""

import argparse
import json
import os
import sys
from datetime import datetime, timezone

import requests
from supabase import create_client, Client

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SUPABASE_URL = os.environ.get(
    "SUPABASE_URL",
    "https://vnwogmibqucjycyscppw.supabase.co",
)
SUPABASE_KEY = os.environ.get(
    "SUPABASE_KEY",
    "SUPABASE_ANON_KEY_REDACTED",
)

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
        "transcript": "Nurse, I'm sorry to bother you. My IV alarm started beeping and I'm feeling a bit of sharp pain around the site. Could you please come take a look when you have a moment? It's Bed B in 102. Thank you.",
        "title": "ACTIVE REQUEST",
        "category": "MEDICATION",
        "severity": "CRITICAL",
    },
    {
        "bed_id": 4,
        "transcript": "The incision on my leg is starting to throb again. I think the pain medication might be wearing off. Could someone check on it?",
        "title": "PAIN MANAGEMENT",
        "category": "MEDICATION",
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
        "bed_id": 1,
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


def transcribe_audio(audio_path: str) -> str:
    """Transcribe an audio file using local Whisper, falling back to filename."""
    try:
        import whisper

        model = whisper.load_model("base")
        result = model.transcribe(audio_path)
        return result["text"].strip()
    except ImportError:
        print("Whisper not available — using filename as transcript fallback.")
        return os.path.splitext(os.path.basename(audio_path))[0]


def classify_transcript(transcript: str) -> dict:
    """Send transcript to Ollama for classification."""
    prompt = CLASSIFICATION_PROMPT.format(transcript=transcript)

    resp = requests.post(
        OLLAMA_URL,
        json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
        timeout=120,
    )
    resp.raise_for_status()

    raw = resp.json().get("response", "")
    # Extract JSON from the response (handle markdown fences, etc.)
    start = raw.find("{")
    end = raw.rfind("}") + 1
    if start == -1 or end == 0:
        raise ValueError(f"Could not parse JSON from Ollama response: {raw}")

    return json.loads(raw[start:end])


def upsert_request(
    supabase: Client,
    bed_id: int,
    transcript: str,
    title: str,
    category: str,
    severity: str,
) -> None:
    """Insert or update a request in Supabase.

    If an unresolved request already exists for the bed, increment its
    repeat_count and add a new request_entry. Otherwise create a new request
    and its first request_entry.
    """
    now = datetime.now(timezone.utc).isoformat()

    # Check for existing unresolved request for this bed
    existing = (
        supabase.table("requests")
        .select("*")
        .eq("bed_id", bed_id)
        .eq("resolved", False)
        .execute()
    )

    if existing.data:
        # Update existing request
        req = existing.data[0]
        req_id = req["id"]
        new_count = (req.get("repeat_count") or 0) + 1

        supabase.table("requests").update(
            {"repeat_count": new_count, "updated_at": now}
        ).eq("id", req_id).execute()

        print(f"  Updated request {req_id} for bed {bed_id} (repeat #{new_count})")
    else:
        # Create new request
        insert_resp = (
            supabase.table("requests")
            .insert(
                {
                    "bed_id": bed_id,
                    "title": title,
                    "category": category,
                    "severity": severity,
                    "repeat_count": 0,
                    "resolved": False,
                    "created_at": now,
                    "updated_at": now,
                }
            )
            .execute()
        )
        req_id = insert_resp.data[0]["id"]
        print(f"  Created request {req_id} for bed {bed_id}")

    # Always add a request_entry
    supabase.table("request_entries").insert(
        {
            "request_id": req_id,
            "transcript": transcript,
            "created_at": now,
        }
    ).execute()
    print(f"  Added request_entry for request {req_id}")


# ---------------------------------------------------------------------------
# Modes
# ---------------------------------------------------------------------------


def run_demo() -> None:
    """Insert hardcoded demo requests."""
    print("Running in DEMO mode...")
    supabase = get_supabase()

    for item in DEMO_REQUESTS:
        print(f"\nProcessing bed {item['bed_id']}: {item['title']}")
        upsert_request(
            supabase,
            bed_id=item["bed_id"],
            transcript=item["transcript"],
            title=item["title"],
            category=item["category"],
            severity=item["severity"],
        )

    print("\nDemo ingestion complete.")


def run_audio(audio_path: str, bed_id: int) -> None:
    """Transcribe an audio file, classify it, and insert into Supabase."""
    print(f"Processing audio: {audio_path} for bed {bed_id}")

    # 1. Transcribe
    transcript = transcribe_audio(audio_path)
    print(f"Transcript: {transcript}")

    # 2. Classify
    classification = classify_transcript(transcript)
    print(f"Classification: {classification}")

    title = classification["title"]
    category = classification["category"]
    severity = classification["severity"]

    # 3. Insert
    supabase = get_supabase()
    upsert_request(supabase, bed_id, transcript, title, category, severity)

    print("\nAudio ingestion complete.")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Ingest patient requests into Supabase."
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Insert hardcoded demo requests (no audio/AI needed).",
    )
    parser.add_argument("--audio", type=str, help="Path to an audio file to process.")
    parser.add_argument(
        "--bed", type=int, help="Bed ID for the audio request."
    )

    args = parser.parse_args()

    if args.demo:
        run_demo()
    elif args.audio and args.bed is not None:
        if not os.path.isfile(args.audio):
            print(f"Error: audio file not found: {args.audio}", file=sys.stderr)
            sys.exit(1)
        run_audio(args.audio, args.bed)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
