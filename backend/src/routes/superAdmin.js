import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import db from '../db/index.js';
import { createToken, requireAuth, requireRole } from '../middleware/auth.js';
import { generateHospitalId } from '../utils/ids.js';

const router = Router();
router.use(requireAuth, requireRole('super_admin'));

// ---------- Hospitals ----------

router.get('/hospitals', (req, res) => {
  const { q, state, district } = req.query;
  let sql = `SELECT id, hospital_name, email, contact_number, status,
                    activation_date, subscription_plan_id
             FROM hospitals`;
  const params = [];
  const conditions = [];

  if (q) {
    conditions.push(`(hospital_name LIKE ? OR email LIKE ? OR contact_number LIKE ?)`);
    const qParam = `%${q}%`;
    params.push(qParam, qParam, qParam);
  }
  if (state) {
    conditions.push(`state = ?`);
    params.push(state);
  }
  if (district) {
    conditions.push(`district = ?`);
    params.push(district);
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }
  sql += ` ORDER BY created_at DESC`;
  res.json(db.prepare(sql).all(...params));
});

router.get('/doctors', (req, res) => {
  const { q, state, district } = req.query;
  let sql = `
    SELECT d.id, d.doctor_name, d.speciality, d.email, d.contact_number, d.status, h.hospital_name
    FROM doctors d JOIN hospitals h ON d.hospital_id = h.id
  `;
  const params = [];
  const conditions = [];

  if (q) {
    conditions.push(`(d.doctor_name LIKE ? OR d.speciality LIKE ? OR h.hospital_name LIKE ? OR d.email LIKE ?)`);
    const qParam = `%${q}%`;
    params.push(qParam, qParam, qParam, qParam);
  }
  if (state) {
    conditions.push(`h.state = ?`);
    params.push(state);
  }
  if (district) {
    conditions.push(`h.district = ?`);
    params.push(district);
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }
  sql += ` ORDER BY h.hospital_name, d.doctor_name`;
  res.json(db.prepare(sql).all(...params));
});

router.get('/patients', (req, res) => {
  const { q, state, district, gender, sortBy } = req.query;
  let sql = `
    SELECT p.id, p.patient_name, p.contact_number, p.email, p.age, p.gender, p.district, p.state,
           h.hospital_name, COUNT(a.id) as appointment_count
    FROM patients p
    JOIN hospitals h ON p.hospital_id = h.id
    LEFT JOIN appointments a ON p.id = a.patient_id
  `;
  const params = [];
  const conditions = [];

  if (q) {
    conditions.push(`(p.patient_name LIKE ? OR p.contact_number LIKE ? OR p.email LIKE ?)`);
    const qParam = `%${q}%`;
    params.push(qParam, qParam, qParam);
  }
  if (state) { conditions.push(`p.state = ?`); params.push(state); }
  if (district) { conditions.push(`p.district = ?`); params.push(district); }
  if (gender) { conditions.push(`p.gender = ?`); params.push(gender); }

  if (conditions.length > 0) sql += ` WHERE ${conditions.join(' AND ')}`;
  sql += ' GROUP BY p.id';
  if (sortBy === 'most_visited') sql += ' ORDER BY appointment_count DESC, p.created_at DESC';
  else sql += ' ORDER BY p.created_at DESC';

  res.json(db.prepare(sql).all(...params));
});

router.get('/hospitals/:id', (req, res) => {
  const hospital = db.prepare('SELECT * FROM hospitals WHERE id = ?').get(req.params.id);
  if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
  res.json(hospital);
});

