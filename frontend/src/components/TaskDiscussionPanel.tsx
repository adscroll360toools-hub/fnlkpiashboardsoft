import { useEffect, useRef, useState, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, X, Send, Paperclip, Smile, Loader2, ChevronDown } from "lucide-react";
import { useTask, TaskMessage } from "@/context/TaskContext";
import { AppUser } from "@/context/AuthContext";
import { UserAvatar } from "@/components/UserAvatar";
import { toast } from "sonner";
import { uploadImageFile } from "@/lib/api";
import { publicAssetUrl } from "@/lib/assetUrl";

/** Hold duration (mouse or touch) before the reaction dock opens — tuned for touch without feeling sluggish. */
const LONG_PRESS_MS = 480;

const QUICK_EMOJIS = ["👍", "❤️", "😂", "✅", "🎉"];

const MORE_EMOJIS = [
  "😀",
  "😊",
  "🙏",
  "👏",
  "🔥",
  "💯",
  "⭐",
  "✨",
  "🎯",
  "📌",
  "💡",
  "🚀",
  "📎",
  "⏰",
  "🙌",
  "🤝",
  "😅",
  "🤔",
  "👀",
  "💪",
  "🎊",
  "📣",
  "⚡",
  "🛠️",
];

type Props = {
  taskId: string;
  messages: TaskMessage[];
  users: AppUser[];
  currentUser: AppUser | null;
  typing?: { userId: string | null; userName: string; updatedAt?: string | null };
  onClose: () => void;
};

function snippet(text: string, max = 56) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t || "Message";
  return `${t.slice(0, max)}…`;
}

