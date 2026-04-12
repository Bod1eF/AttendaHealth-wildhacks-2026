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
  age: number | null
  sex: string | null
  blood_type: string | null
  diagnosis: string | null
  allergies: string[] | null
  emergency_contact: string | null
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
