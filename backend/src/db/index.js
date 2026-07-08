import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || './data/clinic.db';
const resolvedPath = path.resolve(process.cwd(), dbPath);

// Ensure the data directory exists
fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

const db = new Database(resolvedPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run schema on boot (idempotent — uses CREATE TABLE IF NOT EXISTS)
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);

// Ensure subscription_plans table exists on every run.
db.exec(`
  CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    max_doctors INTEGER,
    max_patients INTEGER,
    max_tokens INTEGER,
    price_monthly INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS cash_payments (
    id TEXT PRIMARY KEY,
    hospital_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    reference_number TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, verified, rejected
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    verified_at TEXT,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
  );
`);

const hospitalColumns = db.prepare('PRAGMA table_info(hospitals)').all().map((row) => row.name);
if (!hospitalColumns.includes('header_color')) {
  db.prepare('ALTER TABLE hospitals ADD COLUMN header_color TEXT').run();
}
if (!hospitalColumns.includes('subscription_plan_id')) {
  db.prepare('ALTER TABLE hospitals ADD COLUMN subscription_plan_id TEXT REFERENCES subscription_plans(id) ON DELETE SET NULL').run();
}
const hospitalExtras = ['rep_age', 'rep_gender', 'district', 'state', 'pincode'];
for (const column of hospitalExtras) {
  if (!hospitalColumns.includes(column)) {
    db.prepare(`ALTER TABLE hospitals ADD COLUMN ${column} TEXT`).run();
  }
}

const doctorColumns = db.prepare('PRAGMA table_info(doctors)').all().map((row) => row.name);
const doctorExtras = ['age', 'gender', 'district', 'state', 'pincode', 'experience_years', 'certifications'];
// Add photo_url to doctor columns for profile pictures
if (!doctorExtras.includes('photo_url')) doctorExtras.push('photo_url');
for (const column of doctorExtras) {
  if (!doctorColumns.includes(column)) {
    db.prepare(`ALTER TABLE doctors ADD COLUMN ${column} TEXT`).run();
  }
}

const scheduleColumns = db.prepare('PRAGMA table_info(doctor_schedules)').all().map((row) => row.name);
if (!scheduleColumns.includes('room_number')) {
  db.prepare('ALTER TABLE doctor_schedules ADD COLUMN room_number TEXT').run();
}
if (!scheduleColumns.includes('delay_minutes')) {
  db.prepare('ALTER TABLE doctor_schedules ADD COLUMN delay_minutes INTEGER NOT NULL DEFAULT 0').run();
}

const patientColumns = db.prepare('PRAGMA table_info(patients)').all().map((row) => row.name);
const patientExtras = [
  'adhar_card', 'age', 'gender', 'district', 'state', 'pincode',
];
for (const column of patientExtras) {
  if (!patientColumns.includes(column)) {
    db.prepare(`ALTER TABLE patients ADD COLUMN ${column} TEXT`).run();
  }
}

export default db;
