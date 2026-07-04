import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import db from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getNextTokenNumber, renumberTokens } from '../utils/tokens.js';

const router = Router();
router.use(requireAuth, requireRole('hospital'));

// Every route below is implicitly scoped to req.user.hospitalId
const hid = (req) => req.user.hospitalId;

// ---------- Hospital profile ----------

router.get('/profile', (req, res) => {
  const hospital = db.prepare(
    `SELECT id, hospital_name, email, contact_number, hospital_address, timing,
            logo_url, banner_url, header_color, rep_name, rep_contact_number, rep_designation,
            rep_age, rep_gender, district, state, pincode,
            status, activation_date FROM hospitals WHERE id = ?`
  ).get(hid(req));
  res.json(hospital);
});

router.patch('/profile', (req, res) => {
  const fields = ['hospital_name', 'contact_number', 'hospital_address', 'timing', 'logo_url', 'banner_url', 'header_color',
    'rep_name', 'rep_contact_number', 'rep_designation', 'rep_age', 'rep_gender', 'district', 'state', 'pincode'];
  const updates = [];
  const params = { id: hid(req) };
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = @${f}`);
      params[f] = req.body[f];
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
  db.prepare(`UPDATE hospitals SET ${updates.join(', ')} WHERE id = @id`).run(params);
  res.json({ message: 'Profile updated' });
});

// ---------- Manage Doctors ----------

router.get('/doctors', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const doctors = db.prepare(
    `SELECT id, doctor_name, speciality, contact_number, email, age, gender, district, state, pincode, experience_years, certifications, avg_minutes_per_patient, status, created_at
     FROM doctors WHERE hospital_id = ? ORDER BY created_at DESC`
  ).all(hid(req));

  const doctorsWithSchedule = doctors.map(doctor => {
    const schedule = db.prepare(
      `SELECT is_available, timeslots FROM doctor_schedules WHERE doctor_id = ? AND date = ?`
    ).get(doctor.id, date);
    return {
      ...doctor,
      schedule: {
        is_available: schedule?.is_available === 1,
        timeslots: schedule?.timeslots ? JSON.parse(schedule.timeslots) : [],
      }
    };
  });

  res.json(doctorsWithSchedule);
});

router.post('/doctors', (req, res) => {
  const { doctor_name, speciality, contact_number, email, password, avg_minutes_per_patient, age, gender, district, state, pincode, experience_years, certifications } = req.body;
  if (!doctor_name || !email || !password) {
    return res.status(400).json({ error: 'doctor_name, email, and password are required' });
  }
  const id = uuid();
  const password_hash = bcrypt.hashSync(password, 10);
  try {
    db.prepare(
      `INSERT INTO doctors (id, hospital_id, doctor_name, speciality, contact_number, email, age, gender, district, state, pincode, experience_years, certifications, password_hash, avg_minutes_per_patient)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id, hid(req), doctor_name, speciality || null, contact_number || null, email, age || null, gender || null,
      district || null, state || null, pincode || null, experience_years || null,
      certifications ? JSON.stringify(certifications) : null, password_hash, avg_minutes_per_patient || 15
    );
    res.status(201).json({ id, message: 'Doctor added' });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) return res.status(409).json({ error: 'Email already in use' });
    res.status(500).json({ error: err.message });
  }
});