router.post('/hospitals', (req, res) => {
  const {
    hospital_name, email, password, contact_number, hospital_address, timing,
    logo_url, banner_url, rep_name, rep_contact_number, rep_designation,
    activation_date, payment_reference,
  } = req.body;

  if (!hospital_name || !email || !password) {
    return res.status(400).json({ error: 'hospital_name, email, and password are required' });
  }

  const id = generateHospitalId(db);
  const password_hash = bcrypt.hashSync(password, 10);

  try {
    db.prepare(
      `INSERT INTO hospitals
        (id, hospital_name, email, password_hash, contact_number, hospital_address, timing,
         logo_url, banner_url, rep_name, rep_contact_number, rep_designation,
         activation_date, payment_reference, status)
       VALUES (@id, @hospital_name, @email, @password_hash, @contact_number, @hospital_address, @timing,
         @logo_url, @banner_url, @rep_name, @rep_contact_number, @rep_designation,
         @activation_date, @payment_reference, 'active')`
    ).run({
      id, hospital_name, email, password_hash,
      contact_number: contact_number || null,
      hospital_address: hospital_address || null,
      timing: timing || null,
      logo_url: logo_url || null,
      banner_url: banner_url || null,
      rep_name: rep_name || null,
      rep_contact_number: rep_contact_number || null,
      rep_designation: rep_designation || null,
      activation_date: activation_date || new Date().toISOString().slice(0, 10),
      payment_reference: payment_reference || null,
    });
    res.status(201).json({ id, message: 'Hospital created' });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.patch('/hospitals/:id', (req, res) => {
  const fields = [
    'hospital_name', 'contact_number', 'hospital_address', 'timing',
    'logo_url', 'banner_url', 'header_color', 'rep_name', 'rep_contact_number', 'rep_designation', 'subscription_plan_id',
    'activation_date', 'payment_reference', 'rep_age', 'rep_gender', 'district', 'state', 'pincode',
  ];
  const updates = [];
  const params = { id: req.params.id };

  if (req.body.email) {
    const existing = db.prepare('SELECT id FROM hospitals WHERE email = ? AND id != ?').get(req.body.email, params.id);
    if (existing) return res.status(409).json({ error: 'Email already in use' });
  }

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = @${f}`);
      params[f] = req.body[f];
    }
  }

  if (req.body.password) {
    updates.push('password_hash = @password_hash');
    params.password_hash = bcrypt.hashSync(req.body.password, 10);
  }

  if (!updates.length) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  try {
    db.prepare(`UPDATE hospitals SET ${updates.join(', ')} WHERE id = @id`).run(params);
    res.json({ message: 'Hospital updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update hospital. The email may already be in use.' });
  }
});

// Activate / Pause / Suspend
router.patch('/hospitals/:id/status', (req, res) => {
  const { status } = req.body; // active | suspended
  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'status must be active or suspended' });
  }
  const result = db.prepare('UPDATE hospitals SET status = ? WHERE id = ?').run(status, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Hospital not found' });
  res.json({ message: `Hospital marked ${status}` });
});

router.delete('/hospitals/:id', (req, res) => {
  db.prepare('DELETE FROM hospitals WHERE id = ?').run(req.params.id);
  res.json({ message: 'Hospital removed' });
});

router.post('/hospitals/:hospitalId/doctors', (req, res) => {
  const { hospitalId } = req.params;
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
       VALUES (@id, @hospital_id, @first_name, @last_name, @doctor_name, @speciality, @contact_number, @email, @age, @gender, @district, @state, @pincode, @experience_years, @certifications, @password_hash, @avg_minutes_per_patient)`
    ).run({
      id,
      hospital_id: hospitalId,
      first_name,
      last_name,
      doctor_name,
      speciality: speciality || null,
      contact_number: contact_number || null,
      email,
      age: age || null,
      gender: gender || null,
      district: district || null,
      state: state || null,
      pincode: pincode || null,
      experience_years: experience_years || null,
      certifications: certifications ? JSON.stringify(certifications) : null,
      password_hash,
      avg_minutes_per_patient: avg_minutes_per_patient || 15,
    });
    res.status(201).json({ id, message: 'Doctor added' });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) return res.status(409).json({ error: 'Email already in use' });
    res.status(500).json({ error: err.message });
  }
});

