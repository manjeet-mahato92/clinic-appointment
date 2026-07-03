import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('hospital', 'display'));

const hid = (req) => req.user.hospitalId;

// List doctors available to select on this display terminal
router.get('/doctors', (req, res) => {
  res.json(
    db.prepare(`SELECT id, doctor_name, speciality FROM doctors WHERE hospital_id = ? AND status = 'active'`).all(hid(req))
  );
})

// Full queue view for a chosen doctor — current / next / upcoming 10 / banner ad
router.get('/queue/:doctorId', (req, res) => {
  const date = new Date().toISOString().slice(0, 10);
  const doctor = db.prepare('SELECT * FROM doctors WHERE id = ? AND hospital_id = ?').get(req.params.doctorId, hid(req));
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

  const hospital = db.prepare(
    `SELECT hospital_name, logo_url, banner_url, header_color, timing FROM hospitals WHERE id = ?`
  ).get(hid(req));

  const baseQuery = `
    SELECT a.id, a.token_number, a.status, a.appointment_date, p.patient_name
    FROM appointments a JOIN patients p ON p.id = a.patient_id
    WHERE a.doctor_id = ? AND a.appointment_date = ? AND a.status != 'cancelled'`;

  const current = db.prepare(`${baseQuery} AND a.status = 'in_progress' ORDER BY a.token_number ASC LIMIT 1`).get(req.params.doctorId, date);
  const next = db.prepare(`${baseQuery} AND a.status = 'scheduled' ORDER BY a.token_number ASC LIMIT 1`).get(req.params.doctorId, date);
  const upcoming = db.prepare(`${baseQuery} AND a.status = 'scheduled' ORDER BY a.token_number ASC LIMIT 10 OFFSET 1`).all(req.params.doctorId, date);

  const banner = db.prepare(
    `SELECT * FROM banner_ads WHERE active = 1 AND (hospital_id = ? OR hospital_id IS NULL)
     ORDER BY (hospital_id IS NOT NULL) DESC, created_at DESC LIMIT 1`
  ).get(hid(req));

  res.json({
    hospital,
    doctor: { id: doctor.id, doctor_name: doctor.doctor_name, speciality: doctor.speciality },
    date,
    current: current || null,
    next: next || null,
    upcoming,
    banner: banner || null,
  });
});

export default router;