router.patch('/doctors/:id', (req, res) => {
  const doctor = db.prepare('SELECT * FROM doctors WHERE id = ? AND hospital_id = ?').get(req.params.id, hid(req));
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

  const fields = ['doctor_name', 'speciality', 'contact_number', 'email', 'age', 'gender', 'district', 'state', 'pincode', 'experience_years', 'avg_minutes_per_patient', 'status'];
  const updates = [];
  const params = { id: req.params.id };
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = @${f}`);
      params[f] = req.body[f];
    }
    // If email is being updated, we need to ensure it's not already in use by another doctor.
    if (f === 'email' && req.body.email) {
      const existing = db.prepare('SELECT id FROM doctors WHERE email = ? AND id != ?').get(req.body.email, req.params.id);
      if (existing) return res.status(409).json({ error: 'Email already in use by another doctor' });
    }
  }
  if (req.body.certifications !== undefined) {
    updates.push('certifications = @certifications');
    params.certifications = req.body.certifications ? JSON.stringify(req.body.certifications) : null;
  }
  if (req.body.password) {
    updates.push('password_hash = @password_hash');
    params.password_hash = bcrypt.hashSync(req.body.password, 10);
  }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
  try {
    db.prepare(`UPDATE doctors SET ${updates.join(', ')} WHERE id = @id`).run(params);
    res.json({ message: 'Doctor updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update doctor. The email may already be in use.' });
  }
});

router.delete('/doctors/:id', (req, res) => {
  db.prepare('DELETE FROM doctors WHERE id = ? AND hospital_id = ?').run(req.params.id, hid(req));
  res.json({ message: 'Doctor removed' });
});

router.get('/doctors/:id/schedule', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const schedule = db.prepare(
    `SELECT is_available, timeslots FROM doctor_schedules WHERE doctor_id = ? AND date = ? AND hospital_id = ?`
  ).get(req.params.id, date, hid(req));

  if (schedule) {
    res.json({
      is_available: schedule.is_available === 1,
      timeslots: JSON.parse(schedule.timeslots || '[]'),
    });
  } else {
    res.json({ is_available: false, timeslots: [] });
  }
});

router.post('/doctors/:id/schedule', (req, res) => {
  const date = req.body.date || new Date().toISOString().slice(0, 10);
  const { is_available, timeslots } = req.body;
  const timeslotsJson = JSON.stringify(timeslots || []);
  db.prepare(`INSERT OR REPLACE INTO doctor_schedules (doctor_id, hospital_id, date, is_available, timeslots) VALUES (?, ?, ?, ?, ?)`).run(req.params.id, hid(req), date, is_available ? 1 : 0, timeslotsJson);
  res.json({ message: 'Schedule updated' });
});

// ---------- Manage Patients ----------

router.get('/patients', (req, res) => {
  const { q } = req.query;
  if (q) {
    res.json(
      db.prepare(
        `SELECT * FROM patients WHERE hospital_id = ? AND (patient_name LIKE ? OR contact_number LIKE ?)
         ORDER BY created_at DESC`
      ).all(hid(req), `%${q}%`, `%${q}%`)
    );
  } else {
    res.json(db.prepare('SELECT * FROM patients WHERE hospital_id = ? ORDER BY created_at DESC').all(hid(req)));
  }
});

router.post('/patients', (req, res) => {
  const {
    patient_name, contact_number, email, address, whatsapp_available,
    adhar_card, age, gender, district, state, pincode,
  } = req.body;
  if (!patient_name || !contact_number) {
    return res.status(400).json({ error: 'patient_name and contact_number are required' });
  }
  const id = uuid();
  db.prepare(
    `INSERT INTO patients (id, hospital_id, patient_name, contact_number, email, address, whatsapp_available,
      adhar_card, age, gender, district, state, pincode)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, hid(req), patient_name, contact_number, email || null, address || null, whatsapp_available ? 1 : 0,
    adhar_card || null, age || null, gender || null, district || null, state || null, pincode || null
  );
  res.status(201).json({ id, message: 'Patient added' });
});

router.patch('/patients/:id', (req, res) => {
  const fields = ['patient_name', 'contact_number', 'email', 'address', 'whatsapp_available',
    'adhar_card', 'age', 'gender', 'district', 'state', 'pincode'];
  const updates = [];
  const params = { id: req.params.id, hospital_id: hid(req) };
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = @${f}`);
      params[f] = f === 'whatsapp_available' ? (req.body[f] ? 1 : 0) : req.body[f];
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
  db.prepare(`UPDATE patients SET ${updates.join(', ')} WHERE id = @id AND hospital_id = @hospital_id`).run(params);
  res.json({ message: 'Patient updated' });
});

router.delete('/patients/:id', (req, res) => {
  db.prepare('DELETE FROM patients WHERE id = ? AND hospital_id = ?').run(req.params.id, hid(req));
  res.json({ message: 'Patient removed' });
});

router.get('/insights', (req, res) => {
  const { start_date, end_date } = req.query;
  const startDate = start_date || new Date().toISOString().slice(0, 10);
  const endDate = end_date || startDate;

  const insights = db.prepare(
    `SELECT
      COUNT(*) AS totalAppointments,
      COALESCE(SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END), 0) AS scheduledAppointments,
      COALESCE(SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END), 0) AS inProgressAppointments,
      COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS completedAppointments,
      COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelledAppointments
    FROM appointments
    WHERE hospital_id = ? AND appointment_date BETWEEN ? AND ?`
  ).get(hid(req), startDate, endDate);

  const doctorCount = db.prepare('SELECT COUNT(*) AS count FROM doctors WHERE hospital_id = ?').get(hid(req)).count;
  const patientCount = db.prepare('SELECT COUNT(*) AS count FROM patients WHERE hospital_id = ?').get(hid(req)).count;

  res.json({
    ...insights,
    doctorCount,
    patientCount,
    startDate,
    endDate,
  });
});

// ---------- Manage Appointments / Token Generation ----------

router.get('/appointments', (req, res) => {
  const { date, doctor_id } = req.query;
  const { patient_id } = req.query;
  let sql = `
    SELECT a.*, p.patient_name, p.contact_number AS patient_contact, p.whatsapp_available,
           d.doctor_name, d.speciality
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    JOIN doctors d ON d.id = a.doctor_id
    WHERE a.hospital_id = ?`;
  const params = [hid(req)];
  if (date) { sql += ' AND a.appointment_date = ?'; params.push(date); }
  if (doctor_id) { sql += ' AND a.doctor_id = ?'; params.push(doctor_id); }
  if (patient_id) { sql += ' AND a.patient_id = ?'; params.push(patient_id); }
  sql += ' ORDER BY a.appointment_date ASC, a.token_number ASC';
  res.json(db.prepare(sql).all(...params));
});

// Create appointment -> auto-generates the next token number for that doctor/date
router.post('/appointments', (req, res) => {
  const { doctor_id, patient_id, appointment_date, notes, timeslot } = req.body;
  if (!doctor_id || !patient_id || !appointment_date || !timeslot) {
    return res.status(400).json({ error: 'doctor_id, patient_id, appointment_date, and timeslot are required' });
  }
  const doctor = db.prepare('SELECT id, avg_minutes_per_patient FROM doctors WHERE id = ? AND hospital_id = ?').get(doctor_id, hid(req));
  if (!doctor) return res.status(404).json({ error: 'Doctor not found in this hospital' });

  const schedule = db.prepare('SELECT timeslots FROM doctor_schedules WHERE doctor_id = ? AND date = ? AND is_available = 1').get(doctor_id, appointment_date);
  const availableTimeslots = schedule ? JSON.parse(schedule.timeslots) : [];
  if (!availableTimeslots.includes(timeslot)) {
    return res.status(400).json({ error: 'The selected timeslot is not available for this doctor on this date.' });
  }

  const maxAppointmentsInSlot = Math.floor(60 / (doctor.avg_minutes_per_patient || 15));
  const existingAppointmentsInSlot = db.prepare('SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND timeslot = ? AND status != ?').get(doctor_id, appointment_date, timeslot, 'cancelled').count;
  if (existingAppointmentsInSlot >= maxAppointmentsInSlot) {
    return res.status(409).json({ error: 'This timeslot is already full.' });
  }

  const tokenNumber = getNextTokenNumber(db, doctor_id, appointment_date);
  const id = uuid();
  db.prepare(
    `INSERT INTO appointments (id, hospital_id, doctor_id, patient_id, appointment_date, token_number, notes, timeslot)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, hid(req), doctor_id, patient_id, appointment_date, tokenNumber, notes || null, timeslot);

  res.status(201).json({ id, token_number: tokenNumber, message: 'Appointment booked & token generated' });
});