export const TaskDiscussionPanel = memo(function TaskDiscussionPanel({
  taskId,
  messages,
  users,
  currentUser,
  typing,
  onClose,
}: Props) {
  const { addMessage, markTaskMessagesRead, setTaskChatTyping, toggleTaskMessageReaction, refreshTasks } = useTask();
  const [chatMsg, setChatMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  /** Message id the docked reaction bar applies to (null = closed). */
  const [reactionTargetId, setReactionTargetId] = useState<string | null>(null);
  const [reactionBarOpen, setReactionBarOpen] = useState(false);
  const [reactionMoreOpen, setReactionMoreOpen] = useState(false);
  const [pressingMessageId, setPressingMessageId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressActiveRef = useRef(true);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  useEffect(() => {
    if (!currentUser?.id) return;
    markTaskMessagesRead(taskId);
  }, [taskId, currentUser?.id, markTaskMessagesRead]);

  useEffect(() => {
    const id = window.setInterval(() => {
      refreshTasks();
    }, 3500);
    return () => window.clearInterval(id);
  }, [refreshTasks]);

  const clearLongPress = useCallback(() => {
    longPressActiveRef.current = false;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setPressingMessageId(null);
  }, []);

  const cancelLongPressListeners = useRef<(() => void) | null>(null);

  const beginLongPressForMessage = useCallback(
    (msgId: string) => {
      cancelLongPressListeners.current?.();
      cancelLongPressListeners.current = null;
      clearLongPress();
      longPressActiveRef.current = true;
      setPressingMessageId(msgId);

      const onEnd = () => {
        longPressActiveRef.current = false;
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        window.removeEventListener("pointerup", onEnd);
        window.removeEventListener("pointercancel", onEnd);
        setPressingMessageId((cur) => (cur === msgId ? null : cur));
        cancelLongPressListeners.current = null;
      };

      cancelLongPressListeners.current = onEnd;
      window.addEventListener("pointerup", onEnd);
      window.addEventListener("pointercancel", onEnd);

      longPressTimerRef.current = setTimeout(() => {
        if (!longPressActiveRef.current) return;
        window.removeEventListener("pointerup", onEnd);
        window.removeEventListener("pointercancel", onEnd);
        cancelLongPressListeners.current = null;
        longPressTimerRef.current = null;
        setPressingMessageId(null);
        setReactionTargetId(msgId);
        setReactionBarOpen(true);
        setReactionMoreOpen(false);
      }, LONG_PRESS_MS);
    },
    [clearLongPress]
  );

  useEffect(() => {
    return () => {
      cancelLongPressListeners.current?.();
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  const closeReactionDock = useCallback(() => {
    setReactionBarOpen(false);
    setReactionTargetId(null);
    setReactionMoreOpen(false);
    clearLongPress();
  }, [clearLongPress]);

  const applyReaction = useCallback(
    async (emoji: string) => {
      if (!reactionTargetId) return;
      await toggleTaskMessageReaction(taskId, reactionTargetId, emoji);
    },
    [reactionTargetId, taskId, toggleTaskMessageReaction]
  );

  const flushTyping = useCallback(() => {
    setTaskChatTyping(taskId, false);
  }, [setTaskChatTyping, taskId]);

  const handleTypingActivity = useCallback(() => {
    if (!currentUser) return;
    setTaskChatTyping(taskId, true);
    if (idleTypingTimer.current) clearTimeout(idleTypingTimer.current);
    idleTypingTimer.current = setTimeout(() => {
      flushTyping();
    }, 2500);
  }, [currentUser, flushTyping, setTaskChatTyping, taskId]);

  useEffect(() => {
    return () => {
      flushTyping();
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (idleTypingTimer.current) clearTimeout(idleTypingTimer.current);
    };
  }, [flushTyping, taskId]);

  const handleSend = async () => {
    const text = chatMsg.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const res = await addMessage(taskId, text);
      if (res.success) {
        setChatMsg("");
        flushTyping();
      } else toast.error(res.error);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const onAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Attach JPG, PNG, or WEBP under 5MB.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB.");
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadImageFile("task-chat", file);
      const res = await addMessage(taskId, file.name ? `📎 ${file.name}` : "Attachment", url);
      if (!res.success) toast.error(res.error);
      flushTyping();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const senderOf = (uid: string) => users.find((u) => u.id === uid);

  const typingLive =
    typing?.userId &&
    typing.userId !== currentUser?.id &&
    typing.updatedAt &&
    Date.now() - new Date(typing.updatedAt).getTime() < 8000;

  const targetMsg = reactionTargetId ? messages.find((m) => m.id === reactionTargetId) : null;
  const targetLabel = targetMsg
    ? (() => {
        const s = senderOf(targetMsg.senderId);
        return `${s?.name || targetMsg.senderName || "Someone"}: ${snippet(targetMsg.text)}`;
      })()
    : "";

  return (
    <div className="flex min-h-0 w-full flex-col border-t md:w-1/2 md:border-l md:border-t-0">
      <div className="flex items-center justify-between border-b bg-card/50 p-4">
        <h3 className="flex items-center gap-2 font-semibold">
          <MessageCircle className="h-4 w-4" /> Task Discussion
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close discussion"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto scroll-smooth bg-muted/5 p-4">
        {messages.length === 0 ? (
          <div className="mt-10 text-center text-sm text-muted-foreground">No messages yet. Say hello below.</div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser?.id;
            const sender = senderOf(msg.senderId);
            const name = sender?.name || msg.senderName || "Unknown";
            const ts = msg.timestamp ? new Date(msg.timestamp) : null;
            const readByOthers =
              (msg.readBy || []).filter((id) => id !== msg.senderId && id !== currentUser?.id).length > 0 ||
              (isMe && (msg.readBy || []).some((id) => id !== currentUser?.id));
            const isDockTarget = reactionBarOpen && reactionTargetId === msg.id;
            const isPressing = pressingMessageId === msg.id;

            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                <UserAvatar name={name} photoUrl={sender?.profilePhotoUrl} className="mt-0.5" />
                <div className={`max-w-[min(85%,420px)] min-w-0 ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span className={`font-semibold ${isMe ? "text-primary" : "text-foreground"}`}>{name}</span>
                    {ts ? (
                      <time dateTime={msg.timestamp} className="tabular-nums">
                        {ts.toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </time>
                    ) : null}
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    title={`Message — press & hold (${(LONG_PRESS_MS / 1000).toFixed(1)}s) to react`}
                    aria-label="Press and hold to open reactions"
                    className={`touch-manipulation select-none rounded-2xl px-3 py-2 text-sm shadow-sm transition-[box-shadow,transform] ${
                      isMe ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm bg-card text-foreground ring-1 ring-border"
                    } ${isDockTarget ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""} ${
                      isPressing ? "scale-[0.98] opacity-95" : ""
                    }`}
                    onPointerDown={(e) => {
                      if (e.pointerType === "mouse" && e.button !== 0) return;
                      longPressActiveRef.current = true;
                      beginLongPressForMessage(msg.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setReactionTargetId(msg.id);
                        setReactionBarOpen(true);
                        setReactionMoreOpen(false);
                      }
                    }}
                  >
                    {msg.fileUrl ? (
                      <a
                        href={publicAssetUrl(msg.fileUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className={`mb-1 block text-xs underline ${isMe ? "text-primary-foreground/90" : "text-primary"}`}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        View attachment
                      </a>
                    ) : null}
                    <div className="whitespace-pre-wrap break-words select-text">{msg.text}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 px-0.5">
                    {(msg.reactions || []).map((r) => (
                      <button
                        key={r.emoji}
                        type="button"
                        className="rounded-full bg-muted/80 px-2 py-0.5 text-[11px] hover:bg-muted"
                        onClick={() => void toggleTaskMessageReaction(taskId, msg.id, r.emoji)}
                      >
                        {r.emoji} {r.userIds?.length ?? 0}
                      </button>
                    ))}
                  </div>
                  {isMe && readByOthers ? (
                    <span className="text-[10px] text-muted-foreground">Seen</span>
                  ) : !isMe && (msg.readBy || []).includes(currentUser?.id || "") ? (
                    <span className="text-[10px] text-muted-foreground">Read</span>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
        {typingLive ? (
          <div className="text-xs italic text-muted-foreground">{typing?.userName || "Someone"} is typing…</div>
        ) : null}
      </div>

      {/* Single reaction dock: appears under message list, above composer */}
      {reactionBarOpen && reactionTargetId && targetMsg ? (
        <div
          className="border-t border-primary/20 bg-primary/[0.06] px-3 py-2.5 shadow-[inset_0_1px_0_0_hsl(var(--primary)/0.12)]"
          role="region"
          aria-label="Message reactions"
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Reacting to</p>
              <p className="truncate text-xs text-foreground">{targetLabel}</p>
            </div>
            <button
              type="button"
              onClick={closeReactionDock}
              className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-background/80 hover:text-foreground"
              aria-label="Close reactions"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {QUICK_EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                className="rounded-lg border border-transparent bg-background/90 px-2.5 py-1.5 text-lg leading-none shadow-sm transition hover:border-primary/30 hover:bg-background"
                onClick={() => void applyReaction(em)}
              >
                {em}
              </button>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1 border-dashed text-xs"
              onClick={() => setReactionMoreOpen((v) => !v)}
            >
              More
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${reactionMoreOpen ? "rotate-180" : ""}`} />
            </Button>
          </div>
          {reactionMoreOpen ? (
            <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border bg-background/95 p-2 shadow-inner">
              <p className="mb-1.5 px-0.5 text-[10px] font-medium text-muted-foreground">Pick an emoji</p>
              <div className="grid grid-cols-7 gap-1 sm:grid-cols-8">
                {MORE_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    className="flex aspect-square items-center justify-center rounded-md text-lg hover:bg-muted active:scale-95"
                    onClick={() => void applyReaction(em)}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="border-t bg-card p-3">
        <div className="flex gap-2">
          <textarea
            value={chatMsg}
            onChange={(e) => {
              setChatMsg(e.target.value);
              handleTypingActivity();
            }}
            onKeyDown={onKeyDown}
            placeholder="Message… (Shift+Enter for new line)"
            rows={2}
            className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={sending}
          />
          <div className="flex shrink-0 flex-col gap-2">
            <Button
              type="button"
              size="icon"
              className="h-10 w-10 rounded-xl"
              onClick={() => void handleSend()}
              disabled={sending || !chatMsg.trim()}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
            <label className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-input bg-background hover:bg-muted">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void onAttach(e)} disabled={uploading} />
            </label>
          </div>
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Smile className="h-3 w-3 shrink-0" />
            Hold a message ~{LONG_PRESS_MS / 1000}s to react · Or focus a bubble and press Enter
          </span>
          <span className="text-muted-foreground/70">·</span>
          <span>Enter to send · Shift+Enter newline</span>
        </p>
      </div>
    </div>
  );
});