router.patch('/hospitals/:hospitalId/doctors/:doctorId', (req, res) => {
  const { hospitalId, doctorId } = req.params;
  const doctor = db.prepare('SELECT * FROM doctors WHERE id = ? AND hospital_id = ?').get(doctorId, hospitalId);
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

  const fields = ['first_name', 'last_name', 'speciality', 'contact_number', 'email', 'age', 'gender', 'district', 'state', 'pincode', 'experience_years', 'avg_minutes_per_patient', 'status'];
  const updates = [];
  const params = { id: doctorId };
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = @${f}`);
      params[f] = req.body[f];
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
  db.prepare(`UPDATE doctors SET ${updates.join(', ')} WHERE id = @id`).run(params);
  res.json({ message: 'Doctor updated' });
});

router.delete('/hospitals/:hospitalId/doctors/:doctorId', (req, res) => {
  db.prepare('DELETE FROM doctors WHERE id = ? AND hospital_id = ?').run(req.params.doctorId, req.params.hospitalId);
  res.json({ message: 'Doctor removed' });
});

router.post('/hospitals/:hospitalId/patients', (req, res) => {
  const { hospitalId } = req.params;
  const { first_name, last_name, contact_number, email, address, whatsapp_available, adhar_card, age, gender, district, state, pincode } = req.body; // Added district, state, pincode
  if (!first_name || !last_name || !contact_number) {
    return res.status(400).json({ error: 'First name, last name, and contact number are required' });
  }
  const id = uuid();
  const patient_name = `${first_name} ${last_name}`;
  db.prepare(
    `INSERT INTO patients (id, hospital_id, first_name, last_name, patient_name, contact_number, email, address, whatsapp_available, adhar_card, age, gender, district, state, pincode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, hospitalId, first_name, last_name, patient_name, contact_number, email || null, address || null, whatsapp_available ? 1 : 0, adhar_card || null, age || null, gender || null, district || null, state || null, pincode || null
  );
  res.status(201).json({ id, message: 'Patient added' });
});

