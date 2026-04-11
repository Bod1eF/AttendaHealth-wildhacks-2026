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

-- Seed data: a test nurse (password is plaintext for MVP)
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
