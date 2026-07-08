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

// ---------- Billing ----------

router.get('/billing', (req, res) => {
  const hospitalId = hid(req);
  const hospital = db.prepare('SELECT subscription_plan_id FROM hospitals WHERE id = ?').get(hospitalId);

  if (!hospital) {
    return res.status(404).json({ error: 'Hospital not found.' });
  }

  let currentPlan = null;
  if (hospital.subscription_plan_id) {
    currentPlan = db.prepare('SELECT * FROM subscription_plans WHERE id = ?').get(hospital.subscription_plan_id);
  }

  const availablePlans = db.prepare('SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY price_monthly ASC').all();

  res.json({ currentPlan, availablePlans });
});

router.post('/billing/request-cash-payment', (req, res) => {
  const { planId } = req.body;
  if (!planId) return res.status(400).json({ error: 'Plan ID is required.' });

  const plan = db.prepare('SELECT price_monthly FROM subscription_plans WHERE id = ?').get(planId);
  if (!plan) return res.status(404).json({ error: 'Subscription plan not found.' });

  const hospitalId = hid(req);
  const reference_number = `CASH-${hospitalId.slice(0, 4)}-${Date.now().toString().slice(-6)}`;
  const id = uuid();

  try {
    db.prepare(
      `INSERT INTO cash_payments (id, hospital_id, plan_id, amount, reference_number) VALUES (?, ?, ?, ?, ?)`
    ).run(id, hospitalId, planId, plan.price_monthly, reference_number);

    res.status(201).json({ reference_number, message: 'Cash payment request generated.' });
  } catch (err) {
    res.status(500).json({ error: 'Could not generate payment reference.' });
  }
});

// ---------- Invoices ----------

router.get('/invoices', (req, res) => {
  const hospitalId = hid(req);
  const invoices = db.prepare(`
    SELECT
      cp.id,
      cp.reference_number,
      cp.amount,
      cp.status,
      cp.verified_at,
      sp.name as plan_name
    FROM cash_payments cp
    JOIN subscription_plans sp ON sp.id = cp.plan_id
    WHERE cp.hospital_id = ? AND cp.status = 'verified'
    ORDER BY cp.verified_at DESC
  `).all(hospitalId);
  res.json(invoices);
});

router.get('/invoices/:id', (req, res) => {
  const hospitalId = hid(req);
  const invoice = db.prepare(`
    SELECT cp.*, h.hospital_name, h.hospital_address, sp.name as plan_name
    FROM cash_payments cp
    JOIN hospitals h ON h.id = cp.hospital_id
    JOIN subscription_plans sp ON sp.id = cp.plan_id
    WHERE cp.id = ? AND cp.hospital_id = ? AND cp.status = 'verified'
  `).get(req.params.id, hospitalId);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });
  res.json(invoice);
});

const safeJsonParse = (jsonString, fallback = []) => {
  if (!jsonString) return fallback;
  try {
    const parsed = JSON.parse(jsonString);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (e) {
    return fallback;
  }
};

const csvCell = (value) => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  return /[",\r\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
};

const patientExportColumns = [
  ['First Name', 'first_name'],
  ['Last Name', 'last_name'],
  ['Contact Number', 'contact_number'],
  ['Email', 'email'],
  ['Age', 'age'],
  ['Gender', 'gender'],
  ['Address', 'address'],
  ['District', 'district'],
  ['State', 'state'],
  ['Pincode', 'pincode'],
  ['WhatsApp Available', 'whatsapp_available'],
];

const toCsv = (rows, columns) => {
  const header = columns.map(([label]) => csvCell(label)).join(',');
  const body = rows.map((row) => columns.map(([, key]) => csvCell(row[key])).join(','));
  return [header, ...body].join('\r\n');
};

const bodyHas = (body, key) => Object.prototype.hasOwnProperty.call(body || {}, key);
const notesFromBody = (body, fallback) => (bodyHas(body, 'notes') ? (body.notes || null) : fallback);

// ---------- Manage Doctors ----------

router.get('/doctors', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const doctors = db.prepare(
    `SELECT id, first_name, last_name, doctor_name, speciality, contact_number, email, age, gender, district, state, pincode, experience_years, certifications, avg_minutes_per_patient, status, created_at, photo_url
     FROM doctors WHERE hospital_id = ? ORDER BY created_at DESC`
  ).all(hid(req));

  const doctorsWithSchedule = doctors.map(doctor => {
    const schedule = db.prepare(
      `SELECT is_available, timeslots, room_number, delay_minutes
       FROM doctor_schedules
       WHERE doctor_id = ? AND date = ? AND hospital_id = ?`
    ).get(doctor.id, date, hid(req));
    return {
      ...doctor,
      schedule: {
        is_available: schedule?.is_available === 1, // Ensure boolean
        timeslots: safeJsonParse(schedule?.timeslots),
        room_number: schedule?.room_number || '',
        delay_minutes: schedule?.delay_minutes || 0,
      }
    };
  });

  res.json(doctorsWithSchedule);
});

