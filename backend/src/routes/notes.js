import { Router } from 'express';
import CompanyNote from '../models/CompanyNote.js';

const router = Router();

function canReadNote(note, viewerId, viewerRole) {
  if (viewerRole === 'admin' || viewerRole === 'controller') return true;
  if (note.userId === viewerId) return true;
  if (note.shareEveryone) return true;
  if (Array.isArray(note.shareUserIds) && note.shareUserIds.includes(viewerId)) return true;
  return false;
}

/** GET /api/notes?companyId=&viewerId=&viewerRole=&folder=&q= */
router.get('/', async (req, res, next) => {
  try {
    const { companyId, viewerId, viewerRole, folder, q } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });

    const filter = { companyId };
    if (folder) filter.folder = folder;

    let notes = await CompanyNote.find(filter).sort({ pinned: -1, updated_at: -1 });

    if (q && String(q).trim()) {
      const rx = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      notes = notes.filter((n) => rx.test(n.title) || rx.test(n.body || ''));
    }

    if (viewerId && viewerRole) {
      notes = notes.filter((n) => canReadNote(n, viewerId, viewerRole));
    }

    res.json({ notes });
  } catch (err) {
    next(err);
  }
});

/** POST /api/notes */
router.post('/', async (req, res, next) => {
  try {
    const { companyId, userId } = req.body;
    if (!companyId || !userId) {
      return res.status(400).json({ error: 'companyId and userId are required' });
    }
    if (!req.body.title?.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }

    const note = await CompanyNote.create({
      companyId,
      userId,
      userName: req.body.userName || '',
      folder: req.body.folder || 'General',
      title: req.body.title.trim(),
      body: req.body.body || '',
      tags: Array.isArray(req.body.tags) ? req.body.tags : [],
      pinned: !!req.body.pinned,
      shareEveryone: !!req.body.shareEveryone,
      shareUserIds: Array.isArray(req.body.shareUserIds) ? req.body.shareUserIds : [],
    });
    res.status(201).json({ note });
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/notes/:id */
router.patch('/:id', async (req, res, next) => {
  try {
    const { companyId, userId } = req.body;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });

    const existing = await CompanyNote.findOne({ _id: req.params.id, companyId });
    if (!existing) return res.status(404).json({ error: 'Note not found' });
    if (existing.userId !== userId) {
      return res.status(403).json({ error: 'Only the author can edit this note' });
    }

    const allowed = ['folder', 'title', 'body', 'tags', 'pinned', 'shareEveryone', 'shareUserIds'];
    const updates = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    if (updates.title !== undefined) updates.title = String(updates.title).trim();

    const note = await CompanyNote.findOneAndUpdate(
      { _id: req.params.id, companyId },
      { $set: updates },
      { new: true }
    );
    res.json({ note });
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/notes/:id */
router.delete('/:id', async (req, res, next) => {
  try {
    const { companyId, userId } = req.query;
    if (!companyId || !userId) {
      return res.status(400).json({ error: 'companyId and userId are required' });
    }
    const removed = await CompanyNote.findOneAndDelete({
      _id: req.params.id,
      companyId,
      userId,
    });
    if (!removed) return res.status(404).json({ error: 'Note not found or not authorized' });
    res.json({ message: 'Note deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
