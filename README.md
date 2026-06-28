# EMR + HIMS Platform

Production-ready cloud-based EMR + Hospital Information Management System for small clinics in India (1–5 doctors).

**Stack:** Node.js + Express · PostgreSQL + Prisma · Vite + React · JWT auth · Tailwind (design-system tokens)

---

## Features

| Module | Roles | Description |
|---|---|---|
| **Auth + RBAC** | All | JWT access + httpOnly refresh tokens, role guards, password change |
| **Dashboard** | All | Live KPIs (revenue, patients, queue), today's appointments |
| **Patients** | Admin, Reception | Registration, search, soft-delete, medical timeline |
| **Appointments** | Admin, Reception | Booking, double-book prevention, status workflow |
| **Queue** | All | Live token queue, auto-refresh, vitals/EMR shortcuts |
| **Vitals** | All | Temperature, BP, pulse, SpO₂, auto BMI |
| **EMR** | Doctor, Admin | SOAP notes, ICD-10 diagnoses, prescriptions |
| **Billing** | Admin, Reception | Line items, GST, discounts, partial payments |
| **Reports** | Admin | Revenue, patient mix, doctor performance |
| **Staff** | Admin | User management, doctor profiles, password reset |
| **Settings** | Admin | Clinic profile, audit logs |

All mutations are written to an **audit log** with actor, IP, and before/after values.

---

## Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ running locally

### 1. Backend

```bash
cd backend
cp .env.example .env          # fill in DATABASE_* and JWT secrets
npm install
npx prisma migrate dev --name init
npm run seed                  # creates demo clinic + 3 users
npm run dev                   # http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

The Vite dev server proxies `/api` → `http://localhost:5000`.

### Demo Credentials

| Role | Email | Password |
|---|---|---|
| Administrator | admin@demo.com | Admin@1234 |
| Doctor | doctor@demo.com | Doctor@1234 |
| Receptionist | receptionist@demo.com | Staff@1234 |

---

## Production Deployment

### Option A — Docker Compose (single host)

```bash
# Set secrets in a .env file at repo root:
#   DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME
#   JWT_SECRET, JWT_REFRESH_SECRET (32+ chars each)
#   FRONTEND_URL=https://your-domain.com

docker compose up -d --build
```

- Frontend served by nginx on port 80 (proxies `/api` → backend)
- Backend runs `prisma migrate deploy` on boot
- PostgreSQL data persisted in the `pgdata` volume

### Option B — Managed services

The app is **environment-driven** — switch from local Postgres to AWS RDS / Cloud SQL / Neon / Azure by changing only `DATABASE_URL`. No code changes required.

- **Frontend** → Vercel / Netlify / S3+CloudFront (`npm run build` → `dist/`)
- **Backend** → Railway / Render / Fly.io / ECS
- **Database** → Neon / RDS / Cloud SQL

---

## Architecture

```
backend/
  prisma/schema.prisma        # 12 normalized models, indexed, soft-deletes
  src/
    config/                   # env, prisma client, logger
    middleware/               # auth, RBAC, validation, rate-limit, errors
    modules/<feature>/        # service → controller → routes → validators
    utils/                    # response envelope, pagination, audit, generators

frontend/
  src/
    components/ui/            # design-system: Button, Card, Table, Modal, ...
    layout/                   # Sidebar, Topbar, Layout
    pages/<feature>/          # one folder per module
    services/                 # axios client w/ silent token refresh + API map
    store/                    # Zustand auth store (persisted)
    styles/tokens.css         # design-system single source of truth
```

### Security
- bcrypt password hashing (12 rounds)
- JWT access (15m) + rotating refresh tokens (httpOnly cookie, 7d)
- Per-clinic data isolation on every query
- Helmet, CORS allowlist, rate limiting (global + strict auth)
- express-validator on every write endpoint
- Prisma parameterized queries (SQL-injection safe)
- Full audit trail

### API
RESTful, versioned at `/api/v1`. Consistent envelope:

```json
{ "success": true, "message": "...", "data": {}, "pagination": {} }
```

---

## Roadmap (designed-for, not yet wired)
- WhatsApp prescription/invoice delivery (Meta Cloud API)
- AI voice-to-SOAP & diagnosis suggestions (Claude API)
- PDF prescription/invoice generation
- Multi-clinic switching for chains
