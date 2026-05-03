import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { stagger, fadeUp } from "@/lib/animations";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tags, ChevronUp, ChevronDown, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

export default function TaskCategoriesPage() {
  const { currentUser } = useAuth();
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [renameIdx, setRenameIdx] = useState<number | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);
  const [newName, setNewName] = useState("");

  const load = async () => {
    if (!currentUser?.companyId) return;
    setLoading(true);
    try {
      const { company } = await api.tenantCompany.get(currentUser.companyId);
      const list = Array.isArray(company?.taskCategories) ? company.taskCategories.filter(Boolean) : [];
      setCategories(list.length ? list : []);
    } catch {
      toast.error("Could not load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [currentUser?.companyId]);

  const persist = async (next: string[]) => {
    if (!currentUser?.companyId || !currentUser?.id) return;
    await api.tenantCompany.patch(currentUser.companyId, {
      taskCategories: next,
      actorUserId: currentUser.id,
    });
    setCategories(next);
    toast.success("Categories saved");
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = newName.trim();
    if (!t || categories.includes(t)) return;
    await persist([...categories, t]);
    setNewName("");
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= categories.length) return;
    const next = [...categories];
    [next[idx], next[j]] = [next[j], next[idx]];
    await persist(next);
  };

  const confirmDelete = async () => {
    if (deleteIdx === null) return;
    const next = categories.filter((_, i) => i !== deleteIdx);
    setDeleteIdx(null);
    await persist(next);
  };

  const saveRename = async () => {
    if (renameIdx === null) return;
    const t = renameVal.trim();
    if (!t) return toast.error("Name required");
    if (categories.some((c, i) => c === t && i !== renameIdx)) return toast.error("Duplicate name");
    const next = categories.map((c, i) => (i === renameIdx ? t : c));
    setRenameIdx(null);
    await persist(next);
  };

  if (currentUser?.role !== "admin") {
    return <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">Admin only.</div>;
  }

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="mx-auto max-w-2xl space-y-6">
        <motion.div variants={fadeUp} className="flex items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
              <Tags className="h-7 w-7 text-primary" /> Task categories
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Create, rename, reorder, and remove categories used when assigning tasks.</p>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="rounded-2xl border bg-card p-6 shadow-card">
          <form onSubmit={handleAdd} className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label>New category</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Content QA" className="h-10" disabled={loading} />
            </div>
            <Button type="submit" className="h-10 gap-2" disabled={loading || !newName.trim()}>
              <Save className="h-4 w-4" /> Add
            </Button>
          </form>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No categories yet.</p>
          ) : (
            <ul className="space-y-2">
              {categories.map((c, idx) => (
                <li
                  key={`${c}-${idx}`}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/20 px-3 py-2"
                >
                  {renameIdx === idx ? (
                    <>
                      <Input value={renameVal} onChange={(e) => setRenameVal(e.target.value)} className="h-9 flex-1 min-w-[140px]" />
                      <Button type="button" size="sm" onClick={() => void saveRename()}>
                        Save
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setRenameIdx(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 font-medium text-foreground">{c}</span>
                      <div className="flex items-center gap-1">
                        <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => move(idx, -1)} aria-label="Move up">
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => move(idx, 1)} aria-label="Move down">
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setRenameIdx(idx);
                            setRenameVal(c);
                          }}
                        >
                          Rename
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteIdx(idx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </motion.div>

      <AlertDialog open={deleteIdx !== null} onOpenChange={(o) => !o && setDeleteIdx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              Tasks already using this category keep their label text; only the dropdown list changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
