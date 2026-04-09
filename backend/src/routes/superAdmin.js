// backend/src/routes/superAdmin.js
// Super Admin routes — platform owner control panel
import { Router } from 'express';
import Company from '../models/Company.js';
import User from '../models/User.js';
import Task from '../models/Task.js';
import Attendance from '../models/Attendance.js';

const router = Router();

// ── Hardcoded Super Admin credentials ─────────────────────────
const SUPER_ADMIN_EMAIL    = 'admin@adscroll360.com';
const SUPER_ADMIN_PASSWORD = 'mg6VMj54a5cfDn6p';

/** POST /api/super-admin/login */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'email and password are required' });

    if (
      email.toLowerCase() !== SUPER_ADMIN_EMAIL ||
      password !== SUPER_ADMIN_PASSWORD
    ) {
      return res.status(401).json({ error: 'Invalid super admin credentials' });
    }

    res.json({
      user: {
        id: 'super_admin',
        name: 'Super Admin',
        email: SUPER_ADMIN_EMAIL,
        role: 'super_admin',
      },
    });
  } catch (err) { next(err); }
});

/** GET /api/super-admin/stats — platform overview */
router.get('/stats', async (_req, res, next) => {
  try {
    const [companiesCount, usersCount, tasksCount, companies] = await Promise.all([
      Company.countDocuments(),
      User.countDocuments({ role: { $ne: 'super_admin' } }),
      Task.countDocuments(),
      Company.find().sort({ created_at: -1 }).limit(5),
    ]);
    res.json({ companiesCount, usersCount, tasksCount, recentCompanies: companies });
  } catch (err) { next(err); }
});

/** GET /api/super-admin/companies */
router.get('/companies', async (_req, res, next) => {
  try {
    const companies = await Company.find().sort({ created_at: -1 });
    // Enrich with user count per company
    const enriched = await Promise.all(companies.map(async (c) => {
      const userCount = await User.countDocuments({ companyId: c.id });
      return { ...c.toJSON(), userCount };
    }));
    res.json({ companies: enriched });
  } catch (err) { next(err); }
});

/** GET /api/super-admin/companies/:id */
router.get('/companies/:id', async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    const users = await User.find({ companyId: req.params.id });
    const tasks = await Task.countDocuments({ companyId: req.params.id });
    res.json({ company, userCount: users.length, taskCount: tasks, users });
  } catch (err) { next(err); }
});

/** POST /api/super-admin/companies — create company + auto-create admin user */
router.post('/companies', async (req, res, next) => {
  try {
    const { name, adminEmail, adminPassword, plan, industry, website } = req.body;
    if (!name || !adminEmail || !adminPassword)
      return res.status(400).json({ error: 'name, adminEmail and adminPassword are required' });

    const existing = await Company.findOne({ adminEmail: adminEmail.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'A company with this admin email already exists' });

    const existingUser = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existingUser) return res.status(409).json({ error: 'Email already in use by another user' });

    // Create company
    const company = await Company.create({ name, adminEmail, adminPassword, plan: plan || 'Starter', industry, website });

    // Create company admin user
    await User.create({
      name: `${name} Admin`,
      email: adminEmail.toLowerCase(),
      password: adminPassword,
      role: 'admin',
      companyId: company.id,
    });

    res.status(201).json({ company });
  } catch (err) { next(err); }
});

/** PATCH /api/super-admin/companies/:id — edit company */
router.patch('/companies/:id', async (req, res, next) => {
  try {
    const allowed = ['name', 'plan', 'status', 'industry', 'website', 'employeeLimit'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const company = await Company.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json({ company });
  } catch (err) { next(err); }
});

/** POST /api/super-admin/companies/:id/reset-admin — reset company admin password */
router.post('/companies/:id/reset-admin', async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ error: 'newPassword must be at least 6 characters' });

    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    // Update company record
    company.adminPassword = newPassword;
    await company.save();

    // Update company admin user
    await User.findOneAndUpdate(
      { email: company.adminEmail, companyId: company.id },
      { password: newPassword }
    );

    res.json({ message: 'Admin password reset successfully' });
  } catch (err) { next(err); }
});

/** DELETE /api/super-admin/companies/:id — delete company and all its data */
router.delete('/companies/:id', async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    await Promise.all([
      User.deleteMany({ companyId: req.params.id }),
      Task.deleteMany({ companyId: req.params.id }),
      Attendance.deleteMany({ companyId: req.params.id }),
    ]);
    await Company.findByIdAndDelete(req.params.id);

    res.json({ message: 'Company and all associated data deleted' });
  } catch (err) { next(err); }
});

export default router;
