import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import db from './index.js';
import { getNextTokenNumber } from '../utils/tokens.js';
import { generateHospitalId } from '../utils/ids.js';

const today = new Date().toISOString().slice(0, 10);

function upsertSuperAdmin() {
  const exists = db.prepare('SELECT id FROM super_admins WHERE email = ?').get('admin@clinictokens.app');
  // Ensure doctor_schedules table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS doctor_schedules (
      doctor_id TEXT NOT NULL,
      hospital_id TEXT NOT NULL,
      date TEXT NOT NULL,
      is_available INTEGER NOT NULL DEFAULT 0,
      timeslots TEXT,
      room_number TEXT,
      delay_minutes INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (doctor_id, date),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
      FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
    );
  `);
  // Add timeslot column to appointments if it doesn't exist
  try {
    db.exec('ALTER TABLE appointments ADD COLUMN timeslot TEXT');
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      // if it's not a "duplicate column" error, something is wrong
      throw err;
    }
  }
  try {
    db.exec('ALTER TABLE doctors ADD COLUMN first_name TEXT');
    db.exec('ALTER TABLE doctors ADD COLUMN last_name TEXT');
    db.exec('UPDATE doctors SET first_name = SUBSTR(doctor_name, 1, INSTR(doctor_name, \' \') - 1), last_name = SUBSTR(doctor_name, INSTR(doctor_name, \' \') + 1) WHERE INSTR(doctor_name, \' \') > 0');
    db.exec('UPDATE doctors SET first_name = doctor_name WHERE INSTR(doctor_name, \' \') = 0');
  } catch (e) { /* ignore if columns exist */ }
  try {
    db.exec('ALTER TABLE patients ADD COLUMN first_name TEXT');
    db.exec('ALTER TABLE patients ADD COLUMN last_name TEXT');
    db.exec('UPDATE patients SET first_name = SUBSTR(patient_name, 1, INSTR(patient_name, \' \') - 1), last_name = SUBSTR(patient_name, INSTR(patient_name, \' \') + 1) WHERE INSTR(patient_name, \' \') > 0');
    db.exec('UPDATE patients SET first_name = patient_name WHERE INSTR(patient_name, \' \') = 0');
  } catch (e) { /* ignore if columns exist */ }

  if (exists) return exists.id;
  const id = uuid();
  db.prepare(
    `INSERT INTO super_admins (id, name, email, password_hash) VALUES (?, ?, ?, ?)`
  ).run(id, 'Platform Super Admin', 'admin@clinictokens.app', bcrypt.hashSync('SuperAdmin@123', 10));
  return id;
}

function isNumericHospitalId(id) {
  return /^[0-9]{6}$/.test(id);
}

function upsertHospital() {
  const exists = db.prepare('SELECT id FROM hospitals WHERE email = ?').get('reception@sunrise-clinic.test');
  if (exists) {
    if (!isNumericHospitalId(exists.id)) {
      const newId = generateHospitalId(db);
      db.exec('PRAGMA foreign_keys = OFF');
      try {
        const tables = ['doctors', 'patients', 'appointments', 'banner_ads', 'display_sessions', 'hospitals'];
        for (const table of tables) {
          const key = table === 'hospitals' ? 'id' : 'hospital_id';
          db.prepare(`UPDATE ${table} SET ${key} = ? WHERE ${key} = ?`).run(newId, exists.id);
        }
      } finally {
        db.exec('PRAGMA foreign_keys = ON');
      }
      return newId;
    }
    return exists.id;
  }

  const id = generateHospitalId(db);
  db.prepare(
    `INSERT INTO hospitals
      (id, hospital_name, email, password_hash, contact_number, hospital_address, timing,
       rep_name, rep_contact_number, rep_designation, activation_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`
  ).run(
    id, 'Sunrise Multispeciality Clinic', 'reception@sunrise-clinic.test', bcrypt.hashSync('Hospital@123', 10),
    '+91 98765 43210', '221B Wellness Road, Faridabad, Haryana', '09:00 AM - 08:00 PM',
    'Anita Sharma', '+91 98765 00000', 'Clinic Manager', today
  );
  return id;
}

function upsertDoctor(hospitalId, firstName, lastName, speciality, email) {
  const exists = db.prepare('SELECT id FROM doctors WHERE email = ?').get(email);
  if (exists) return exists.id;
  const id = uuid();
  db.prepare(
    `INSERT INTO doctors (id, hospital_id, first_name, last_name, doctor_name, speciality, contact_number, email, password_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, hospitalId, firstName, lastName, `${firstName} ${lastName}`, speciality, '+91 90000 00001', email, bcrypt.hashSync('Doctor@123', 10));
  return id;
}

