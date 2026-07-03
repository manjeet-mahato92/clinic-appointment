import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import db from '../db/index.js';
import { signToken } from '../utils/auth.js';

const router = Router();

// --- Super Admin login ---
router.post('/super-admin/login', (req, res) => {
  const { email, password } = req.body;
  const admin = db.prepare('SELECT * FROM super_admins WHERE email = ?').get(email);
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = signToken({ id: admin.id, role: 'super_admin' });
  res.json({ token, user: { id: admin.id, name: admin.name, email: admin.email, role: 'super_admin' } });
});

// --- Hospital/Clinic login ---
router.post('/hospital/login', (req, res) => {
  const { email, password } = req.body;
  const hospital = db.prepare('SELECT * FROM hospitals WHERE email = ?').get(email);
  if (!hospital || !bcrypt.compareSync(password, hospital.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (hospital.status !== 'active') {
    return res.status(403).json({ error: `Account is ${hospital.status}. Contact Super Admin.` });
  }
  const token = signToken({ id: hospital.id, role: 'hospital', hospitalId: hospital.id });
  res.json({
    token,
    user: { id: hospital.id, name: hospital.hospital_name, email: hospital.email, role: 'hospital' },
  });
});

// --- Doctor login ---
router.post('/doctor/login', (req, res) => {
  const { email, password } = req.body;
  const doctor = db.prepare('SELECT * FROM doctors WHERE email = ?').get(email);
  if (!doctor || !bcrypt.compareSync(password, doctor.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = signToken({ id: doctor.id, role: 'doctor', hospitalId: doctor.hospital_id });
  res.json({
    token,
    user: {
      id: doctor.id,
      name: doctor.doctor_name,
      email: doctor.email,
      role: 'doctor',
      hospitalId: doctor.hospital_id,
    },
  });
});

// --- Display Control login (Hospital ID + password, per wireframe) ---
router.post('/display/login', (req, res) => {
  const { hospitalId, password } = req.body;
  const hospital = db.prepare('SELECT * FROM hospitals WHERE id = ?').get(hospitalId);
  if (!hospital || !bcrypt.compareSync(password, hospital.password_hash)) {
    return res.status(401).json({ error: 'Invalid Hospital/Clinic ID or password' });
  }
  const token = signToken({ id: hospital.id, role: 'display', hospitalId: hospital.id });
  res.json({
    token,
    hospital: { id: hospital.id, name: hospital.hospital_name, logo_url: hospital.logo_url },
  });
});

export default router;
