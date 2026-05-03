// backend/src/routes/uploads.js — multipart uploads (avatars, task attachments)
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.join(__dirname, '../../uploads');

function ensureDir() {
  if (!fs.existsSync(uploadsRoot)) fs.mkdirSync(uploadsRoot, { recursive: true });
}

const allowedMime = new Set(['image/jpeg', 'image/png', 'image/webp']);

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    ensureDir();
    cb(null, uploadsRoot);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safe =
      ext && ['.jpg', '.jpeg', '.png', '.webp'].includes(ext)
        ? ext
        : file.mimetype === 'image/jpeg'
          ? '.jpg'
          : file.mimetype === 'image/png'
            ? '.png'
            : '.webp';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (allowedMime.has(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPG, PNG, and WEBP images are allowed'));
  },
});

const router = Router();

function handleUpload(req, res) {
  if (!req.file) return res.status(400).json({ error: 'file is required' });
  const urlPath = `/uploads/${req.file.filename}`;
  res.json({ url: urlPath });
}

/** POST /api/uploads/avatar — multipart field "file" */
router.post('/avatar', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
    try {
      handleUpload(req, res);
    } catch (e) {
      next(e);
    }
  });
});

/** POST /api/uploads/task-chat — attachment for task discussion */
router.post('/task-chat', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
    try {
      handleUpload(req, res);
    } catch (e) {
      next(e);
    }
  });
});

export default router;
