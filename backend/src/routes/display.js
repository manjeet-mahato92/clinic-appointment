import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('hospital', 'display'));

const hid = (req) => req.user.hospitalId;
const localDateString = () => {
  const now = new Date();
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localNow.toISOString().slice(0, 10);
};

// Get list of doctors for the current hospital to show on the selection screen
router.get('/doctors', (req, res) => {
  const date = localDateString();
  res.json(
    db.prepare(
      `SELECT d.id, d.first_name, d.last_name, d.doctor_name, d.speciality, ds.room_number
       FROM doctors d
       JOIN doctor_schedules ds ON d.id = ds.doctor_id
       WHERE d.hospital_id = ? AND d.status = 'active'
         AND ds.hospital_id = d.hospital_id
         AND ds.date = ? AND ds.is_available = 1
       ORDER BY d.doctor_name`
    ).all(hid(req), date)
  );
});

// Get every available doctor's current patient, waiting tokens, and daily room.
router.get('/all-queues', (req, res) => {
  const date = localDateString();
  const hospital = db.prepare(
    `SELECT id, hospital_name, logo_url, header_color, timing
     FROM hospitals
     WHERE id = ?`
  ).get(hid(req));
  if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

  const doctors = db.prepare(
    `SELECT d.id, d.first_name, d.last_name, d.doctor_name, d.speciality, ds.room_number, ds.delay_minutes
     FROM doctors d
     JOIN doctor_schedules ds
       ON ds.doctor_id = d.id AND ds.hospital_id = d.hospital_id
     WHERE d.hospital_id = ?
       AND d.status = 'active'
       AND ds.date = ?
       AND ds.is_available = 1
     ORDER BY d.doctor_name`
  ).all(hid(req), date);

  const appointments = db.prepare(
    `SELECT a.id, a.doctor_id, a.token_number, a.status, p.first_name as patient_name, a.timeslot
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     WHERE a.hospital_id = ?
       AND a.appointment_date = ?
       AND a.status IN ('in_progress', 'scheduled')
     ORDER BY a.token_number`
  ).all(hid(req), date);

  const queues = doctors.map((doctor) => {
    const doctorAppointments = appointments.filter((appointment) => appointment.doctor_id === doctor.id);
    return {
      ...doctor,
      room_number: doctor.room_number || '',
      current: doctorAppointments.find((appointment) => appointment.status === 'in_progress') || null,
      next: doctorAppointments.filter((appointment) => appointment.status === 'scheduled').slice(0, 8),
    };
  });

  // --- New Sorting Logic ---
  const now = new Date();
  const currentHour = now.getHours(); // 0-23
  const currentHourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), currentHour, 0, 0);
  const currentHourEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), currentHour + 1, 0, 0);
  const format = (d) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const currentTimeslot = `${format(currentHourStart)} - ${format(currentHourEnd)}`;

  queues.forEach((queue) => {
    queue.appointmentsInCurrentHour = appointments.filter(
      (appt) => appt.doctor_id === queue.id && appt.timeslot === currentTimeslot
    ).length;
  });

  queues.sort((a, b) => {
    // 1. Put late doctors at the bottom
    if (a.delay_minutes > 0 && b.delay_minutes === 0) return 1;
    if (a.delay_minutes === 0 && b.delay_minutes > 0) return -1;
    // 2. Sort by appointments in the current hour (descending)
    return b.appointmentsInCurrentHour - a.appointmentsInCurrentHour;
  });

  res.json({ hospital, date, queues });
});

// Get queue data for a single doctor
router.get('/queue/:doctorId', (req, res) => {
  const date = localDateString();
  const hospital = db.prepare('SELECT id, hospital_name, logo_url, banner_url, header_color, timing FROM hospitals WHERE id = ?').get(hid(req));
  const doctor = db.prepare(
    `SELECT d.id, d.first_name, d.last_name, d.doctor_name, d.speciality, ds.delay_minutes
     FROM doctors d
     LEFT JOIN doctor_schedules ds ON d.id = ds.doctor_id AND ds.date = ?
     WHERE d.id = ? AND d.hospital_id = ?`
  ).get(date, req.params.doctorId, hid(req));
  if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

  const banner = db.prepare(
    `SELECT title, media_url, media_type
     FROM banner_ads
     WHERE active = 1 AND (hospital_id = ? OR hospital_id IS NULL)
     ORDER BY (hospital_id IS NOT NULL) DESC, created_at DESC
     LIMIT 1`
  ).get(hid(req));

  const queueQuery = `
    SELECT a.id, a.token_number, p.first_name as patient_name
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    WHERE a.doctor_id = ? AND a.appointment_date = ?`;
  const current = db.prepare(
    `${queueQuery} AND a.status = 'in_progress' ORDER BY a.token_number ASC LIMIT 1`
  ).get(req.params.doctorId, date);
  const next = db.prepare(
    `${queueQuery} AND a.status = 'scheduled' ORDER BY a.token_number ASC LIMIT 1`
  ).get(req.params.doctorId, date);
  const upcoming = db.prepare(
    `${queueQuery} AND a.status = 'scheduled' ORDER BY a.token_number ASC LIMIT 10 OFFSET 1`
  ).all(req.params.doctorId, date);

  res.json({
    hospital,
    doctor,
    banner: banner || null,
    date,
    current: current || null,
    next: next || null,
    upcoming,
  });
});

export default router;
