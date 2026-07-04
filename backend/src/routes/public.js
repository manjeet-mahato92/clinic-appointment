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
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const doctors = db.prepare(
    `SELECT id, doctor_name, speciality, avg_minutes_per_patient FROM doctors WHERE hospital_id = ? AND status = 'active'`
  ).all(req.params.id);

  const appointments = db.prepare(`SELECT doctor_id, timeslot, COUNT(*) as count FROM appointments WHERE hospital_id = ? AND appointment_date = ? AND status != 'cancelled' GROUP BY doctor_id, timeslot`).all(req.params.id, date);

  const doctorsWithSchedule = doctors.map(doctor => {
    const schedule = db.prepare(
      `SELECT is_available, timeslots FROM doctor_schedules WHERE doctor_id = ? AND date = ?`
    ).get(doctor.id, date);

    const maxPerSlot = Math.floor(60 / (doctor.avg_minutes_per_patient || 15));

    const timeslotsWithAvailability = schedule?.timeslots ? JSON.parse(schedule.timeslots).map(slot => {
      const bookedCount = appointments.find(a => a.doctor_id === doctor.id && a.timeslot === slot)?.count || 0;
      const available = maxPerSlot - bookedCount;
      return { slot, available, isFull: available <= 0 };
    }) : [];

    return {
      ...doctor,
      schedule: {
        is_available: schedule?.is_available === 1,
        timeslots: timeslotsWithAvailability,
      }
    };
  });

  res.json(doctorsWithSchedule);
});

// Self-service booking: creates the patient record if new, then books + auto-generates a token
router.post('/appointments', (req, res) => {
  const {
    hospital_id, doctor_id, appointment_date, timeslot,
    patient_name, contact_number, email, address, whatsapp_available,
  } = req.body;

  if (!hospital_id || !doctor_id || !appointment_date || !patient_name || !contact_number || !timeslot) {
    return res.status(400).json({
      error: 'hospital_id, doctor_id, appointment_date, patient_name, contact_number, and timeslot are required',
    });
  }

  const doctor = db.prepare('SELECT id, avg_minutes_per_patient FROM doctors WHERE id = ? AND hospital_id = ?').get(doctor_id, hospital_id);
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
  const apptId = uuid();
  db.prepare(
    `INSERT INTO appointments (id, hospital_id, doctor_id, patient_id, appointment_date, token_number, timeslot)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(apptId, hospital_id, doctor_id, patient.id, appointment_date, tokenNumber, timeslot);

  res.status(201).json({
    appointment_id: apptId,
    token_number: tokenNumber,
    message: `Token #${tokenNumber} booked for ${appointment_date}`,
  });
});

export default router;
