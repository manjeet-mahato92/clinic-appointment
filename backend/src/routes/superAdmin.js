import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import db from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { generateHospitalId } from '../utils/ids.js';

const router = Router();
router.use(requireAuth, requireRole('super_admin'));

// ---------- Hospitals ----------

router.get('/hospitals', (req, res) => {
  const hospitals = db
    .prepare(
      `SELECT id, hospital_name, email, contact_number, hospital_address, status,
              activation_date, payment_reference, timing, logo_url, created_at
       FROM hospitals ORDER BY created_at DESC`
    )
    .all();
  res.json(hospitals);
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
    'logo_url', 'banner_url', 'rep_name', 'rep_contact_number', 'rep_designation',
    'activation_date', 'payment_reference',
  ];
  const updates = [];
  const params = { id: req.params.id, email: req.body.email };

  if (req.body.email) {
    const existing = db.prepare('SELECT id FROM hospitals WHERE email = ? AND id != ?').get(req.body.email, req.params.id);
    if (existing) return res.status(409).json({ error: 'Email already in use' });
  }

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = @${f}`);
      params[f] = req.body[f];
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });

  try {
    db.prepare(`UPDATE hospitals SET ${updates.join(', ')} WHERE id = @id`).run(params);
    res.json({ message: 'Hospital updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update hospital. The email may already be in use.' });
  }
});

// Activate / Pause / Suspend
router.patch('/hospitals/:id/status', (req, res) => {
  const { status } = req.body; // active | paused | suspended
  if (!['active', 'paused', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'status must be active, paused, or suspended' });
  }
  const result = db.prepare('UPDATE hospitals SET status = ? WHERE id = ?').run(status, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Hospital not found' });
  res.json({ message: `Hospital marked ${status}` });
});

router.delete('/hospitals/:id', (req, res) => {
  db.prepare('DELETE FROM hospitals WHERE id = ?').run(req.params.id);
  res.json({ message: 'Hospital removed' });
});

// ---------- Banner Ads ----------

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
      (SELECT COUNT(*) FROM hospitals) AS totalHospitals,
      (SELECT COUNT(*) FROM hospitals WHERE status = 'active') AS activeHospitals,
      (SELECT COUNT(*) FROM hospitals WHERE status = 'paused') AS pausedHospitals,
      (SELECT COUNT(*) FROM hospitals WHERE status = 'suspended') AS suspendedHospitals,
      (SELECT COUNT(*) FROM doctors) AS totalDoctors,
      (SELECT COUNT(*) FROM patients) AS totalPatients,
      (SELECT COUNT(*) FROM appointments WHERE appointment_date = date('now')) AS todaysAppointments
  `).get();
  res.json(totals);
});

export default router;
