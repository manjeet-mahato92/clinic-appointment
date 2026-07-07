import { Router } from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getNextTokenNumber, renumberTokens } from '../utils/tokens.js';

const router = Router();
router.use(requireAuth, requireRole('doctor'));

const did = (req) => req.user.id;
const hid = (req) => req.user.hospitalId;

// Today's (or given date's) queue for this doctor
router.get('/appointments', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const rows = db.prepare(
    `SELECT a.*, p.first_name, p.last_name, p.patient_name, p.contact_number AS patient_contact, p.email AS patient_email,
            p.address AS patient_address, p.whatsapp_available
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     WHERE a.doctor_id = ? AND a.appointment_date = ? AND a.status != 'cancelled'
     ORDER BY a.token_number ASC`
  ).all(did(req), date);
  res.json(rows);
});

// View full patient details (+ their appointment history with this doctor)
router.get('/patients/:patientId', (req, res) => {
  const patient = db.prepare('SELECT * FROM patients WHERE id = ? AND hospital_id = ?').get(req.params.patientId, hid(req));
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  const history = db.prepare(
    `SELECT id, appointment_date, token_number, status, notes
     FROM appointments WHERE doctor_id = ? AND patient_id = ? ORDER BY appointment_date DESC`
  ).all(did(req), req.params.patientId);
  res.json({ ...patient, history });
});

// Appointment Closing — mark the current appointment completed
router.patch('/appointments/:id/complete', (req, res) => {
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ? AND doctor_id = ?').get(req.params.id, did(req));
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  db.prepare(`UPDATE appointments SET status = 'completed', updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
  res.json({ message: 'Appointment closed' });
});

// Click Next — completes the current in-progress token (if any) and activates the next scheduled token
router.post('/appointments/next', (req, res) => {
  const date = req.body.date || new Date().toISOString().slice(0, 10);

  const current = db.prepare(
    `SELECT * FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND status = 'in_progress'
     ORDER BY token_number ASC LIMIT 1`
  ).get(did(req), date);

  if (current) {
    db.prepare(`UPDATE appointments SET status = 'completed', updated_at = datetime('now') WHERE id = ?`).run(current.id);
  }

  const next = db.prepare(
    `SELECT * FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND status = 'scheduled'
     ORDER BY token_number ASC LIMIT 1`
  ).get(did(req), date);

  if (next) {
    db.prepare(`UPDATE appointments SET status = 'in_progress', updated_at = datetime('now') WHERE id = ?`).run(next.id);
  }

  res.json({
    message: 'Advanced to next token',
    completed_token: current ? current.token_number : null,
    now_serving_token: next ? next.token_number : null,
  });
});

// Provide basic hospital info to doctors (for display header)
router.get('/hospital', (req, res) => {
  const hospital = db.prepare('SELECT id, hospital_name, logo_url, banner_url, header_color FROM hospitals WHERE id = ?').get(hid(req));
  if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
  res.json(hospital);
});

// Get current doctor's profile
router.get('/profile', (req, res) => {
  const doctor = db.prepare(
    `SELECT id, hospital_id, first_name, last_name, doctor_name, speciality, contact_number, email, age, gender, district, state, pincode, experience_years, certifications, photo_url, avg_minutes_per_patient, status
     FROM doctors WHERE id = ?`
  ).get(did(req));
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
  res.json(doctor);
});

// Update current doctor's profile
router.patch('/profile', (req, res) => {
  const fields = ['first_name', 'last_name', 'speciality', 'contact_number', 'email', 'age', 'gender', 'district', 'state', 'pincode', 'experience_years', 'avg_minutes_per_patient'];
  const updates = [];
  const params = { id: did(req) };

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = @${f}`);
      params[f] = req.body[f];
    }
    // If email is being updated, we need to ensure it's not already in use by another doctor.
    if (f === 'email' && req.body.email) {
      const existing = db.prepare('SELECT id FROM doctors WHERE email = ? AND id != ?').get(req.body.email, did(req));
      if (existing) return res.status(409).json({ error: 'Email already in use by another doctor' });
    }
  }

  if (req.body.certifications !== undefined) {
    updates.push('certifications = @certifications');
    params.certifications = req.body.certifications ? JSON.stringify(req.body.certifications) : null;
  }

  if (req.body.first_name || req.body.last_name) {
    updates.push('doctor_name = @first_name || \' \' || @last_name');
    params.first_name = req.body.first_name || db.prepare('SELECT first_name FROM doctors WHERE id = ?').get(did(req)).first_name;
    params.last_name = req.body.last_name || db.prepare('SELECT last_name FROM doctors WHERE id = ?').get(did(req)).last_name;
  }
  if (!updates.length) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  try {
    db.prepare(
      `UPDATE doctors SET ${updates.join(', ')} WHERE id = @id`
    ).run(params);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update profile. The email may already be in use.' });
  }

  const updated = db.prepare('SELECT id, hospital_id, first_name, last_name, doctor_name, speciality, contact_number, email, age, gender, district, state, pincode, experience_years, certifications, photo_url, avg_minutes_per_patient, status FROM doctors WHERE id = ?').get(did(req));
  res.json(updated);
});

// Change doctor's own password
router.patch('/profile/password', (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Current and new passwords are required.' });
  }

  const doctor = db.prepare('SELECT password_hash FROM doctors WHERE id = ?').get(did(req));
  if (!doctor || !bcrypt.compareSync(current_password, doctor.password_hash)) {
    return res.status(401).json({ error: 'Current password is not correct.' });
  }

  const new_password_hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE doctors SET password_hash = ? WHERE id = ?').run(new_password_hash, did(req));
  res.json({ message: 'Password updated successfully.' });
});

// Upload profile photo
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsPath = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadsPath, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsPath),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `doctor_${did(req)}_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });

router.post('/profile/photo', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const relPath = `/uploads/${req.file.filename}`;
  db.prepare('UPDATE doctors SET photo_url = ? WHERE id = ?').run(relPath, did(req));
  const updated = db.prepare('SELECT photo_url FROM doctors WHERE id = ?').get(did(req));
  res.json(updated);
});

// Reschedule (doctor-initiated)
router.patch('/appointments/:id/reschedule', (req, res) => {
  const { new_date } = req.body;
  if (!new_date) return res.status(400).json({ error: 'new_date is required' });

  const appt = db.prepare('SELECT * FROM appointments WHERE id = ? AND doctor_id = ?').get(req.params.id, did(req));
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });

  const oldDate = appt.appointment_date;
  const newTokenNumber = getNextTokenNumber(db, did(req), new_date);

  db.prepare(
    `UPDATE appointments SET appointment_date = ?, token_number = ?, status = 'scheduled', updated_at = datetime('now')
     WHERE id = ?`
  ).run(new_date, newTokenNumber, req.params.id);

  renumberTokens(db, did(req), oldDate);

  res.json({ message: 'Appointment rescheduled', new_token_number: newTokenNumber });
});

export default router;
