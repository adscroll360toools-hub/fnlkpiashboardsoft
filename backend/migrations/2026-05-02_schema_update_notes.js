/**
 * Schema reference (MongoDB is schemaless; this file documents fields added in code):
 *
 * - User.profilePhotoUrl — string | null, profile image path e.g. /uploads/…
 * - Task.assignedTime — optional "HH:MM" 24h
 * - Task.messages[] — reactions[], readBy[]
 * - Task.chatTyping — { userId, userName, updatedAt }
 * - Company.taskCategories — string[] ordered list
 * - Company.workingHours.hoursPerDay — 1–24; new companies default 24 in app (existing rows unchanged)
 *
 * No bulk update is required for existing documents. Backfill only if you add custom reports.
 *
 * Run: node backend/migrations/2026-05-02_schema_update_notes.js
 */
import connectDB from '../src/config/db.js';

await connectDB();
console.log('[migration] Connected. No data mutations — schema is additive-only.');
process.exit(0);
