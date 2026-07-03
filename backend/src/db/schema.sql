-- ============================================================
-- Appointment Token Management for Clinic — Database Schema
-- ============================================================

CREATE TABLE IF NOT EXISTS super_admins (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Hospital / Clinic (as per "Hospital/Clinic Name" box in diagram)
CREATE TABLE IF NOT EXISTS hospitals (
  id                    TEXT PRIMARY KEY,
  hospital_name         TEXT NOT NULL,
  logo_url              TEXT,
  banner_url            TEXT,
  header_color          TEXT,
  contact_person_name   TEXT,
  email                 TEXT UNIQUE NOT NULL,
  contact_number        TEXT,
  designation            TEXT,
  hospital_address      TEXT,
  timing                TEXT,               -- e.g. "09:00 AM - 08:00 PM"
  password_hash         TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'active', -- active | paused | suspended
  activation_date       TEXT,
  payment_reference     TEXT,
  rep_name              TEXT,
  rep_contact_number    TEXT,
  rep_designation       TEXT,
  rep_age               TEXT,
  rep_gender            TEXT,
  district              TEXT,
  state                 TEXT,
  pincode               TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS doctors (
  id              TEXT PRIMARY KEY,
  hospital_id     TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  doctor_name     TEXT NOT NULL,
  speciality      TEXT,
  contact_number  TEXT,
  email           TEXT,
  age             TEXT,
  gender          TEXT,
  district        TEXT,
  state           TEXT,
  pincode         TEXT,
  experience_years TEXT,
  certifications  TEXT,
  password_hash   TEXT NOT NULL,
  avg_minutes_per_patient INTEGER NOT NULL DEFAULT 15,
  status          TEXT NOT NULL DEFAULT 'active', -- active | inactive
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS patients (
  id                TEXT PRIMARY KEY,
  hospital_id       TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_name      TEXT NOT NULL,
  contact_number    TEXT NOT NULL,
  email             TEXT,
  address           TEXT,
  whatsapp_available INTEGER NOT NULL DEFAULT 0, -- 0/1
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tokens / Appointments — auto-generated daily per doctor
CREATE TABLE IF NOT EXISTS appointments (
  id               TEXT PRIMARY KEY,
  hospital_id      TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  doctor_id        TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id       TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_date TEXT NOT NULL,      -- YYYY-MM-DD, token numbers reset daily per doctor
  token_number     INTEGER NOT NULL,
  status           TEXT NOT NULL DEFAULT 'scheduled',
                   -- scheduled | in_progress | completed | cancelled | rescheduled
  notes            TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_appt_doctor_date ON appointments(doctor_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appt_hospital ON appointments(hospital_id);

-- Banner / Video ads (Super Admin managed, shown on Display Control screen)
CREATE TABLE IF NOT EXISTS banner_ads (
  id           TEXT PRIMARY KEY,
  hospital_id  TEXT REFERENCES hospitals(id) ON DELETE CASCADE, -- NULL = global ad (all clinics)
  title        TEXT NOT NULL,
  media_url    TEXT NOT NULL,
  media_type   TEXT NOT NULL DEFAULT 'image', -- image | video
  active       INTEGER NOT NULL DEFAULT 1,
  start_date   TEXT,
  end_date     TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Display Control device login (Hospital ID + password -> select doctor -> display)
CREATE TABLE IF NOT EXISTS display_sessions (
  id           TEXT PRIMARY KEY,
  hospital_id  TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  doctor_id    TEXT REFERENCES doctors(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
