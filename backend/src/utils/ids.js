import { v4 as uuid } from 'uuid';

// Hospitals now use a clean 6-digit numeric ID for Display Control login.
function randomHospitalId() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function generateHospitalId(db) {
  let id;
  do {
    id = randomHospitalId();
  } while (db.prepare('SELECT 1 FROM hospitals WHERE id = ?').get(id));
  return id;
}

export function generateUuid() {
  return uuid();
}
