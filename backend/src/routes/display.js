import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('hospital', 'display'));

const hid = (req) => req.user.hospitalId;

router.get('/doctors', (req, res) => {
  const date = new Date().toISOString().slice(0, 10);
  const doctors = db.prepare(`
    SELECT d.id, d.doctor_name, d.speciality
    FROM doctors d
    JOIN doctor_schedules s ON d.id = s.doctor_id
    WHERE d.hospital_id = ? AND s.date = ? AND s.is_available = 1
    ORDER BY d.doctor_name
  `).all(hid(req), date);
  res.json(doctors);
});

router.get('/queue/:doctorId', (req, res) => {
  const { doctorId } = req.params;
  const date = new Date().toISOString().slice(0, 10);

  const hospital = db.prepare(
    'SELECT id, hospital_name, logo_url, banner_url, header_color, timing FROM hospitals WHERE id = ?'
  ).get(hid(req));

  if (!hospital) {
    return res.status(404).json({ error: 'Hospital not found.' });
  }

  const doctor = db.prepare(
    `SELECT d.id, d.doctor_name, d.speciality, s.delay_minutes
     FROM doctors d
     LEFT JOIN doctor_schedules s ON d.id = s.doctor_id AND s.date = ?
     WHERE d.id = ? AND d.hospital_id = ?`
  ).get(date, doctorId, hid(req));

  if (!doctor) {
    return res.status(404).json({ error: 'Doctor not found or not scheduled for today.' });
  }

  const banner = db.prepare(
    `SELECT title, media_url, media_type FROM banner_ads
     WHERE (hospital_id IS NULL OR hospital_id = ?) AND active = 1
     AND (start_date IS NULL OR start_date <= date('now'))
     AND (end_date IS NULL OR end_date >= date('now'))
     ORDER BY RANDOM() LIMIT 1`
  ).get(hid(req));

  const appointments = db.prepare(`
    SELECT a.id, a.token_number, p.patient_name, a.status
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    WHERE a.doctor_id = ?
      AND a.hospital_id = ?
      AND a.appointment_date = ?
      AND a.status IN ('scheduled', 'in_progress')
    ORDER BY a.token_number ASC
  `).all(doctorId, hid(req), date);

  const current = appointments.find(a => a.status === 'in_progress') || null;
  const next = appointments.find(a => a.status === 'scheduled') || null;
  const upcoming = appointments.filter(a => a.status === 'scheduled' && a.id !== next?.id);

  res.json({ hospital, doctor, banner, current, next, upcoming });
});

router.get('/all-queues', (req, res) => {
  const date = new Date().toISOString().slice(0, 10);

  const hospital = db.prepare(
    'SELECT id, hospital_name, logo_url, header_color FROM hospitals WHERE id = ?'
  ).get(hid(req));

  if (!hospital) {
    return res.status(404).json({ error: 'Hospital not found.' });
  }

  const doctors = db.prepare(`
    SELECT
      d.id,
      d.doctor_name,
      d.speciality,
      d.photo_url,
      d.status as doctor_status,
      s.is_available,
      s.room_number,
      s.delay_minutes,
      s.timeslots
    FROM doctors d
    LEFT JOIN doctor_schedules s ON d.id = s.doctor_id AND s.date = ?
    WHERE d.hospital_id = ?
    ORDER BY d.doctor_name
  `).all(date, hid(req));

  const queues = doctors.map(doc => {
    const appointments = db.prepare(`
      SELECT a.id, a.token_number, p.patient_name, a.status
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      WHERE a.doctor_id = ?
        AND a.hospital_id = ?
        AND a.appointment_date = ?
        AND a.status IN ('scheduled', 'in_progress')
      ORDER BY a.token_number ASC
    `).all(doc.id, hid(req), date);

    const current = appointments.find(a => a.status === 'in_progress') || null;
    const next = appointments.filter(a => a.status === 'scheduled');

    return {
      ...doc,
      current,
      next,
    };
  });

  res.json({ hospital, queues });
});

export default router;