// Reschedule -> moves to a new date, gets a fresh token for that date, old date's queue closes the gap
router.patch('/appointments/:id/reschedule', (req, res) => {
  const { new_date } = req.body;
  if (!new_date) return res.status(400).json({ error: 'new_date is required' });

  const appt = db.prepare('SELECT * FROM appointments WHERE id = ? AND hospital_id = ?').get(req.params.id, hid(req));
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });

  const oldDoctorId = appt.doctor_id;
  const oldDate = appt.appointment_date;
  const newTokenNumber = getNextTokenNumber(db, oldDoctorId, new_date);

  db.prepare(
    `UPDATE appointments SET appointment_date = ?, token_number = ?, status = 'scheduled', updated_at = datetime('now')
     WHERE id = ?`
  ).run(new_date, newTokenNumber, req.params.id);

  renumberTokens(db, oldDoctorId, oldDate); // close the gap left behind on the old date

  res.json({ message: 'Appointment rescheduled', new_token_number: newTokenNumber });
});

// Cancel -> auto-adjusts (renumbers) remaining tokens for that doctor/date
router.patch('/appointments/:id/cancel', (req, res) => {
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ? AND hospital_id = ?').get(req.params.id, hid(req));
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });

  db.prepare(`UPDATE appointments SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
  renumberTokens(db, appt.doctor_id, appt.appointment_date);

  res.json({ message: 'Appointment cancelled; remaining tokens renumbered' });
});

// Click Next — completes the current in-progress token (if any) and activates the next scheduled token for this doctor/date
router.post('/appointments/next', (req, res) => {
  const { doctor_id, date } = req.body;
  if (!doctor_id) return res.status(400).json({ error: 'doctor_id is required' });
  const appointmentDate = date || new Date().toISOString().slice(0, 10);

  const doctor = db.prepare('SELECT id FROM doctors WHERE id = ? AND hospital_id = ?').get(doctor_id, hid(req));
  if (!doctor) return res.status(404).json({ error: 'Doctor not found in this hospital' });

  const current = db.prepare(
    `SELECT * FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND status = 'in_progress'
     ORDER BY token_number ASC LIMIT 1`
  ).get(doctor_id, appointmentDate);

  if (current) {
    db.prepare(`UPDATE appointments SET status = 'completed', updated_at = datetime('now') WHERE id = ?`).run(current.id);
  }

  const next = db.prepare(
    `SELECT * FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND status = 'scheduled'
     ORDER BY token_number ASC LIMIT 1`
  ).get(doctor_id, appointmentDate);

  if (next) {
    db.prepare(`UPDATE appointments SET status = 'in_progress', updated_at = datetime('now') WHERE id = ?`).run(next.id);
  }

  res.json({
    message: 'Advanced to next token',
    completed_token: current ? current.token_number : null,
    now_serving_token: next ? next.token_number : null,
  });
});

// Mark complete / in-progress (also usable by doctor routes, duplicated here for hospital admin control)
router.patch('/appointments/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['scheduled', 'in_progress', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ? AND hospital_id = ?').get(req.params.id, hid(req));
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });

  db.prepare(`UPDATE appointments SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, req.params.id);
  if (status === 'cancelled') renumberTokens(db, appt.doctor_id, appt.appointment_date);
  res.json({ message: `Appointment marked ${status}` });
});

export default router;
