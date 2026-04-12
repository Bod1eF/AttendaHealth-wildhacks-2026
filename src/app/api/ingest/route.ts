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

const CLASSIFICATION_PROMPT = `You are a hospital request classifier. Given a patient's voice transcript, produce a JSON object with these fields:
- "title": a short (2-4 word) problem statement, e.g. "IV Site Pain", "Need Food", "Restroom Assist"
- "category": one of DIETARY, MEDICATION, RESTROOM ASSIST, PAIN REPORTED, EQUIPMENT, GENERAL
- "severity": one of STABLE, NEEDS ATTENTION, CRITICAL

Respond ONLY with the JSON object, no other text.

Transcript: `

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

    const transcript = transcription.text || ''

    // 4. Classify with Gemini
    const geminiResponse = await genai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: CLASSIFICATION_PROMPT + transcript,
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

    let classification: { title: string; category: string; severity: string }
    try {
      classification = JSON.parse(geminiResponse.text || '{}')
    } catch {
      classification = { title: 'PATIENT REQUEST', category: 'GENERAL', severity: 'NEEDS ATTENTION' }
    }

    // 5. Insert request into Supabase
    const now = new Date().toISOString()

    // Check for existing pending request for this bed
    const { data: existing } = await supabase
      .from('requests')
      .select('*')
      .eq('bed_id', bedId)
      .neq('status', 'resolved')

    let reqId: string

    if (existing?.length) {
      reqId = existing[0].id
      const newCount = (existing[0].repeat_count || 1) + 1
      await supabase
        .from('requests')
        .update({ repeat_count: newCount, updated_at: now })
        .eq('id', reqId)
    } else {
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
    }

    // Add request entry
    await supabase.from('request_entries').insert({
      request_id: reqId,
      transcript,
      audio_url: audioUrl,
      title: classification.title,
      category: classification.category,
      severity: classification.severity,
      created_at: now,
    })

    return NextResponse.json({
      success: true,
      request_id: reqId,
      patient: patient.name,
      bed_id: bedId,
      transcript,
      classification,
      audio_url: audioUrl,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Ingest error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
