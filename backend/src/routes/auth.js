import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/index.js';
import { v4 as uuid } from 'uuid';
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

router.post('/forgot-password', (req, res) => {
  const { email, role } = req.body;
  if (!email || !role || !['hospital', 'doctor'].includes(role)) {
    return res.status(400).json({ error: 'A valid email and role are required.' });
  }

  const table = role === 'hospital' ? 'hospitals' : 'doctors';
  const user = db.prepare(`SELECT id FROM ${table} WHERE email = ?`).get(email);

  if (user) {
    const token = uuid();
    const expires_at = new Date(Date.now() + 3600 * 1000).toISOString(); // 1 hour expiry

    db.prepare(
      `INSERT INTO password_resets (token, user_id, user_role, expires_at) VALUES (?, ?, ?, ?)`
    ).run(token, user.id, role, expires_at);

    // In a real app, you would email this link. For now, we log it.
    const resetLink = `http://localhost:5173/reset-password?token=${token}`;
    console.log('--------------------------------------------------');
    console.log(`Password reset link for ${email}:`);
    console.log(resetLink);
    console.log('--------------------------------------------------');
  }

  // Always return a success message to prevent email enumeration attacks.
  res.json({ message: 'If an account with that email exists, a password reset link has been generated.' });
});

router.post('/reset-password', (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'Token and new password are required.' });
  }

  const resetRequest = db.prepare('SELECT * FROM password_resets WHERE token = ?').get(token);

  if (!resetRequest || new Date() > new Date(resetRequest.expires_at)) {
    if (resetRequest) db.prepare('DELETE FROM password_resets WHERE token = ?').run(token);
    return res.status(400).json({ error: 'This reset token is invalid or has expired.' });
  }

  const table = resetRequest.user_role === 'hospital' ? 'hospitals' : 'doctors';
  const new_password_hash = bcrypt.hashSync(password, 10);

  try {
    db.prepare(`UPDATE ${table} SET password_hash = ? WHERE id = ?`).run(new_password_hash, resetRequest.user_id);
    db.prepare('DELETE FROM password_resets WHERE token = ?').run(token);
    res.json({ message: 'Password has been reset successfully.' });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ error: 'An unexpected error occurred while resetting the password.' });
  }
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