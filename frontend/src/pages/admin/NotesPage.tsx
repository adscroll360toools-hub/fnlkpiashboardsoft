import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Pin, Plus, FolderOpen, X, Loader2, Share2 } from "lucide-react";
import { stagger, fadeUp } from "@/lib/animations";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface NoteRow {
  id: string;
  folder: string;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  shareEveryone: boolean;
  userId: string;
  userName: string;
}

function mapNote(n: any): NoteRow {
  return {
    id: n.id || n._id,
    folder: n.folder || "General",
    title: n.title,
    body: n.body || "",
    tags: n.tags || [],
    pinned: !!n.pinned,
    shareEveryone: !!n.shareEveryone,
    userId: n.userId,
    userName: n.userName || "",
  };
}

export default function NotesPage() {
  const { currentUser } = useAuth();
  const companyId = currentUser?.companyId;

  const [allNotes, setAllNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [folder, setFolder] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [readOnly, setReadOnly] = useState<NoteRow | null>(null);
  const [editing, setEditing] = useState<NoteRow | null>(null);
  const [title, setTitle] = useState("");
  const [noteFolder, setNoteFolder] = useState("General");
  const [body, setBody] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [pinned, setPinned] = useState(false);
  const [shareEveryone, setShareEveryone] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!companyId || !currentUser) {
      setAllNotes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params: Record<string, string> = {
        companyId,
        viewerId: currentUser.id,
        viewerRole: currentUser.role,
      };
      if (search.trim()) params.q = search.trim();
      const { notes: raw } = await api.notes.list(params);
      setAllNotes((raw || []).map(mapNote));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load notes");
      setAllNotes([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, currentUser, search]);

  useEffect(() => {
    const t = setTimeout(() => load(), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const notes = useMemo(() => {
    let rows = folder === "All" ? allNotes : allNotes.filter((n) => n.folder === folder);
    rows = [...rows].sort((a, b) => Number(b.pinned) - Number(a.pinned));
    return rows;
  }, [allNotes, folder]);

  const folders = useMemo(() => {
    const s = new Set<string>(["General"]);
    allNotes.forEach((n) => s.add(n.folder));
    return ["All", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [allNotes]);

  const openNew = () => {
    setEditing(null);
    setTitle("");
    setNoteFolder(folder === "All" ? "General" : folder);
    setBody("");
    setTagsStr("");
    setPinned(false);
    setShareEveryone(false);
    setShowModal(true);
  };

  const openEdit = (n: NoteRow) => {
    if (n.userId !== currentUser?.id) {
      setReadOnly(n);
      return;
    }
    setEditing(n);
    setTitle(n.title);
    setNoteFolder(n.folder);
    setBody(n.body);
    setTagsStr((n.tags || []).join(", "));
    setPinned(n.pinned);
    setShareEveryone(n.shareEveryone);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !currentUser) return;
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    const tags = tagsStr
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setSaving(true);
    try {
      if (editing) {
        await api.notes.update(editing.id, {
          companyId,
          userId: currentUser.id,
          folder: noteFolder.trim() || "General",
          title: title.trim(),
          body,
          tags,
          pinned,
          shareEveryone,
        });
        toast.success("Note updated");
      } else {
        await api.notes.create({
          companyId,
          userId: currentUser.id,
          userName: currentUser.name,
          folder: noteFolder.trim() || "General",
          title: title.trim(),
          body,
          tags,
          pinned,
          shareEveryone,
        });
        toast.success("Note created");
      }
      setShowModal(false);
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (n: NoteRow) => {
    if (n.userId !== currentUser?.id) return;
    if (!window.confirm("Delete this note?")) return;
    try {
      await api.notes.remove(n.id, currentUser.id);
      toast.success("Note deleted");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    }
  };

  if (!companyId) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">Notes require a company workspace.</div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Notes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Folders, tags, pins, and team sharing (Notebook-style)</p>
        </div>
        <Button className="h-10 gap-2" onClick={openNew}>
          <Plus className="h-4 w-4" /> New note
        </Button>
      </motion.div>

      <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or body…"
            className="h-10 pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {folders.map((f) => (
            <Button key={f} type="button" size="sm" variant={folder === f ? "default" : "outline"} className="h-9" onClick={() => setFolder(f)}>
              {f === "All" ? "All folders" : f}
            </Button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : notes.length === 0 ? (
          <div className="col-span-full rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">No notes yet.</div>
        ) : (
          notes.map((n) => (
            <div
              key={n.id}
              className={`rounded-2xl border bg-card p-4 shadow-card transition-shadow hover:shadow-md ${n.pinned ? "ring-2 ring-primary/30" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {n.pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-primary" />}
                    <h3 className="font-semibold text-foreground truncate">{n.title}</h3>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                    <FolderOpen className="h-3 w-3" /> {n.folder} · {n.userName}
                    {n.shareEveryone && (
                      <span className="inline-flex items-center gap-0.5 text-primary">
                        <Share2 className="h-3 w-3" /> Team
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground whitespace-pre-wrap">{n.body || "—"}</p>
              {n.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {n.tags.map((t) => (
                    <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-3 flex gap-2">
                <Button type="button" size="sm" variant="outline" className="h-8 flex-1" onClick={() => openEdit(n)}>
                  {n.userId === currentUser?.id ? "Edit" : "Open"}
                </Button>
                {n.userId === currentUser?.id && (
                  <Button type="button" size="sm" variant="ghost" className="h-8 text-destructive" onClick={() => handleDelete(n)}>
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </motion.div>

      {readOnly && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setReadOnly(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl">
              <h2 className="text-lg font-semibold">{readOnly.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{readOnly.folder} · {readOnly.userName}</p>
              <p className="mt-4 whitespace-pre-wrap text-sm text-foreground">{readOnly.body || "—"}</p>
              <Button type="button" className="mt-6 w-full" variant="outline" onClick={() => setReadOnly(null)}>
                Close
              </Button>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => !saving && setShowModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-lg rounded-2xl border bg-card shadow-2xl"
            >
              <div className="flex items-center justify-between border-b px-5 py-3">
                <h2 className="text-base font-semibold">{editing ? "Edit note" : "New note"}</h2>
                <button type="button" className="rounded-lg p-2 hover:bg-muted" onClick={() => !saving && setShowModal(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleSave} className="space-y-3 p-5">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="h-9" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Folder</Label>
                    <Input value={noteFolder} onChange={(e) => setNoteFolder(e.target.value)} placeholder="General" className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tags (comma-separated)</Label>
                    <Input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="idea, client" className="h-9" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Content</Label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={8}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Write in plain text or markdown-style…"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={pinned} onCheckedChange={(c) => setPinned(c === true)} />
                    Pin note
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={shareEveryone} onCheckedChange={(c) => setShareEveryone(c === true)} />
                    Share with company
                  </label>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" className="flex-1" disabled={saving} onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 gap-2" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </motion.div>
  );
}
