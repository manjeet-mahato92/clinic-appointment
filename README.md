# Appointment Token Management for Clinic

A full-stack app for managing clinic appointment tokens across five roles, matching your original spec:

- **Super Admin** — onboard hospitals/clinics, activate/pause/suspend, track activation & payment references, manage banner ads
- **Hospital/Clinic** — manage doctors, manage patients, WhatsApp contact, manage appointments & token generation, reschedule
- **Doctor** — view patient details, close appointments, click next, reschedule
- **Patient** — self-service token booking (no login required)
- **Display Control** — public waiting-room screen: enter Hospital ID + password → select doctor → live current/next/upcoming queue + banner ad

## Stack

- **Backend:** Node.js, Express, SQLite (via `better-sqlite3` — a single file DB, no server to install), JWT auth, bcrypt password hashing.
- **Frontend:** React (Vite), React Router, Tailwind CSS, Axios.

No external database server or paid services required — everything runs locally.

## 1. Backend setup

```bash
cd backend
cp .env.example .env      # edit JWT_SECRET if you like
npm install
npm run seed               # creates demo super admin, hospital, doctors, patients, today's tokens
npm run dev                 # starts API on http://localhost:4000
```

Demo credentials created by `npm run seed`:

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@clinictokens.app | SuperAdmin@123 |
| Hospital/Clinic | reception@sunrise-clinic.test | Hospital@123 |
| Doctor | rohan.mehta@sunrise-clinic.test | Doctor@123 |
| Doctor | kavita.iyer@sunrise-clinic.test | Doctor@123 |

The seed script also prints the 6-digit numeric Hospital ID needed to log into **Display Control** (or copy it from Super Admin → Hospitals, or Hospital → Clinic Profile, in the UI). The display password is the same as the hospital's login password (`Hospital@123` for the demo clinic).

## 2. Frontend setup

In a second terminal:

```bash
cd frontend
cp .env.example .env       # points at http://localhost:4000/api by default
npm install
npm run dev                 # starts the app on http://localhost:5173
```

Open http://localhost:5173 — you'll land on the login screen with role tabs for Hospital/Clinic, Doctor, Super Admin, and Display Control, plus a "Book an appointment token" link for patients.

## How the token logic works

- Tokens are generated **daily, per doctor** — the counter resets for each new date.
- Booking (from Hospital dashboard, Doctor isn't required to book, or the public Patient booking page) assigns the next sequential token number for that doctor + date.
- **Cancelling** a token automatically renumbers every later token for that doctor/date, closing the gap — exactly as described in the spec ("Token No. auto adjust if Appointment cancelled").
- **Rescheduling** moves the appointment to a new date, assigns it a fresh token there, and renumbers the queue it left behind.
- The Doctor's **"Click Next"** button completes whoever is currently in progress and promotes the next scheduled token to "in progress" — this is what the Display Control screen reads as "Current Appointment".

## Project structure

```
backend/
  src/
    db/            SQLite schema, connection, seed script
    middleware/     JWT auth + role guards
    routes/         auth, super-admin, hospital, doctor, display, public
    utils/          token numbering logic, JWT helpers
frontend/
  src/
    pages/          one file per screen/role
    components/     Layout, Modal, StatusBadge, TokenFlap (display board digits), ProtectedRoute
    context/         AuthContext (JWT + role in localStorage)
    api/            Axios client with auth header injection
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the Cloudflare-ready path. In short: deploy `frontend/` to Cloudflare Pages, and deploy the current Express/SQLite `backend/` to a Node host with persistent storage. A full Cloudflare backend requires migrating SQLite access to D1.

## Notes & next steps

- Images/logos/banners are stored as URLs (paste any image link) rather than file uploads — wire up S3/Cloudinary later if you need real uploads.
- WhatsApp contact uses `wa.me` deep links (no WhatsApp Business API needed) — click "WhatsApp" next to a patient to open a pre-filled chat.
- The Display Control screen polls the API every 5 seconds; swap to WebSockets later if you want instant updates across many screens.
- Passwords are bcrypt-hashed; JWTs expire after 12 hours.
- SQLite is great for getting started and even fairly high traffic; if you outgrow it, the SQL is close enough to Postgres that migrating is straightforward.
