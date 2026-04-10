import { useState, useRef, useEffect, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Clock, CheckCircle2, AlertCircle, Eye,
  Trash2, X, ChevronDown, User, MessageCircle, Link as LinkIcon, FileText, Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { stagger, fadeUp } from "@/lib/animations";
import { useTask, AppTask, TaskStatus, TaskKind } from "@/context/TaskContext";
import { useAuth } from "@/context/AuthContext";
import { getEffectivePermissions } from "@/lib/permissions";
import { isTaskOverdue, endOfToday } from "@/lib/taskHelpers";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { toast } from "sonner";

const CATEGORIES = ["Social Media", "Video SEO", "Thumbnail Design", "Shorts Editing", "Admin Support", "Marketing", "Strategy"];
const STATUSES: TaskStatus[] = ["Pending", "In Progress", "Completed", "Approved"];

const statusConfig = {
  "Pending": { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock },
  "In Progress": { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: AlertCircle },
  "Completed": { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
  "Approved": { color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", icon: CheckCircle2 },
};

type FilterTab = "All" | TaskStatus;

// --- Sub-component: ChatBox (Isolated for performance) ---
const ChatBox = memo(({ taskId, messages, currentUser }: { taskId: string, messages: any[], currentUser: any }) => {
    const { addMessage } = useTask();
    const [chatMsg, setChatMsg] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages.length]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatMsg.trim()) return;
        const res = await addMessage(taskId, chatMsg);
        if (res.success) setChatMsg("");
        else toast.error(res.error);
    };

    return (
      <div className="w-full md:w-1/2 flex flex-col h-[500px] md:h-auto border-t md:border-t-0">
          <div className="p-4 border-b flex justify-between items-center bg-card/50">
              <h3 className="font-semibold flex items-center gap-2"><MessageCircle className="h-4 w-4"/> Task Discussion</h3>
          </div>
          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3 bg-muted/5 scroll-smooth">
              {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm mt-10">No messages yet. Send a message to start discussion.</div>
              ) : (
                  messages.map(msg => {
                      const isMe = msg.senderId === currentUser?.id;
                      return (
                          <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              <div className={`px-3 py-2 rounded-xl text-sm max-w-[85%] ${isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                  {msg.text}
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-1 mx-1">
                                  {!isMe && <span className="font-semibold">{msg.senderName} • </span>}
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                          </div>
                      )
                  })
              )}
          </div>
          <form onSubmit={handleSend} className="p-3 border-t bg-card flex gap-2">
              <Input value={chatMsg} onChange={e=>setChatMsg(e.target.value)} placeholder="Type a message..." className="flex-1 h-9 rounded-full px-4" />
              <Button type="submit" size="icon" className="h-9 w-9 rounded-full shrink-0"><Send className="h-4 w-4"/></Button>
          </form>
      </div>
    );
});

// --- Sub-component: ProofSection (Isolated for performance) ---
const ProofSection = memo(({ task, currentUser }: { task: AppTask, currentUser: any }) => {
    const { submitTaskProof } = useTask();
    const [proofText, setProofText] = useState("");
    const [proofUrl, setProofUrl] = useState("");

    const handleProofSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await submitTaskProof(task.id, { textExplanation: proofText, urlLink: proofUrl });
        if (res.success) {
            toast.success("Proof submitted!");
            setProofText(""); setProofUrl("");
        } else toast.error(res.error);
    };

    return (
        <div className="mt-8">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-3"><FileText className="h-4 w-4 text-primary"/> Submission Proof</h3>
            {task.submission ? (
                <div className="p-4 bg-muted/30 border rounded-lg space-y-2 text-sm">
                    {task.submission.textExplanation && <p><strong>Note:</strong> {task.submission.textExplanation}</p>}
                    {task.submission.urlLink && <a href={task.submission.urlLink} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline flex items-center gap-1"><LinkIcon className="h-3 w-3"/> Link Attachment</a>}
                    <p className="text-xs text-muted-foreground mt-2">Submitted at {new Date(task.submission.submittedAt).toLocaleString()}</p>
                </div>
            ) : (
                <div className="p-4 bg-muted/30 border border-dashed rounded-lg text-sm text-center text-muted-foreground">
                    {currentUser?.role === "employee" ? "Submit your proof of work below." : "No proof submitted yet."}
                </div>
            )}

            {currentUser?.role === "employee" && !task.submission && (
                <form onSubmit={handleProofSubmit} className="mt-4 space-y-3">
                    <textarea value={proofText} onChange={e => setProofText(e.target.value)}
                        className="w-full text-sm p-3 border rounded-lg bg-background" rows={2} placeholder="Explain what you did..."></textarea>
                    <Input value={proofUrl} onChange={e => setProofUrl(e.target.value)} type="url" placeholder="Paste URL link to work" className="h-9 text-sm" />
                    <Button type="submit" className="w-full">Submit Work for Review</Button>
                </form>
            )}
        </div>
    );
});

export default function TasksPage() {
  const { currentUser, users, companyRoles } = useAuth();
  const { tasks, createTask, updateTaskStatus } = useTask();
  const perms = getEffectivePermissions(currentUser, companyRoles);
  const assignees = users.filter((u) => u.role !== "admin");

  const [activeFilter, setActiveFilter] = useState<FilterTab>("All");
  const [showModal, setShowModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [openStatusMenu, setOpenStatusMenu] = useState<string | null>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  const selectedTask = useMemo(() => selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null, [selectedTaskId, tasks]);

  const [form, setForm] = useState({
    title: "",
    category: CATEGORIES[0],
    assignedToId: "",
    status: "Pending" as TaskStatus,
    time: "",
    notes: "",
    taskKind: "one_time" as TaskKind,
    deadlineLocal: "",
  });

  useOutsideClick(statusMenuRef, () => setOpenStatusMenu(null));

  const filtered = (activeFilter === "All" ? tasks : tasks.filter((t) => t.status === activeFilter))
      .filter(t => currentUser?.role === "employee" ? t.assigneeId === currentUser.id : true);

  const handleOpen = () => {
    setForm({
      title: "",
      category: CATEGORIES[0],
      assignedToId: assignees[0]?.id || "",
      status: "Pending",
      time: "",
      notes: "",
      taskKind: "one_time",
      deadlineLocal: "",
    });
    setShowModal(true);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Task title is required.");
    let deadlineAt: string | null = null;
    let deadline = "Flexible";
    const kind = form.taskKind;

    if (kind === "daily") {
      const d = form.deadlineLocal ? new Date(form.deadlineLocal) : endOfToday();
      deadlineAt = d.toISOString();
      deadline = d.toLocaleString();
    } else if (kind === "deadline_based") {
      if (!form.deadlineLocal) return toast.error("Pick a deadline date and time.");
      const d = new Date(form.deadlineLocal);
      deadlineAt = d.toISOString();
      deadline = d.toLocaleString();
    } else {
      if (form.deadlineLocal) {
        const d = new Date(form.deadlineLocal);
        deadlineAt = d.toISOString();
        deadline = d.toLocaleString();
      }
    }

    const res = await createTask({
        title: form.title.trim(),
        category: form.category,
        assigneeId: form.assignedToId || (currentUser?.role === "employee" ? currentUser.id : ""),
        assigneeName: users.find(u => u.id === form.assignedToId)?.name || (currentUser?.role === "employee" ? currentUser.name : "Unassigned"),
        assignedById: currentUser!.id,
        assignedByName: currentUser!.name,
        type: "Individual",
        taskKind: kind,
        deadlineAt,
        status: form.status,
        deadline,
        timeSpent: "0m",
        notes: form.notes
    });
    if (res.success) { setShowModal(false); toast.success("Task created!"); }
    else toast.error(res.error);
  };

  const handleStatusChange = async (taskId: string, s: TaskStatus) => {
    await updateTaskStatus(taskId, s);
    setOpenStatusMenu(null);
  };

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={fadeUp} className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Task Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">Coordinate, track and discuss production tasks</p>
          </div>
          {perms.tasks_create && (
            <Button className="h-10 gap-2 rounded-lg" onClick={handleOpen}><Plus className="h-4 w-4" /> Create Task</Button>
          )}
        </motion.div>

        <motion.div variants={fadeUp} className="flex gap-2 border-b">
          {(["All", ...STATUSES] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveFilter(tab)}
              className={`pb-2.5 px-4 text-sm font-medium transition-all relative ${activeFilter === tab ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              {tab} {activeFilter === tab && <motion.div layoutId="filter-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>
          ))}
        </motion.div>

        <motion.div variants={fadeUp} className="rounded-2xl bg-card shadow-card overflow-visible">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground rounded-tl-2xl">Task Details</th>
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Assignee</th>
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Deadline</th>
                <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground rounded-tr-2xl">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => (
                <motion.tr key={task.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className={`border-b last:border-0 transition-colors hover:bg-muted/50 group cursor-pointer ${isTaskOverdue(task) ? "bg-rose-50/80 dark:bg-rose-950/20" : ""}`}
                    onClick={() => setSelectedTaskId(task.id)}>
                    <td className="px-5 py-3">
                        <p className="text-sm font-medium text-foreground">{task.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground truncate max-w-xs">{task.category}</p>
                    </td>
                    <td className="px-5 py-3 capitalize text-sm text-foreground font-medium">{task.assigneeName}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground font-medium">{task.deadline}</td>
                    <td className="px-5 py-3 text-right">
                        <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => setOpenStatusMenu(openStatusMenu === task.id ? null : task.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${statusConfig[task.status].color} border-transparent hover:border-current/20`}>
                            {task.status} <ChevronDown className="h-3 w-3" />
                            </button>
                            {openStatusMenu === task.id && (
                                <div ref={statusMenuRef} className="absolute right-0 top-7 z-[200] w-36 rounded-xl border bg-card shadow-2xl overflow-hidden py-1">
                                {STATUSES.filter(s => currentUser?.role !== "employee" || s !== "Approved").map((s) => (
                                    <button key={s} onClick={() => handleStatusChange(task.id, s)}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-muted text-foreground">
                                    <span className={`h-2 w-2 rounded-full ${statusConfig[s].color.split(" ")[0]}`} /> {s}
                                    </button>
                                ))}
                                </div>
                            )}
                        </div>
                    </td>
                </motion.tr>
              ))}
              {filtered.length === 0 && (
                <tr className="border-none">
                    <td colSpan={4} className="px-6 py-20 text-center text-muted-foreground italic text-sm">No tasks found in this category.</td>
                </tr>
              )}
            </tbody>
          </table>
        </motion.div>
      </motion.div>

      {/* Creation Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed inset-0 z-[101] flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl border">
                <div className="px-6 py-4 border-b flex justify-between items-center"><h2 className="font-bold">Create New Task</h2><button onClick={() => setShowModal(false)}><X className="h-5 w-5"/></button></div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1.5 font-medium"><Label>Task Title</Label><Input value={form.title} onChange={e=>setForm({...form, title: e.target.value})} placeholder="e.g. Design YouTube Thumbnail" /></div>
                    <div className="space-y-1.5"><Label>Task type</Label>
                      <select value={form.taskKind} onChange={e=>setForm({...form, taskKind: e.target.value as TaskKind})} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                        <option value="daily">Daily task</option>
                        <option value="one_time">One-time task</option>
                        <option value="deadline_based">Deadline-based task</option>
                      </select>
                    </div>
                    {(form.taskKind === "deadline_based" || form.taskKind === "daily" || form.taskKind === "one_time") && (
                      <div className="space-y-1.5">
                        <Label>{form.taskKind === "daily" ? "Due by (defaults to end of today if empty)" : "Deadline (date & time)"}</Label>
                        <Input type="datetime-local" value={form.deadlineLocal} onChange={e=>setForm({...form, deadlineLocal: e.target.value})} />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5"><Label>Category</Label><select value={form.category} onChange={e=>setForm({...form, category: e.target.value})} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                        <div className="space-y-1.5"><Label>Assign To</Label><select value={form.assignedToId} onChange={e=>setForm({...form, assignedToId: e.target.value})} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Select Employee...</option>{assignees.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                    </div>
                    <Button type="submit" className="w-full h-10">Create Task & Send Notify</Button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Task Detail Modal */}
      <AnimatePresence>
        {selectedTask && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
              <div className="w-full max-w-3xl bg-card rounded-2xl border shadow-2xl my-8 relative flex flex-col md:flex-row min-h-[500px] overflow-hidden">
                  <div className="w-full md:w-1/2 p-6 bg-muted/10">
                      <div className="flex justify-between items-start mb-4">
                          <h2 className="text-xl font-bold pr-4">{selectedTask.title}</h2>
                          <button onClick={() => setSelectedTaskId(null)} className="md:hidden"><X className="h-5 w-5" /></button>
                      </div>
                      <div className="space-y-4 text-sm font-medium">
                          <div><span className="text-muted-foreground mr-2">Status:</span> <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${statusConfig[selectedTask.status].color}`}>{selectedTask.status}</span></div>
                          <div><span className="text-muted-foreground mr-2">Type:</span> {selectedTask.taskKind === "daily" ? "Daily" : selectedTask.taskKind === "deadline_based" ? "Deadline-based" : "One-time"}</div>
                          <div><span className="text-muted-foreground mr-2">Category:</span> {selectedTask.category}</div>
                          <div><span className="text-muted-foreground mr-2">Deadline:</span> {selectedTask.deadline}</div>
                          <div className="pt-4 border-t"><span className="block text-muted-foreground mb-1">Internal Notes:</span> <p className="text-xs italic text-muted-foreground">{selectedTask.notes || "No additional notes."}</p></div>
                      </div>
                      <ProofSection task={selectedTask} currentUser={currentUser} />
                  </div>
                  <ChatBox taskId={selectedTask.id} messages={selectedTask.messages} currentUser={currentUser} />
                  <button onClick={() => setSelectedTaskId(null)} className="absolute top-4 right-4 hidden md:block text-muted-foreground hover:text-foreground"><X className="h-5 w-5"/></button>
              </div>
            </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
