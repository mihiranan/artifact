"use client";

import { ContentBlock as ContentBlockType } from "@/lib/types";
import { StreamingText } from "@/components/streaming-text";
import { FormattedText } from "@/components/formatted-text";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TickingLogo } from "@/components/ticking-logo";

interface ContentBlockProps {
  block: ContentBlockType;
  proposalId?: string;
  token?: string;
  onUpdate?: () => void;
  onEditResult?: (approved: boolean, reason: string) => void;
}

type EditState =
  | { stage: "idle" }
  | { stage: "editing"; original: string; start: number; end: number }
  | { stage: "reviewing"; original: string; start: number; end: number };

export function ContentBlock({ block, proposalId, token, onUpdate, onEditResult }: ContentBlockProps) {
  const [edit, setEdit] = useState<EditState>({ stage: "idle" });
  const [editedText, setEditedText] = useState("");
  const textRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const hasAnimated = useRef(false);

  const canEdit = !!proposalId && !!token;
  const isEditing = edit.stage !== "idle";

  useEffect(() => {
    if (!hasAnimated.current) hasAnimated.current = true;
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!canEdit || isEditing) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !textRef.current) {
      setToolbarPos(null);
      setSelectedText("");
      return;
    }

    if (!textRef.current.contains(sel.anchorNode) || !textRef.current.contains(sel.focusNode)) {
      return;
    }

    const text = sel.toString().trim();
    if (!text) {
      setToolbarPos(null);
      setSelectedText("");
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = textRef.current.getBoundingClientRect();

    setToolbarPos({
      top: rect.top - containerRect.top - 36,
      left: rect.left - containerRect.left + rect.width / 2,
    });
    setSelectedText(text);
  }, [canEdit, isEditing]);

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseUp]);

  useEffect(() => {
    if (edit.stage === "editing" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [edit.stage]);

  function startEditing() {
    if (!selectedText) return;
    const start = block.text.indexOf(selectedText);
    if (start === -1) return;
    setEdit({ stage: "editing", original: selectedText, start, end: start + selectedText.length });
    setEditedText(selectedText);
    setToolbarPos(null);
    window.getSelection()?.removeAllRanges();
  }

  async function submitEdit() {
    if (edit.stage !== "editing" || !editedText.trim() || editedText === edit.original) return;
    const { original, start, end } = edit;
    setEdit({ stage: "reviewing", original, start, end });

    try {
      const res = await fetch(`/api/proposals/${proposalId}/edit-review?t=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blockId: block.id,
          originalText: original,
          editedText: editedText.trim(),
        }),
      });
      const data = await res.json();
      onEditResult?.(data.approved, data.reason);
      setEdit({ stage: "idle" });
      setEditedText("");
      if (data.approved && onUpdate) {
        onUpdate();
      }
    } catch {
      onEditResult?.(false, "Something went wrong. Try again.");
      setEdit({ stage: "idle" });
      setEditedText("");
    }
  }

  function cancel() {
    setEdit({ stage: "idle" });
    setEditedText("");
    setSelectedText("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitEdit();
    }
    if (e.key === "Escape") cancel();
  }

  function renderText() {
    const textClass = "text-[15px] leading-relaxed text-foreground/80";

    if (edit.stage === "idle") {
      if (!hasAnimated.current) {
        return (
          <StreamingText text={block.text} className={textClass} />
        );
      }
      return (
        <p className={textClass}><FormattedText text={block.text} /></p>
      );
    }

    const { start, end } = edit;
    const before = block.text.slice(0, start);
    const selected = block.text.slice(start, end);
    const after = block.text.slice(end);

    return (
      <p className={textClass}>
        {before}
        <mark className="rounded bg-violet-100 px-0.5 text-foreground/80 ring-1 ring-violet-300/50">{selected}</mark>
        {after}
      </p>
    );
  }

  return (
    <div className="relative" ref={textRef}>
      {renderText()}

      <AnimatePresence>
        {toolbarPos && selectedText && !isEditing && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 2, scale: 0.97 }}
            transition={{ duration: 0.1 }}
            className="absolute z-20"
            style={{ top: toolbarPos.top, left: toolbarPos.left, transform: "translateX(-50%)" }}
          >
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                startEditing();
              }}
              className="flex items-center gap-1.5 rounded-full border border-border/80 bg-background px-2.5 py-1 text-[11px] font-medium text-foreground shadow-md transition-colors hover:bg-muted"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              </svg>
              Edit
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-xl border border-border/60 bg-muted/30 p-3">
              {edit.stage === "editing" && (
                <>
                  <textarea
                    ref={inputRef}
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={Math.max(1, Math.ceil(editedText.length / 60))}
                    className="w-full resize-none rounded-lg border border-border/50 bg-background px-3 py-2 text-[14px] leading-relaxed text-foreground outline-none transition-colors focus:border-violet-400/60 focus:ring-1 focus:ring-violet-400/20"
                    placeholder="Type your edit…"
                  />
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      onClick={submitEdit}
                      disabled={!editedText.trim() || editedText === edit.original}
                      className="rounded-full bg-foreground px-3 py-1 text-[11px] font-medium text-background transition-opacity disabled:opacity-25"
                    >
                      Submit for review
                    </button>
                    <button
                      onClick={cancel}
                      className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}

              {edit.stage === "reviewing" && (
                <div className="flex items-center gap-2.5 py-1 text-[12px] text-muted-foreground">
                  <TickingLogo className="h-4 w-4" />
                  Andy is reviewing your edit…
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
