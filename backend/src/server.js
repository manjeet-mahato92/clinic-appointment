import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import superAdminRoutes from './routes/superAdmin.js';
import hospitalRoutes from './routes/hospital.js';
import doctorRoutes from './routes/doctor.js';
import displayRoutes from './routes/display.js';
import publicRoutes from './routes/public.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : undefined;

// Local development allows all origins; production can restrict via CORS_ORIGIN.
app.use(cors(corsOrigins ? { origin: corsOrigins } : undefined));
app.use(express.json());
app.use(morgan('dev'));

// Serve uploaded files
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'clinic-token-backend' }));

import apiRouter from './routes/index.js';
app.use('/api/auth', authRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/hospital', hospitalRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/display', displayRoutes);
app.use('/api/public', publicRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Clinic Token API running on http://localhost:${PORT}`));
