import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'
import { ElevenLabsClient } from 'elevenlabs'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function getElevenLabs() {
  return new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY! })
}

function getGenAI() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
}

const SINGLE_PROMPT = `You are a hospital request classifier. Given a patient's voice transcript, produce a JSON object with these fields:
- "title": a short (2-4 word) problem statement, e.g. "IV Site Pain", "Need Food", "Restroom Assist"
- "category": one of DIETARY, MEDICATION, RESTROOM ASSIST, PAIN REPORTED, EQUIPMENT, GENERAL
- "severity": one of STABLE, NEEDS ATTENTION, CRITICAL

Respond ONLY with the JSON object, no other text.

Transcript: `

const MULTI_PROMPT = `You are a hospital request classifier. A patient has made multiple requests. Given ALL of their transcripts below, produce a single unified JSON object that summarizes the overall situation:
- "title": a short (2-4 word) overall problem statement that captures the combined requests
- "categories": an array of ALL relevant categories that apply across the requests, from: DIETARY, MEDICATION, RESTROOM ASSIST, PAIN REPORTED, EQUIPMENT, GENERAL. Include every category that is relevant.
- "severity": the HIGHEST severity across all requests from: STABLE, NEEDS ATTENTION, CRITICAL

Respond ONLY with the JSON object, no other text.

Transcripts:
`

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase()
    const elevenlabs = getElevenLabs()
    const genai = getGenAI()

    const formData = await req.formData()
    const audioFile = formData.get('audio') as File | null
    const patientName = formData.get('patient') as string | null

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }
    if (!patientName) {
      return NextResponse.json({ error: 'No patient name provided' }, { status: 400 })
    }

    // 1. Look up patient
    const { data: patients, error: patientError } = await supabase
      .from('patients')
      .select('*, beds(*, rooms(*))')
      .ilike('name', `%${patientName}%`)

    if (patientError || !patients?.length) {
      return NextResponse.json({ error: `Patient "${patientName}" not found` }, { status: 404 })
    }

    const patient = patients[0]
    const bedId = patient.bed_id

    // 2. Upload audio to Supabase Storage
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const ext = audioFile.name.split('.').pop() || 'mp4'
    const filename = `${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('audio-recordings')
      .upload(filename, buffer, { contentType: audioFile.type || 'audio/mpeg' })

    if (uploadError) {
      return NextResponse.json({ error: 'Failed to upload audio', details: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from('audio-recordings')
      .getPublicUrl(filename)
    const audioUrl = urlData.publicUrl

    // 3. Transcribe with ElevenLabs
    const transcription = await elevenlabs.speechToText.convert({
      file: audioFile,
      model_id: 'scribe_v1',
    })

    const originalTranscript = transcription.text || ''
    const detectedLanguage = (transcription as unknown as { language_code?: string }).language_code || 'en'
    const isEnglish = detectedLanguage.startsWith('en')

    // Translate to English if not English, using Gemini
    let translatedTranscript: string | null = null
    let translatedAudioUrl: string | null = null
    let transcript = originalTranscript

    if (!isEnglish && originalTranscript) {
      const translationResponse = await genai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: `Translate the following text to English. Return ONLY the translated text, nothing else.\n\nText: ${originalTranscript}`,
      })
      translatedTranscript = translationResponse.text?.trim() || originalTranscript
      transcript = translatedTranscript

      // Generate English TTS audio
      try {
        const ttsAudio = await elevenlabs.textToSpeech.convert('JBFqnCBsd6RMkjVDRZzb', {
          text: translatedTranscript,
          modelId: 'eleven_multilingual_v2',
          outputFormat: 'mp3_44100_128',
        })

        // Convert stream to buffer and upload
        const chunks: Uint8Array[] = []
        for await (const chunk of ttsAudio as AsyncIterable<Uint8Array>) {
          chunks.push(chunk)
        }
        const ttsBuffer = Buffer.concat(chunks)
        const ttsFilename = `translated-${crypto.randomUUID()}.mp3`

        await supabase.storage
          .from('audio-recordings')
          .upload(ttsFilename, ttsBuffer, { contentType: 'audio/mpeg' })

        const { data: ttsUrlData } = supabase.storage
          .from('audio-recordings')
          .getPublicUrl(ttsFilename)
        translatedAudioUrl = ttsUrlData.publicUrl
      } catch (ttsErr) {
        console.error('TTS generation failed:', ttsErr)
      }
    }

    // 4. Check for existing pending request for this bed
    const now = new Date().toISOString()

    const { data: existing } = await supabase
      .from('requests')
      .select('*, entries:request_entries(*)')
      .eq('bed_id', bedId)
      .neq('status', 'resolved')

    let reqId: string
    let allTranscripts: string[]

    if (existing?.length) {
      // Existing request — collect all previous transcripts + the new one
      reqId = existing[0].id
      const prevTranscripts = (existing[0].entries || []).map((e: { transcript: string }) => e.transcript)
      allTranscripts = [...prevTranscripts, transcript]

      const newCount = (existing[0].repeat_count || 1) + 1
      await supabase
        .from('requests')
        .update({ repeat_count: newCount, updated_at: now })
        .eq('id', reqId)
    } else {
      // New request
      const { data: newReq, error: insertError } = await supabase
        .from('requests')
        .insert({
          bed_id: bedId,
          status: 'pending',
          repeat_count: 1,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()

      if (insertError || !newReq) {
        return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
      }
      reqId = newReq.id
      allTranscripts = [transcript]
    }

    // 5. Classify with Gemini — use multi-transcript prompt if multiple entries
    const isMulti = allTranscripts.length > 1
    const prompt = isMulti
      ? MULTI_PROMPT + allTranscripts.map((t, i) => `${i + 1}. "${t}"`).join('\n')
      : SINGLE_PROMPT + transcript

    let classification: { title: string; category: string; severity: string }

    if (isMulti) {
      const geminiResponse = await genai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object' as const,
            properties: {
              title: { type: 'string' as const },
              categories: { type: 'array' as const, items: { type: 'string' as const } },
              severity: { type: 'string' as const },
            },
            required: ['title', 'categories', 'severity'],
          },
        },
      })

      try {
        const parsed = JSON.parse(geminiResponse.text || '{}')
        const categories = Array.isArray(parsed.categories) ? parsed.categories : [parsed.categories || 'GENERAL']
        classification = {
          title: parsed.title || 'PATIENT REQUEST',
          category: categories.join(', '),
          severity: parsed.severity || 'NEEDS ATTENTION',
        }
      } catch {
        classification = { title: 'PATIENT REQUEST', category: 'GENERAL', severity: 'NEEDS ATTENTION' }
      }
    } else {
      const geminiResponse = await genai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object' as const,
            properties: {
              title: { type: 'string' as const },
              category: { type: 'string' as const },
              severity: { type: 'string' as const },
            },
            required: ['title', 'category', 'severity'],
          },
        },
      })

      try {
        classification = JSON.parse(geminiResponse.text || '{}')
      } catch {
        classification = { title: 'PATIENT REQUEST', category: 'GENERAL', severity: 'NEEDS ATTENTION' }
      }
    }

    // 6. Add new request entry with classification
    await supabase.from('request_entries').insert({
      request_id: reqId,
      transcript,
      original_transcript: isEnglish ? null : originalTranscript,
      translated_transcript: translatedTranscript,
      language: detectedLanguage,
      audio_url: audioUrl,
      translated_audio_url: translatedAudioUrl,
      title: classification.title,
      category: classification.category,
      severity: classification.severity,
      created_at: now,
    })

    // 7. If multiple entries, update ALL entries with the unified classification
    if (isMulti) {
      await supabase
        .from('request_entries')
        .update({
          title: classification.title,
          category: classification.category,
          severity: classification.severity,
        })
        .eq('request_id', reqId)
    }

    return NextResponse.json({
      success: true,
      request_id: reqId,
      patient: patient.name,
      bed_id: bedId,
      transcript,
      original_transcript: isEnglish ? null : originalTranscript,
      translated_transcript: translatedTranscript,
      language: detectedLanguage,
      classification,
      audio_url: audioUrl,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Ingest error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
