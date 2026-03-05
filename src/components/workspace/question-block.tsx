"use client";

import { useState, useCallback } from "react";
import { QuestionBlock as QuestionBlockType, Role } from "@/lib/types";
import { StreamingText } from "@/components/streaming-text";
import { MentionTextarea, extractMentions } from "./mention-textarea";
import { MentionText } from "./mention-text";
import { motion, AnimatePresence } from "framer-motion";
import { AndyFace } from "@/components/andy-face";

interface QuestionBlockProps {
  block: QuestionBlockType;
  proposalId: string;
  currentRole: Role;
  onUpdate: () => void | Promise<void>;
  onBeforeMutate?: () => void;
  token: string;
  readOnly?: boolean;
}

const ROLE_THEME: Record<string, { gradient: string; border: string; text: string }> = {
  Product: {
    gradient: "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0.025) 50%, transparent 100%)",
    border: "1px solid rgba(59,130,246,0.13)",
    text: "text-blue-500/80",
  },
  Engineering: {
    gradient: "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(139,92,246,0.025) 50%, transparent 100%)",
    border: "1px solid rgba(139,92,246,0.13)",
    text: "text-violet-500/80",
  },
  Design: {
    gradient: "linear-gradient(135deg, rgba(236,72,153,0.08) 0%, rgba(236,72,153,0.025) 50%, transparent 100%)",
    border: "1px solid rgba(236,72,153,0.13)",
    text: "text-pink-500/80",
  },
  Data: {
    gradient: "linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(6,182,212,0.025) 50%, transparent 100%)",
    border: "1px solid rgba(6,182,212,0.13)",
    text: "text-cyan-500/80",
  },
  Legal: {
    gradient: "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.025) 50%, transparent 100%)",
    border: "1px solid rgba(245,158,11,0.13)",
    text: "text-amber-500/80",
  },
  Support: {
    gradient: "linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(249,115,22,0.025) 50%, transparent 100%)",
    border: "1px solid rgba(249,115,22,0.13)",
    text: "text-orange-500/80",
  },
};

const DEFAULT_THEME = {
  gradient: "linear-gradient(135deg, rgba(0,0,0,0.035) 0%, transparent 60%)",
  border: "1px solid rgba(0,0,0,0.06)",
  text: "text-muted-foreground",
};

