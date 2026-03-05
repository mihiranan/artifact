"use client";

import { useState } from "react";
import { Thread, Role } from "@/lib/types";
import { ROLE_STYLE } from "@/lib/roles";
import { MentionTextarea } from "./mention-textarea";
import { MentionText } from "./mention-text";
import { motion, AnimatePresence } from "framer-motion";

function RoleAvatar({
  role,
  size = "sm",
}: {
  role: string;
  size?: "sm" | "xs";
}) {
  const bg = ROLE_STYLE[role as Role]?.popoverBg || "bg-muted-foreground";
  const dim =
    size === "sm" ? "h-6 w-6 text-[10px]" : "h-5 w-5 text-[9px]";
  return (
    <div
      className={`${dim} ${bg} flex shrink-0 items-center justify-center rounded-full font-semibold text-white`}
    >
      {role[0]}
    </div>
  );
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function SendButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7 }}
      transition={{ duration: 0.1 }}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className="mr-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-30"
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m18 15-6-6-6 6" />
      </svg>
    </motion.button>
  );
}

interface ThreadPopoverProps {
  threads: Thread[];
  proposalId: string;
  currentRole: Role;
  onUpdate: () => void;
  token: string;
  onCreateThread: (body: string) => void;
  creating: boolean;
}

export function ThreadPopover({
  threads,
  proposalId,
  currentRole,
  onUpdate,
  token,
  onCreateThread,
  creating,
}: ThreadPopoverProps) {
  const [newMessage, setNewMessage] = useState("");
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  async function handleReply(threadId: string) {
    const body = replyTexts[threadId];
    if (!body?.trim()) return;
    setSubmitting(threadId);
    try {
      await fetch(`/api/threads/${threadId}/messages?t=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: "human", body }),
      });
      setReplyTexts((prev) => ({ ...prev, [threadId]: "" }));
      onUpdate();
    } finally {
      setSubmitting(null);
    }
  }

  async function handleResolve(threadId: string) {
    await fetch(`/api/threads/${threadId}/resolve?t=${token}`, {
      method: "POST",
    });
    onUpdate();
  }

  async function handleAccept(threadId: string) {
    await fetch(`/api/threads/${threadId}/accept?t=${token}`, {
      method: "POST",
    });
    onUpdate();
  }


  function submitNew() {
    if (!newMessage.trim() || creating) return;
    onCreateThread(newMessage);
    setNewMessage("");
  }

  if (threads.length === 0) {
    return (
      <div className="p-3">
        <div className="flex items-start gap-2.5">
          <RoleAvatar role={currentRole} />
          <div className="min-w-0 flex-1">
            <div className="overflow-hidden rounded-lg bg-muted/40 transition-colors focus-within:bg-muted/60 focus-within:ring-1 focus-within:ring-border/50">
              <MentionTextarea
                value={newMessage}
                onChange={setNewMessage}
                placeholder="Leave a comment…"
                className="w-full resize-none border-0 bg-transparent px-3 py-2 text-[13px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/40"
                disabled={creating}
                onSubmit={submitNew}
                rows={2}
              />
              <AnimatePresence>
                {newMessage.trim() && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.12 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center justify-between border-t border-border/30 px-3 py-1.5">
                      <span className="text-[10px] text-muted-foreground/40">
                        @ to mention a role
                      </span>
                      <button
                        disabled={creating}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={submitNew}
                        className="rounded-full bg-foreground px-2.5 py-0.5 text-[11px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-30"
                      >
                        Comment
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-h-[420px] overflow-y-auto hide-scrollbar">
      <div className="divide-y divide-border/40">
        {threads.map((thread) => (
          <div key={thread.id} className="px-3 py-3">
            <div className="mb-1.5 flex items-center gap-2">
              <RoleAvatar role={thread.role} size="xs" />
              <span className="text-[12px] font-medium text-foreground/80">
                {thread.role}
              </span>
              {thread.isSuggested && (
                <span className="rounded-full bg-violet-500/10 px-1.5 py-px text-[9px] font-medium text-violet-500">
                  Suggestion
                </span>
              )}
              <div className="flex-1" />
              <span className="text-[10px] text-muted-foreground/35">
                {relativeTime(thread.createdAt)}
              </span>
              <div
                className={`h-1.5 w-1.5 rounded-full ${
                  thread.status === "resolved"
                    ? "bg-emerald-400"
                    : "bg-blue-400"
                }`}
              />
            </div>

            <div className="ml-7 space-y-2">
              {thread.messages.map((msg, i) => (
                <div key={msg.id}>
                  {i > 0 && (
                    <div className="mb-0.5 flex items-center gap-1.5">
                      <span className="text-[10px] font-medium text-foreground/50">
                        {msg.author === "prism" ? "Artifact" : currentRole}
                      </span>
                      <span className="text-[9px] text-muted-foreground/30">
                        {relativeTime(msg.createdAt)}
                      </span>
                    </div>
                  )}
                  <MentionText
                    text={msg.body}
                    className={`block text-[13px] leading-relaxed ${
                      msg.author === "prism"
                        ? "text-foreground/55 italic"
                        : "text-foreground/75"
                    }`}
                  />
                </div>
              ))}

              <div className="flex items-center gap-1 pt-0.5">
                {thread.isSuggested ? (
                  <>
                    <button
                      onClick={() => handleAccept(thread.id)}
                      className="rounded-md bg-foreground/[0.04] px-2 py-0.5 text-[10px] font-medium text-foreground/60 transition-colors hover:bg-foreground/[0.08] hover:text-foreground"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleResolve(thread.id)}
                      className="px-1.5 py-0.5 text-[10px] text-muted-foreground/40 transition-colors hover:text-foreground/60"
                    >
                      Dismiss
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleResolve(thread.id)}
                    className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground/40 transition-colors hover:bg-muted/60 hover:text-foreground/60"
                  >
                    {thread.status === "resolved" ? (
                      <>
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="1 4 1 10 7 10" />
                          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                        </svg>
                        Reopen
                      </>
                    ) : (
                      <>
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        Resolve
                      </>
                    )}
                  </button>
                )}
              </div>

              {thread.status !== "resolved" && (
                <div className="flex items-center gap-1.5 rounded-lg bg-muted/30 pr-1 transition-colors focus-within:bg-muted/50 focus-within:ring-1 focus-within:ring-border/40">
                  <MentionTextarea
                    value={replyTexts[thread.id] || ""}
                    onChange={(val) =>
                      setReplyTexts((prev) => ({
                        ...prev,
                        [thread.id]: val,
                      }))
                    }
                    placeholder="Reply…"
                    className="flex-1 resize-none border-0 bg-transparent px-2.5 py-1.5 text-[12px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/35"
                    disabled={submitting === thread.id}
                    onSubmit={() => handleReply(thread.id)}
                    rows={1}
                  />
                  <AnimatePresence>
                    {replyTexts[thread.id]?.trim() && (
                      <SendButton
                        onClick={() => handleReply(thread.id)}
                        disabled={submitting === thread.id}
                      />
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border/40 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <RoleAvatar role={currentRole} size="xs" />
          <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg bg-muted/30 pr-1 transition-colors focus-within:bg-muted/50 focus-within:ring-1 focus-within:ring-border/40">
            <MentionTextarea
              value={newMessage}
              onChange={setNewMessage}
              placeholder="New thread…"
              className="flex-1 resize-none border-0 bg-transparent px-2.5 py-1.5 text-[12px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/35"
              disabled={creating}
              onSubmit={submitNew}
              rows={1}
            />
            <AnimatePresence>
              {newMessage.trim() && (
                <SendButton onClick={submitNew} disabled={creating} />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