router.patch('/hospitals/:hospitalId/patients/:patientId', (req, res) => {
  const { hospitalId, patientId } = req.params;
  const fields = ['first_name', 'last_name', 'contact_number', 'email', 'address', 'whatsapp_available', 'adhar_card', 'age', 'gender', 'district', 'state', 'pincode'];
  const updates = [];
  const params = { id: patientId, hospital_id: hospitalId };
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = @${f}`);
      params[f] = f === 'whatsapp_available' ? (req.body[f] ? 1 : 0) : req.body[f];
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
  if (req.body.first_name || req.body.last_name) {
    const patient = db.prepare('SELECT first_name, last_name FROM patients WHERE id = ?').get(patientId);
    updates.push('patient_name = @first_name || \' \' || @last_name');
    params.first_name = req.body.first_name || patient.first_name;
    params.last_name = req.body.last_name || patient.last_name;
  }
  db.prepare(`UPDATE patients SET ${updates.join(', ')} WHERE id = @id AND hospital_id = @hospital_id`).run(params);
  res.json({ message: 'Patient updated' });
});

router.delete('/hospitals/:hospitalId/patients/:patientId', (req, res) => {
  db.prepare('DELETE FROM patients WHERE id = ? AND hospital_id = ?').run(req.params.patientId, req.params.hospitalId);
  res.json({ message: 'Patient removed' });
});

router.post('/hospitals/:hospitalId/display-token', (req, res) => {
  const hospital = db.prepare(
    'SELECT id, hospital_name, logo_url FROM hospitals WHERE id = ?'
  ).get(req.params.hospitalId);

  if (!hospital) {
    return res.status(404).json({ error: 'Hospital not found' });
  }

  const user = { id: hospital.id, role: 'display', name: hospital.hospital_name, hospitalId: hospital.id, logo_url: hospital.logo_url };
  const token = createToken(user);
  res.json({ token, user });
});

router.get('/hospitals/:hospitalId/doctors', (req, res) => {
  const { hospitalId } = req.params;
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const doctors = db.prepare(
    `SELECT id, first_name, last_name, doctor_name, speciality, contact_number, email, age, gender, district, state, pincode, experience_years, certifications, avg_minutes_per_patient, status, created_at, photo_url
     FROM doctors WHERE hospital_id = ? ORDER BY created_at DESC`
  ).all(hospitalId);

  const doctorsWithSchedule = doctors.map(doctor => {
    const schedule = db.prepare(
      `SELECT is_available, timeslots, room_number, delay_minutes
       FROM doctor_schedules
       WHERE doctor_id = ? AND date = ? AND hospital_id = ?`
    ).get(doctor.id, date, hospitalId);
    return {
      ...doctor,
      schedule: {
        is_available: schedule?.is_available === 1,
        timeslots: schedule?.timeslots ? JSON.parse(schedule.timeslots) : [],
        room_number: schedule?.room_number || '',
        delay_minutes: schedule?.delay_minutes || 0,
      }
    };
  });

  res.json(doctorsWithSchedule);
});

router.get('/hospitals/:hospitalId/patients', (req, res) => {
  const { hospitalId } = req.params;
  const patients = db.prepare(
    `SELECT p.*, COUNT(a.id) as appointment_count FROM patients p
     LEFT JOIN appointments a ON p.id = a.patient_id AND a.hospital_id = p.hospital_id
     WHERE p.hospital_id = ? GROUP BY p.id ORDER BY p.created_at DESC`
  ).all(hospitalId);
  res.json(patients);
});
// ---------- Banner Ads ----------

router.get('/hospitals/:hospitalId/appointments', (req, res) => {
  const { hospitalId } = req.params;
  const { patient_id } = req.query;
  let sql = `SELECT a.*, p.first_name as patient_first_name, p.last_name as patient_last_name, p.patient_name, p.contact_number AS patient_contact, p.whatsapp_available, d.doctor_name, d.speciality FROM appointments a JOIN patients p ON p.id = a.patient_id JOIN doctors d ON d.id = a.doctor_id WHERE a.hospital_id = ?`;
  const params = [hospitalId];
  if (patient_id) { sql += ' AND a.patient_id = ?'; params.push(patient_id); }
  sql += ' ORDER BY a.appointment_date DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/banners', (req, res) => {
  res.json(db.prepare('SELECT * FROM banner_ads ORDER BY created_at DESC').all());
});

router.post('/banners', (req, res) => {
  const { hospital_id, title, media_url, media_type, start_date, end_date } = req.body;
  if (!title || !media_url) return res.status(400).json({ error: 'title and media_url are required' });
  const id = uuid();
  db.prepare(
    `INSERT INTO banner_ads (id, hospital_id, title, media_url, media_type, start_date, end_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, hospital_id || null, title, media_url, media_type || 'image', start_date || null, end_date || null);
  res.status(201).json({ id, message: 'Banner ad created' });
});

router.patch('/banners/:id', (req, res) => {
  const { title, media_url, media_type, active, start_date, end_date } = req.body;
  db.prepare(
    `UPDATE banner_ads SET
       title = COALESCE(?, title),
       media_url = COALESCE(?, media_url),
       media_type = COALESCE(?, media_type),
       active = COALESCE(?, active),
       start_date = COALESCE(?, start_date),
       end_date = COALESCE(?, end_date)
     WHERE id = ?`
  ).run(title, media_url, media_type, active === undefined ? undefined : (active ? 1 : 0), start_date, end_date, req.params.id);
  res.json({ message: 'Banner ad updated' });
});

router.delete('/banners/:id', (req, res) => {
  db.prepare('DELETE FROM banner_ads WHERE id = ?').run(req.params.id);
  res.json({ message: 'Banner ad removed' });
});

