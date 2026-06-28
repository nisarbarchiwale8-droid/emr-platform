import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import { env } from './config/env.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { globalLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

// Route imports
import authRoutes from './modules/auth/auth.routes.js';
import patientRoutes from './modules/patients/patients.routes.js';
import appointmentRoutes from './modules/appointments/appointments.routes.js';
import queueRoutes from './modules/queue/queue.routes.js';
import vitalsRoutes from './modules/vitals/vitals.routes.js';
import emrRoutes from './modules/emr/emr.routes.js';
import billingRoutes from './modules/billing/billing.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import reportRoutes from './modules/reports/reports.routes.js';
import staffRoutes from './modules/staff/staff.routes.js';
import settingsRoutes from './modules/settings/settings.routes.js';
import registrationRoutes from './modules/registration/registration.routes.js';
import publicRoutes from './modules/public/public.routes.js';

const app = express();

// ─── Security Headers ────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ────────────────────────────────────────────────────────────────────
// In production the frontend is served from the same origin, so allow that too
const corsOrigins = env.isProduction
  ? true  // same-origin — allow all (helmet already handles security headers)
  : env.FRONTEND_URL;

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Compression ─────────────────────────────────────────────────────────────
app.use(compression());

// ─── Request Logging ─────────────────────────────────────────────────────────
if (env.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  }));
}

// ─── Rate Limiting ───────────────────────────────────────────────────────────
app.use('/api', globalLimiter);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: env.NODE_ENV, version: '1.0.0' });
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/queue', queueRoutes);
app.use('/api/v1/vitals', vitalsRoutes);
app.use('/api/v1/emr', emrRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/registration', registrationRoutes);
app.use('/api/v1/public', publicRoutes);

// ─── Serve Frontend (production) ─────────────────────────────────────────────
if (env.isProduction) {
  const publicDir = path.join(__dirname, '../../public');
  app.use(express.static(publicDir));
  // SPA fallback — any non-API route serves index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
} else {
  // ─── 404 Handler (dev only) ────────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
  });
}

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
