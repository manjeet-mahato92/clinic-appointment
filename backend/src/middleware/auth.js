import { verifyToken } from '../utils/auth.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing auth token' });

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // { id, role, hospitalId }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Usage: requireRole('super_admin', 'hospital')
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden — insufficient role' });
    }
    next();
  };
}

// Ensures a hospital/doctor user can only touch their own hospital's data
export function scopeToHospital(req, res, next) {
  if (req.user.role === 'super_admin') return next(); // super admin bypasses scoping
  const targetHospitalId = req.params.hospitalId || req.body.hospital_id || req.user.hospitalId;
  if (targetHospitalId !== req.user.hospitalId) {
    return res.status(403).json({ error: 'Forbidden — not your hospital' });
  }
  next();
}
