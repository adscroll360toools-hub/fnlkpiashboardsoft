// ============================================================
//  Zaptiz — Backend API Server (Express.js + MongoDB)
//  Entry point: src/index.js
// ============================================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import connectDB from './config/db.js';
import healthRouter from './routes/health.js';
import usersRouter from './routes/users.js';
import tasksRouter from './routes/tasks.js';
import attendanceRouter from './routes/attendance.js';
import kpisRouter from './routes/kpis.js';
import superAdminRouter from './routes/superAdmin.js';
import notificationsRouter from './routes/notifications.js';
import rolesRouter from './routes/roles.js';
import standupsRouter from './routes/standups.js';
import notesRouter from './routes/notes.js';

// ── Connect to MongoDB ─────────────────────────────────────
await connectDB();

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security & Middleware ──────────────────────────────────
app.use(helmet());
app.use(morgan('dev'));

const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

allowedOrigins.push('http://localhost:8080');
allowedOrigins.push('http://localhost:5173');
allowedOrigins.push('https://kpi-ad-scroll360.vercel.app');
allowedOrigins.push('https://kpiadscroll360.vercel.app');
allowedOrigins.push('https://workspace.adscroll360.com');

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ─────────────────────────────────────────────────
app.use('/api/health',       healthRouter);
app.use('/api/users',        usersRouter);
app.use('/api/tasks',        tasksRouter);
app.use('/api/attendance',   attendanceRouter);
app.use('/api/kpis',         kpisRouter);
app.use('/api/super-admin',  superAdminRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/roles',           rolesRouter);
app.use('/api/standups',       standupsRouter);
app.use('/api/notes',          notesRouter);

// ── 404 Handler ────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global Error Handler ───────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// ── Start ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  Zaptiz API running on http://localhost:${PORT}`);
});

export default app;
