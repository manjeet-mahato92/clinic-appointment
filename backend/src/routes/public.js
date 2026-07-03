import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db/index.js';
import { getNextTokenNumber } from '../utils/tokens.js';

const router = Router();

router.get('/hospitals', (req, res) => {
  res.json(
    db.prepare(
      `SELECT id, hospital_name, logo_url, hospital_address, timing FROM hospitals WHERE status = 'active'`
    ).all()
  );
});

router.get('/hospitals/:id/doctors', (req, res) => {
  res.json(
    db.prepare(
      `SELECT id, doctor_name, speciality FROM doctors WHERE hospital_id = ? AND status = 'active'`
    ).all(req.params.id)
  );
});

// Self-service booking: creates the patient record if new, then books + auto-generates a token
router.post('/appointments', (req, res) => {
  const {
    hospital_id, doctor_id, appointment_date,
    patient_name, contact_number, email, address, whatsapp_available,
  } = req.body;

  if (!hospital_id || !doctor_id || !appointment_date || !patient_name || !contact_number) {
    return res.status(400).json({
      error: 'hospital_id, doctor_id, appointment_date, patient_name, and contact_number are required',
    });
  }

  const doctor = db.prepare('SELECT id FROM doctors WHERE id = ? AND hospital_id = ?').get(doctor_id, hospital_id);
  if (!doctor) return res.status(404).json({ error: 'Doctor not found in this hospital' });

  let patient = db.prepare(
    'SELECT * FROM patients WHERE hospital_id = ? AND contact_number = ?'
  ).get(hospital_id, contact_number);

  if (!patient) {
    const patientId = uuid();
    db.prepare(
      `INSERT INTO patients (id, hospital_id, patient_name, contact_number, email, address, whatsapp_available)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(patientId, hospital_id, patient_name, contact_number, email || null, address || null, whatsapp_available ? 1 : 0);
    patient = { id: patientId };
  }

  const tokenNumber = getNextTokenNumber(db, doctor_id, appointment_date);
  const apptId = uuid();
  db.prepare(
    `INSERT INTO appointments (id, hospital_id, doctor_id, patient_id, appointment_date, token_number)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(apptId, hospital_id, doctor_id, patient.id, appointment_date, tokenNumber);

  res.status(201).json({
    appointment_id: apptId,
    token_number: tokenNumber,
    message: `Token #${tokenNumber} booked for ${appointment_date}`,
  });
});

export default router;
