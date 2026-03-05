"use client";

import { useState } from "react";
import { Thread, Role } from "@/lib/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ThreadPopover } from "./thread-popover";

interface ThreadBubbleProps {
  blockId: string;
  threads: Thread[];
  proposalId: string;
  currentRole: Role;
  onUpdate: () => void;
  token: string;
  onBlockSelect: (id: string | null) => void;
}

export function ThreadBubble({
  blockId,
  threads,
  proposalId,
  currentRole,
  onUpdate,
  token,
  onBlockSelect,
}: ThreadBubbleProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const realThreads = threads.filter((t) => !t.isSuggested);
  const suggestedThreads = threads.filter((t) => t.isSuggested);
  const count = realThreads.length;
  const hasSuggested = suggestedThreads.length > 0;
  const allResolved =
    count > 0 && realThreads.every((t) => t.status === "resolved");

  async function handleCreateThread(body: string) {
    setCreating(true);
    try {
      await fetch(`/api/proposals/${proposalId}/threads?t=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId, role: currentRole, body }),
      });
      onUpdate();
    } finally {
      setCreating(false);
    }
  }

  const popoverPanel = (
    <PopoverContent
      side="right"
      align="start"
      className="w-[320px] overflow-hidden rounded-xl border-border/50 p-0 shadow-xl shadow-black/[0.04]"
    >
      <ThreadPopover
        threads={count === 0 && !hasSuggested ? [] : threads}
        proposalId={proposalId}
        currentRole={currentRole}
        onUpdate={onUpdate}
        token={token}
        onCreateThread={handleCreateThread}
        creating={creating}
      />
    </PopoverContent>
  );

  if (count === 0 && !hasSuggested) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/25 opacity-0 transition-all duration-150 hover:bg-muted/60 hover:text-muted-foreground/60 group-hover:opacity-100"
            onClick={() => onBlockSelect(blockId)}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
            </svg>
          </button>
        </PopoverTrigger>
        {popoverPanel}
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={() => onBlockSelect(blockId)}
          className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums transition-all duration-150 hover:scale-105 ${
            hasSuggested && count === 0
              ? "border border-dashed border-violet-400/25 text-violet-400"
              : allResolved
                ? "bg-muted text-muted-foreground hover:bg-muted/80"
                : "bg-blue-500/10 text-blue-500 hover:bg-blue-500/15"
          }`}
        >
          {count > 0 ? count : "\u2726"}
        </button>
      </PopoverTrigger>
      {popoverPanel}
    </Popover>
  );
}