export function QuestionBlock({
  block,
  proposalId,
  currentRole,
  onUpdate,
  onBeforeMutate,
  token,
  readOnly,
}: QuestionBlockProps) {
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [optimisticAnswer, setOptimisticAnswer] = useState<string | null>(null);
  const [assignedRoles, setAssignedRoles] = useState<Set<Role>>(new Set());
  const isAnswered = block.status === "answered" || optimisticAnswer !== null;
  const mentions = extractMentions(answer);

  const handleSubmit = useCallback(
    async (overrideRole?: Role) => {
      if (!answer.trim()) return;
      const assignTarget = overrideRole || (assignedRoles.size > 0 ? [...assignedRoles][0] : undefined);
      const textToSend =
        assignTarget && !overrideRole
          ? `for ${assignTarget}: ${answer}`
          : answer;

      const submittedAnswer = answer;
      setOptimisticAnswer(submittedAnswer);
      setAnswer("");
      setAssignedRoles(new Set());
      setSubmitting(true);
      onBeforeMutate?.();

      try {
        await fetch(
          `/api/proposals/${proposalId}/questions/${block.id}?t=${token}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: textToSend,
              actingRole: overrideRole || currentRole,
            }),
          }
        );
        await onUpdate();
      } catch {
        setOptimisticAnswer(null);
        setAnswer(submittedAnswer);
      } finally {
        setSubmitting(false);
      }
    },
    [answer, assignedRoles, block.id, currentRole, onBeforeMutate, onUpdate, proposalId, token]
  );

  if (isAnswered) {
    return <AnsweredCollapse block={block} optimisticAnswer={optimisticAnswer} submitting={submitting} />;
  }

  const effectiveRole = block.assignedRole || block.suggestedRole;
  const theme = ROLE_THEME[effectiveRole] || DEFAULT_THEME;

  return (
    <div
      className={`my-2 rounded-2xl px-4 pb-4 pt-3.5 ${readOnly ? "opacity-50" : ""}`}
      style={{ background: theme.gradient, border: theme.border }}
    >
      <div className="mb-3 flex items-center gap-1.5">
        <AndyFace size={36} />
        <span className="text-[12px] font-medium text-foreground">Andy asks</span>
        <span className={`text-[12px] font-medium ${theme.text}`}>{effectiveRole}</span>
        {block.refractedFrom && block.assignedRole && (
          <RefractedLabel
            refractedFrom={block.refractedFrom}
            assignedRole={block.assignedRole}
            currentRole={currentRole}
          />
        )}
      </div>

      <StreamingText
        text={block.prompt}
        className="text-[14px] leading-relaxed text-foreground/80"
        speed={15}
      />

      {readOnly ? null : (
        <>
          <div className="mt-3.5 flex items-center gap-2 rounded-full border border-border/25 bg-background/70 pl-4 pr-1.5 py-1.5">
            <MentionTextarea
              value={answer}
              onChange={setAnswer}
              onSubmit={() => handleSubmit()}
              excludeRole={currentRole}
              placeholder="Your answer or @ someone to assign"
              className="min-h-[28px] w-full resize-none border-none bg-transparent px-0 py-0 text-[13px] leading-[28px] shadow-none outline-none placeholder:text-muted-foreground/40 focus:ring-0 focus:outline-none"
              disabled={submitting}
              rows={1}
            />
            <button
              onClick={() => handleSubmit()}
              disabled={!answer.trim() || submitting}
              className="shrink-0 rounded-full bg-foreground px-3.5 py-1.5 text-[11px] font-medium text-background transition-opacity disabled:opacity-20"
            >
              Submit
            </button>
          </div>

          {mentions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5 px-1">
              {mentions.map((role) => {
                const roleTheme = ROLE_THEME[role];
                const checked = assignedRoles.has(role);
                return (
                  <label
                    key={role}
                    className={`flex cursor-pointer select-none items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                      checked
                        ? `${roleTheme?.text || "text-foreground"} font-medium`
                        : "text-muted-foreground hover:text-foreground/60"
                    }`}
                    style={{
                      border: checked
                        ? roleTheme?.border || "1px solid rgba(0,0,0,0.1)"
                        : "1px solid rgba(0,0,0,0.06)",
                      background: checked
                        ? roleTheme?.gradient || "transparent"
                        : "transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const next = new Set(assignedRoles);
                        if (next.has(role)) next.delete(role);
                        else next.add(role);
                        setAssignedRoles(next);
                      }}
                      className="sr-only"
                    />
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
                      {checked ? (
                        <polyline points="20 6 9 17 4 12" />
                      ) : (
                        <circle cx="12" cy="12" r="9" strokeWidth="2" />
                      )}
                    </svg>
                    Assign to {role}
                  </label>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AnsweredCollapse({
  block,
  optimisticAnswer,
  submitting,
}: {
  block: QuestionBlockType;
  optimisticAnswer: string | null;
  submitting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const role = block.assignedRole || block.suggestedRole;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="my-1.5 cursor-pointer select-none overflow-hidden rounded-2xl"
      style={{
        background: "linear-gradient(135deg, rgba(16,185,129,0.06), rgba(16,185,129,0.015) 50%, transparent)",
        border: "1px solid rgba(16,185,129,0.1)",
      }}
      onClick={() => setExpanded((e) => !e)}
    >
      <div className="group flex items-center gap-2.5 px-4 py-2.5">
        <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <span className="flex-1 truncate text-[12.5px] text-foreground/40 transition-colors group-hover:text-foreground/55">
          Andy asked · <span className="font-medium">{role}</span> answered
        </span>
        <motion.svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-muted-foreground/30"
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <polyline points="6 9 12 15 18 9" />
        </motion.svg>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="border-t border-emerald-500/10 px-4 py-3">
              <p className="text-[13px] leading-relaxed text-foreground/45">{block.prompt}</p>
              <MentionText
                text={optimisticAnswer || block.answer || ""}
                className="mt-2 block text-[13.5px] text-foreground/70"
              />
              {submitting && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2.5 flex items-center gap-2 text-[11px] text-muted-foreground/50"
                >
                  <span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
                  Updating section…
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function RefractedLabel({
  refractedFrom,
  assignedRole,
  currentRole,
}: {
  refractedFrom: Role;
  assignedRole: Role;
  currentRole: Role;
}) {
  const fromColor = ROLE_THEME[refractedFrom]?.text || DEFAULT_THEME.text;
  const toColor = ROLE_THEME[assignedRole]?.text || DEFAULT_THEME.text;

  if (currentRole === refractedFrom) {
    return (
      <span className="text-[10px] text-muted-foreground/40">
        → <span className={`font-medium ${toColor}`}>{assignedRole}</span>
      </span>
    );
  }

  if (currentRole === assignedRole) {
    return (
      <span className="text-[10px] text-muted-foreground/40">
        from <span className={`font-medium ${fromColor}`}>{refractedFrom}</span>
      </span>
    );
  }

  return (
    <span className="text-[10px] text-muted-foreground/40">
      <span className={`font-medium ${fromColor}`}>{refractedFrom}</span>
      {" → "}
      <span className={`font-medium ${toColor}`}>{assignedRole}</span>
    </span>
  );
}
