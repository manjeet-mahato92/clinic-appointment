// Tokens are scoped to a single doctor + calendar date.
// - New appointment -> next sequential token number for that doctor/date.
// - Cancelling an appointment closes the gap: every later token for that
//   doctor/date shifts down by one, keeping the queue contiguous.

export function getNextTokenNumber(db, doctorId, date) {
  const row = db
    .prepare(
      `SELECT COALESCE(MAX(token_number), 0) AS maxToken
       FROM appointments
       WHERE doctor_id = ? AND appointment_date = ? AND status != 'cancelled'`
    )
    .get(doctorId, date);
  return row.maxToken + 1;
}

export function renumberTokens(db, doctorId, date) {
  const active = db
    .prepare(
      `SELECT id FROM appointments
       WHERE doctor_id = ? AND appointment_date = ? AND status != 'cancelled'
       ORDER BY token_number ASC, created_at ASC`
    )
    .all(doctorId, date);

  const update = db.prepare(
    `UPDATE appointments SET token_number = ?, updated_at = datetime('now') WHERE id = ?`
  );

  const tx = db.transaction((rows) => {
    rows.forEach((row, idx) => update.run(idx + 1, row.id));
  });
  tx(active);
}