function upsertPatient(hospitalId, firstName, lastName, phone) {
  const exists = db.prepare('SELECT id FROM patients WHERE hospital_id = ? AND contact_number = ?').get(hospitalId, phone);
  if (exists) return exists.id;
  const id = uuid();
  db.prepare(
    `INSERT INTO patients (id, hospital_id, first_name, last_name, patient_name, contact_number, whatsapp_available)
     VALUES (?, ?, ?, ?, ?, ?, 1)`
  ).run(id, hospitalId, firstName, lastName, `${firstName} ${lastName}`, phone);
  return id;
}

function bookToken(hospitalId, doctorId, patientId, date, timeslot) {
  const already = db.prepare(
    `SELECT id FROM appointments WHERE doctor_id = ? AND patient_id = ? AND appointment_date = ?`
  ).get(doctorId, patientId, date);
  if (already) return;
  const tokenNumber = getNextTokenNumber(db, doctorId, date);
  db.prepare(
    `INSERT INTO appointments (id, hospital_id, doctor_id, patient_id, appointment_date, token_number, timeslot)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(uuid(), hospitalId, doctorId, patientId, date, tokenNumber, timeslot);
}

const superAdminId = upsertSuperAdmin();
const hospitalId = upsertHospital();
const doctor1 = upsertDoctor(hospitalId, 'Rohan', 'Mehta', 'General Physician', 'rohan.mehta@sunrise-clinic.test');
const doctor2 = upsertDoctor(hospitalId, 'Kavita', 'Iyer', 'Pediatrician', 'kavita.iyer@sunrise-clinic.test');

const patientNames = [
  ['Amit', 'Verma', '+91 91234 00001'], ['Priya', 'Nair', '+91 91234 00002'], ['Suresh', 'Rao', '+91 91234 00003'],
  ['Neha', 'Gupta', '+91 91234 00004'], ['Vikram', 'Singh', '+91 91234 00005'], ['Deepa', 'Joshi', '+91 91234 00006'],
];
const patientIds = patientNames.map(([fname, lname, phone]) => upsertPatient(hospitalId, fname, lname, phone));

// Create a default schedule for the demo doctors for today and the next 7 days
const demoTimeslots = ['09:00AM - 10:00AM', '10:00AM - 11:00AM', '11:00AM - 12:00PM'];
const scheduleStmt = db.prepare(
  `INSERT OR REPLACE INTO doctor_schedules
   (doctor_id, hospital_id, date, is_available, timeslots, room_number)
   VALUES (?, ?, ?, ?, ?, ?)`
);

for (let i = 0; i < 7; i++) {
  const date = new Date();
  date.setDate(date.getDate() + i);
  const dateStr = date.toISOString().slice(0, 10);
  scheduleStmt.run(doctor1, hospitalId, dateStr, 1, JSON.stringify(demoTimeslots), '23');
  scheduleStmt.run(doctor2, hospitalId, dateStr, 1, JSON.stringify(demoTimeslots), '32');
}

// Set avg_minutes_per_patient for demo doctors to enable timeslot capacity calculation
db.prepare(`UPDATE doctors SET avg_minutes_per_patient = 15 WHERE id = ?`).run(doctor1);
db.prepare(`UPDATE doctors SET avg_minutes_per_patient = 15 WHERE id = ?`).run(doctor2);

patientIds.forEach((pid, idx) => {
  // Book demo appointments into the first available timeslot
  const doctorForPatient = idx % 2 === 0 ? doctor1 : doctor2;
  const timeslotForPatient = demoTimeslots[0];
  bookToken(hospitalId, doctorForPatient, pid, today, timeslotForPatient);
});

// Mark the first token of doctor1 as in_progress so the display screen has something to show
const firstAppt = db.prepare(
  `SELECT id FROM appointments WHERE doctor_id = ? AND appointment_date = ? ORDER BY token_number ASC LIMIT 1`
).get(doctor1, today);
if (firstAppt) {
  db.prepare(`UPDATE appointments SET status = 'in_progress' WHERE id = ?`).run(firstAppt.id);
}

// A sample global banner ad
const bannerExists = db.prepare('SELECT id FROM banner_ads LIMIT 1').get();
if (!bannerExists) {
  db.prepare(
    `INSERT INTO banner_ads (id, hospital_id, title, media_url, media_type)
     VALUES (?, NULL, ?, ?, 'image')`
  ).run(uuid(), 'Annual Health Checkup Camp — 20% Off', 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200');
}

console.log('--------------------------------------------------');
console.log('Seed complete. Demo credentials:');
console.log('Super Admin  -> admin@clinictokens.app / SuperAdmin@123');
console.log('Hospital     -> reception@sunrise-clinic.test / Hospital@123');
console.log(`Hospital ID  -> ${hospitalId}`);
console.log('Doctor 1     -> rohan.mehta@sunrise-clinic.test / Doctor@123');
console.log('Doctor 2     -> kavita.iyer@sunrise-clinic.test / Doctor@123');
console.log('--------------------------------------------------');
