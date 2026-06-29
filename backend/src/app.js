import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import { env } from './config/env.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// ─── Security Headers ────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // allow Vite-built assets
}));

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: env.isProduction ? true : env.FRONTEND_URL,
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

// ─── API Routes ──────────────────────────────────────────────────────────────
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

// ─── Serve Frontend static files (production only) ───────────────────────────
if (env.isProduction) {
  const publicDir = path.join(__dirname, '../../public');
  app.use(express.static(publicDir, { maxAge: '1d' }));
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
} else {
  app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
  });
}

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
