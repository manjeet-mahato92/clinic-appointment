import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/index.js';
import { createToken } from '../middleware/auth.js';

const router = Router();

router.post('/super-admin/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const admin = db.prepare('SELECT * FROM super_admins WHERE email = ?').get(email);
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const user = { id: admin.id, role: 'super_admin', name: admin.name };
  const token = createToken(user);
  res.json({ token, user });
});

router.post('/hospital/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const hospital = db.prepare('SELECT * FROM hospitals WHERE email = ?').get(email);
  if (!hospital || !bcrypt.compareSync(password, hospital.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (hospital.status === 'suspended') {
    return res.status(403).json({ error: 'This clinic account has been suspended. Please contact support.' });
  }

  const user = { id: hospital.id, role: 'hospital', name: hospital.hospital_name, hospitalId: hospital.id, logo_url: hospital.logo_url };
  const token = createToken(user);
  res.json({ token, user });
});

router.post('/doctor/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const doctor = db.prepare('SELECT * FROM doctors WHERE email = ?').get(email);
  if (!doctor || !bcrypt.compareSync(password, doctor.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const hospital = db.prepare('SELECT status FROM hospitals WHERE id = ?').get(doctor.hospital_id);
  if (hospital?.status === 'suspended') {
    return res.status(403).json({ error: 'The parent clinic for this account has been suspended.' });
  }

  const user = { id: doctor.id, role: 'doctor', name: doctor.doctor_name, hospitalId: doctor.hospital_id, photo_url: doctor.photo_url };
  const token = createToken(user);
  res.json({ token, user });
});

router.post('/display/login', (req, res) => {
  const { hospitalId, password } = req.body;
  if (!hospitalId || !password) return res.status(400).json({ error: 'Hospital ID and password are required' });

  const hospital = db.prepare('SELECT * FROM hospitals WHERE id = ?').get(hospitalId);
  if (!hospital || !bcrypt.compareSync(password, hospital.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (hospital.status === 'suspended') {
    return res.status(403).json({ error: 'This clinic account has been suspended.' });
  }

  const user = { id: hospital.id, role: 'display', name: hospital.hospital_name, hospitalId: hospital.id, logo_url: hospital.logo_url };
  const token = createToken(user);
  res.json({ token, user });
});

export default router;