router.post('/doctors', (req, res) => {
  const { first_name, last_name, speciality, contact_number, email, password, avg_minutes_per_patient, age, gender, district, state, pincode, experience_years, certifications } = req.body;
  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ error: 'First name, last name, email, and password are required' });
  }
  const id = uuid();
  const password_hash = bcrypt.hashSync(password, 10);
  const doctor_name = `${first_name} ${last_name}`;
  try {
    db.prepare(
      `INSERT INTO doctors (id, hospital_id, first_name, last_name, doctor_name, speciality, contact_number, email, age, gender, district, state, pincode, experience_years, certifications, password_hash, avg_minutes_per_patient)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id, hid(req), first_name, last_name, doctor_name, speciality || null, contact_number || null, email, age || null, gender || null,
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

  const fields = ['first_name', 'last_name', 'speciality', 'contact_number', 'email', 'age', 'gender', 'district', 'state', 'pincode', 'experience_years', 'avg_minutes_per_patient', 'status'];
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
  if (req.body.first_name || req.body.last_name) {
    updates.push('doctor_name = @first_name || \' \' || @last_name');
    params.first_name = req.body.first_name || doctor.first_name;
    params.last_name = req.body.last_name || doctor.last_name;
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
    `SELECT is_available, timeslots, room_number, delay_minutes
     FROM doctor_schedules
     WHERE doctor_id = ? AND date = ? AND hospital_id = ?`
  ).get(req.params.id, date, hid(req));

  if (schedule) {
    res.json({
      is_available: schedule.is_available === 1,
      timeslots: JSON.parse(schedule.timeslots || '[]'),
      room_number: schedule.room_number || '',
      delay_minutes: schedule.delay_minutes || 0,
    });
  } else {
    res.json({ is_available: false, timeslots: [], room_number: '', delay_minutes: 0 });
  }
});

router.post('/doctors/:id/schedule', (req, res) => {
  const date = req.body.date || new Date().toISOString().slice(0, 10);
  const { is_available, timeslots } = req.body;
  const roomNumber = String(req.body.room_number || '').trim();
  const delayMinutes = Number(req.body.delay_minutes || 0);
  const doctor = db.prepare('SELECT id FROM doctors WHERE id = ? AND hospital_id = ?').get(req.params.id, hid(req));
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
  if (is_available && !roomNumber) {
    return res.status(400).json({ error: 'Room number is required for an available doctor.' });
  }
  if (!Number.isInteger(delayMinutes) || delayMinutes < 0 || delayMinutes > 1440) {
    return res.status(400).json({ error: 'Delay must be a whole number between 0 and 1440 minutes.' });
  }

  const timeslotsJson = JSON.stringify(is_available ? (timeslots || []) : []);
  db.prepare(
    `INSERT INTO doctor_schedules
      (doctor_id, hospital_id, date, is_available, timeslots, room_number, delay_minutes)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(doctor_id, date) DO UPDATE SET
       hospital_id = excluded.hospital_id,
       is_available = excluded.is_available,
       timeslots = excluded.timeslots,
       room_number = excluded.room_number,
       delay_minutes = excluded.delay_minutes`
  ).run(
    req.params.id,
    hid(req),
    date,
    is_available ? 1 : 0,
    timeslotsJson,
    is_available ? roomNumber : null,
    is_available ? delayMinutes : 0
  );
  res.json({ message: 'Schedule updated' });
});

router.post('/doctors/bulk-schedule', (req, res) => {
  const { doctor_ids, date, timeslots: newTimeslots, room_numbers: roomNumbers } = req.body;
  if (!Array.isArray(doctor_ids) || !doctor_ids.length || !date || !Array.isArray(newTimeslots) || !newTimeslots.length) {
    return res.status(400).json({ error: 'doctor_ids, date, and at least one timeslot are required.' });
  }

  const doctorIds = [...new Set(doctor_ids)];
  const rooms = roomNumbers && typeof roomNumbers === 'object' ? roomNumbers : {};
  const missingRoom = doctorIds.find((doctorId) => !String(rooms[doctorId] || '').trim());
  if (missingRoom) {
    return res.status(400).json({ error: 'A room number is required for every selected doctor.' });
  }

  const placeholders = doctorIds.map(() => '?').join(', ');
  const hospitalDoctors = db.prepare(
    `SELECT id FROM doctors WHERE hospital_id = ? AND id IN (${placeholders})`
  ).all(hid(req), ...doctorIds);
  if (hospitalDoctors.length !== doctorIds.length) {
    return res.status(400).json({ error: 'One or more selected doctors do not belong to this hospital.' });
  }

  const updateStmt = db.prepare(
    `INSERT INTO doctor_schedules
      (doctor_id, hospital_id, date, is_available, timeslots, room_number)
     VALUES (?, ?, ?, 1, ?, ?)
     ON CONFLICT(doctor_id, date) DO UPDATE SET
       hospital_id = excluded.hospital_id,
       is_available = 1,
       timeslots = excluded.timeslots,
       room_number = excluded.room_number`
  );

  const transaction = db.transaction(() => {
    for (const doctorId of doctorIds) {
      const existingSchedule = db.prepare(
        `SELECT timeslots
         FROM doctor_schedules
         WHERE doctor_id = ? AND date = ? AND hospital_id = ?`
      ).get(doctorId, date, hid(req));
      const existingTimeslots = existingSchedule?.timeslots ? JSON.parse(existingSchedule.timeslots) : [];
      const mergedTimeslots = [...new Set([...existingTimeslots, ...newTimeslots])].sort();
      const timeslotsJson = JSON.stringify(mergedTimeslots);
      updateStmt.run(doctorId, hid(req), date, timeslotsJson, String(rooms[doctorId]).trim());
    }
  });

  transaction();
  res.json({ message: `${doctorIds.length} doctor schedules updated for ${date}.` });
});

// ---------- Manage Patients ----------

router.get('/patients', (req, res) => {
  const { q, state, district, gender, sortBy } = req.query;
  let sql = `
    SELECT p.*, COUNT(a.id) as appointment_count
    FROM patients p
    LEFT JOIN appointments a ON p.id = a.patient_id AND a.hospital_id = p.hospital_id
    WHERE p.hospital_id = ?
  `;
  const params = [hid(req)];

  if (q) {
    sql += ' AND (p.first_name LIKE ? OR p.last_name LIKE ? OR p.patient_name LIKE ? OR p.contact_number LIKE ? OR p.district LIKE ?)';
    const qParam = `%${q}%`;
    params.push(qParam, qParam, qParam, qParam, qParam);
  }
  if (state) { sql += ' AND p.state = ?'; params.push(state); }
  if (district) { sql += ' AND p.district = ?'; params.push(district); }
  if (gender) { sql += ' AND p.gender = ?'; params.push(gender); }

  sql += ' GROUP BY p.id';

  if (sortBy === 'most_visited') sql += ' ORDER BY appointment_count DESC, p.created_at DESC';
  else sql += ' ORDER BY p.created_at DESC';

  res.json(db.prepare(sql).all(...params));
});

router.get('/patients/export', (req, res) => {
  const patients = db.prepare(
    `SELECT first_name, last_name, contact_number, email, age, gender, address, district, state, pincode,
            (CASE WHEN whatsapp_available = 1 THEN 'Yes' ELSE 'No' END) as whatsapp_available
     FROM patients WHERE hospital_id = ? ORDER BY created_at DESC`
  ).all(hid(req));

  const csv = toCsv(patients, patientExportColumns);
  res.header('Content-Type', 'text/csv; charset=utf-8');
  res.attachment(`patients-${hid(req)}-${new Date().toISOString().slice(0, 10)}.csv`);
  res.send(csv);
});

router.post('/patients', (req, res) => {
  const {
    first_name, last_name, contact_number, email, address, whatsapp_available,
    adhar_card, age, gender, district, state, pincode,
  } = req.body;
  if (!first_name || !last_name || !contact_number) {
    return res.status(400).json({ error: 'First name, last name, and contact number are required' });
  }
  const id = uuid();
  const patient_name = `${first_name} ${last_name}`;
  db.prepare(
    `INSERT INTO patients (id, hospital_id, first_name, last_name, patient_name, contact_number, email, address, whatsapp_available,
      adhar_card, age, gender, district, state, pincode)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, hid(req), first_name, last_name, patient_name, contact_number, email || null, address || null, whatsapp_available ? 1 : 0,
    adhar_card || null, age || null, gender || null, district || null, state || null, pincode || null
  );
  res.status(201).json({ id, message: 'Patient added' });
});