// ---------- Dashboard summary ----------
router.get('/summary', (req, res) => {
  const totals = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM hospitals) as totalHospitals,
      (SELECT COUNT(*) FROM hospitals WHERE status = 'active') as activeHospitals,
      (SELECT COUNT(*) FROM hospitals WHERE status = 'suspended') as suspendedHospitals,
      (SELECT COUNT(*) FROM doctors) as totalDoctors,
      (SELECT COUNT(*) FROM patients) as totalPatients,
      (SELECT COUNT(*) FROM appointments WHERE appointment_date = date('now')) as todaysAppointments
  `).get();

  const hospitalStatusBreakdown = [
    { name: 'Active', value: totals.activeHospitals },
    { name: 'Suspended', value: totals.suspendedHospitals },
  ].filter(item => item.value > 0);

  const hospitalGrowth = db.prepare(`
    SELECT strftime('%Y-%m', activation_date) as month, COUNT(id) as new_hospitals
    FROM hospitals
    WHERE activation_date IS NOT NULL
    GROUP BY month
    ORDER BY month ASC
  `).all();

  const topHospitalsByDoctors = db.prepare(`
    SELECT h.hospital_name, COUNT(d.id) as doctor_count
    FROM hospitals h
    LEFT JOIN doctors d ON h.id = d.hospital_id
    GROUP BY h.id
    ORDER BY doctor_count DESC
    LIMIT 10
  `).all();

  res.json({ ...totals, hospitalStatusBreakdown, hospitalGrowth, topHospitalsByDoctors });
});


// ---------- Subscription Plans ----------

router.get('/subscription-plans', (req, res) => {
  const plans = db.prepare('SELECT * FROM subscription_plans ORDER BY created_at DESC').all();
  res.json(plans);
});

router.post('/subscription-plans', (req, res) => {
  const { name, max_doctors, max_patients, max_tokens, price_monthly } = req.body;
  if (!name) return res.status(400).json({ error: 'Plan Name is required' });

  const id = uuid();
  try {
    db.prepare(
      `INSERT INTO subscription_plans (id, name, max_doctors, max_patients, max_tokens, price_monthly)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, name, max_doctors || null, max_patients || null, max_tokens || null, price_monthly || null);
    res.status(201).json({ id, message: 'Subscription plan created' });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'A plan with this name already exists.' });
    }
    res.status(500).json({ error: 'An unexpected error occurred while creating the plan.' });
  }
});

router.patch('/subscription-plans/:id', (req, res) => {
  const { id } = req.params;
  const { name, max_doctors, max_patients, max_tokens, price_monthly, is_active } = req.body;

  const fields = ['name', 'max_doctors', 'max_patients', 'max_tokens', 'price_monthly', 'is_active'];
  const updates = [];
  const params = { id };

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = @${f}`);
      params[f] = req.body[f];
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });

  db.prepare(`UPDATE subscription_plans SET ${updates.join(', ')} WHERE id = @id`).run(params);
  res.json({ message: 'Subscription plan updated' });
});

router.delete('/subscription-plans/:id', (req, res) => {
  db.prepare('DELETE FROM subscription_plans WHERE id = ?').run(req.params.id);
  res.json({ message: 'Subscription plan deleted' });
});


// ---------- Cash Payments ----------

router.get('/cash-payments', (req, res) => {
  const payments = db.prepare(`
    SELECT
      cp.*,
      h.hospital_name,
      sp.name as plan_name
    FROM cash_payments cp
    JOIN hospitals h ON h.id = cp.hospital_id
    JOIN subscription_plans sp ON sp.id = cp.plan_id
    ORDER BY cp.created_at DESC
  `).all();
  res.json(payments);
});

router.post('/cash-payments/:id/verify', (req, res) => {
  const payment = db.prepare('SELECT * FROM cash_payments WHERE id = ? AND status = \'pending\'').get(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Pending payment not found.' });

  db.prepare('UPDATE hospitals SET subscription_plan_id = ? WHERE id = ?').run(payment.plan_id, payment.hospital_id);
  db.prepare('UPDATE cash_payments SET status = \'verified\', verified_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);

  res.json({ message: 'Payment verified and plan activated.' });
});

export default router;