router.patch('/patients/:id', (req, res) => {
  const fields = ['first_name', 'last_name', 'contact_number', 'email', 'address', 'whatsapp_available',
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
  if (req.body.first_name || req.body.last_name) {
    const patient = db.prepare('SELECT first_name, last_name FROM patients WHERE id = ?').get(req.params.id);
    updates.push('patient_name = @first_name || \' \' || @last_name');
    params.first_name = req.body.first_name || patient.first_name;
    params.last_name = req.body.last_name || patient.last_name;
  }
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

  const dailyAppointments = db.prepare(
    `SELECT appointment_date as date, COUNT(*) as appointments
     FROM appointments
     WHERE hospital_id = ? AND appointment_date BETWEEN ? AND ?
     GROUP BY appointment_date ORDER BY appointment_date ASC`
  ).all(hid(req), startDate, endDate);

  const statusBreakdown = [
    { name: 'Scheduled', value: insights.scheduledAppointments },
    { name: 'In Progress', value: insights.inProgressAppointments },
    { name: 'Completed', value: insights.completedAppointments },
    { name: 'Cancelled', value: insights.cancelledAppointments },
  ].filter(item => item.value > 0);

  const doctorWorkload = db.prepare(
    `SELECT d.doctor_name as doctor, COUNT(a.id) as count
     FROM appointments a
     JOIN doctors d ON a.doctor_id = d.id
     WHERE a.hospital_id = ? AND a.appointment_date BETWEEN ? AND ?
     GROUP BY d.id, d.doctor_name
     ORDER BY count DESC`
  ).all(hid(req), startDate, endDate);


  res.json({
    ...insights,
    doctorCount,
    patientCount,
    startDate,
    endDate,
    dailyAppointments,
    statusBreakdown,
    doctorWorkload,
  });
});

// ---------- Manage Appointments / Token Generation ----------

router.get('/appointments', (req, res) => {
  const { date, doctor_id } = req.query;
  const { patient_id } = req.query;
  let sql = `
    SELECT a.*, p.first_name as patient_first_name, p.last_name as patient_last_name,
           p.patient_name, p.contact_number AS patient_contact, p.whatsapp_available,
           d.doctor_name, d.speciality,
           ds.room_number
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    JOIN doctors d ON d.id = a.doctor_id
    LEFT JOIN doctor_schedules ds ON ds.doctor_id = a.doctor_id AND ds.date = a.appointment_date
    WHERE a.hospital_id = ?`;
  const params = [hid(req)];
  if (date) { sql += ' AND a.appointment_date = ?'; params.push(date); }
  if (doctor_id) { sql += ' AND a.doctor_id = ?'; params.push(doctor_id); }
  if (patient_id) { sql += ' AND a.patient_id = ?'; params.push(patient_id); }
  sql += ' ORDER BY a.appointment_date ASC, a.token_number ASC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/appointments/:id', (req, res) => {
  const appointment = db.prepare(`
    SELECT
      a.*,
      p.patient_name,
      d.doctor_name,
      h.hospital_name,
      h.hospital_address,
      ds.room_number
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    JOIN doctors d ON d.id = a.doctor_id
    JOIN hospitals h ON h.id = a.hospital_id
    LEFT JOIN doctor_schedules ds ON ds.doctor_id = a.doctor_id AND ds.date = a.appointment_date
    WHERE a.id = ? AND a.hospital_id = ?
  `).get(req.params.id, hid(req));
  if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
  res.json(appointment);
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
  const { new_date, timeslot } = req.body;
  if (!new_date || !timeslot) return res.status(400).json({ error: 'new_date and timeslot are required' });

  const appt = db.prepare('SELECT * FROM appointments WHERE id = ? AND hospital_id = ?').get(req.params.id, hid(req));
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });

  const oldDoctorId = appt.doctor_id;
  const oldDate = appt.appointment_date;

  const doctor = db.prepare('SELECT id, avg_minutes_per_patient FROM doctors WHERE id = ? AND hospital_id = ?').get(oldDoctorId, hid(req));
  if (!doctor) return res.status(404).json({ error: 'Doctor not found in this hospital' });

  const schedule = db.prepare('SELECT timeslots FROM doctor_schedules WHERE doctor_id = ? AND date = ? AND is_available = 1').get(doctor.id, new_date);
  const availableTimeslots = schedule ? JSON.parse(schedule.timeslots) : [];
  if (!availableTimeslots.includes(timeslot)) {
    return res.status(400).json({ error: 'The selected timeslot is not available for this doctor on this date.' });
  }

  const maxAppointmentsInSlot = Math.floor(60 / (doctor.avg_minutes_per_patient || 15));
  const existingAppointmentsInSlot = db.prepare('SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND timeslot = ? AND status != ?').get(doctor.id, new_date, timeslot, 'cancelled').count;
  if (existingAppointmentsInSlot >= maxAppointmentsInSlot) {
    return res.status(409).json({ error: 'This timeslot is already full.' });
  }

  const newTokenNumber = getNextTokenNumber(db, oldDoctorId, new_date);

  db.prepare(
    `UPDATE appointments SET appointment_date = ?, token_number = ?, timeslot = ?, status = 'scheduled', updated_at = datetime('now')
     WHERE id = ?`
  ).run(new_date, newTokenNumber, timeslot, req.params.id);

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
  if (!doctor_id) return res.status(400).json({ error: 'Doctor ID is required' });
  const appointmentDate = date || new Date().toISOString().slice(0, 10);

  const doctor = db.prepare('SELECT id FROM doctors WHERE id = ? AND hospital_id = ?').get(doctor_id, hid(req));
  if (!doctor) return res.status(404).json({ error: 'Doctor not found in this hospital' });

  const current = db.prepare(
    `SELECT * FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND status = 'in_progress'
     ORDER BY token_number ASC LIMIT 1`
  ).get(doctor_id, appointmentDate);

  if (current) {
    db.prepare(`UPDATE appointments SET status = 'completed', notes = ?, updated_at = datetime('now') WHERE id = ?`).run(notesFromBody(req.body, current.notes), current.id);
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

  if (bodyHas(req.body, 'notes')) {
    db.prepare(`UPDATE appointments SET status = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`).run(status, req.body.notes || null, req.params.id);
  } else {
    db.prepare(`UPDATE appointments SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, req.params.id);
  }
  if (status === 'cancelled') renumberTokens(db, appt.doctor_id, appt.appointment_date);
  res.json({ message: `Appointment marked ${status}` });
});

export default router;
