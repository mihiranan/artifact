"use client";

import { useState } from "react";
import { Proposal, Blocker, Block } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: Proposal;
  blocker: Blocker;
  onUpdate: () => void;
  token: string;
}

export function PatchModal({
  open,
  onOpenChange,
  proposal,
  blocker,
  onUpdate,
  token,
}: PatchModalProps) {
  const [patchResult, setPatchResult] = useState<{
    sectionKey: string;
    before: string;
    after: string;
    updatedBlocks: Block[];
    changelog: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  async function handlePropose() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/proposals/${proposal.id}/patch?t=${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intent: blocker.fixDetail,
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setPatchResult(data);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleApply() {
    if (!patchResult) return;
    setApplying(true);
    try {
      await fetch(`/api/proposals/${proposal.id}/patch?t=${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionKey: patchResult.sectionKey,
          updatedBlocks: patchResult.updatedBlocks,
        }),
      });
      onUpdate();
      onOpenChange(false);
      setPatchResult(null);
    } finally {
      setApplying(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setPatchResult(null);
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-base">Propose fix</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-foreground/80">{blocker.title}</p>
        <p className="text-xs text-muted-foreground">{blocker.fixDetail}</p>

        {!patchResult && (
          <Button onClick={handlePropose} disabled={loading} className="mt-3">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Generating patch…
              </span>
            ) : (
              "Generate patch"
            )}
          </Button>
        )}

        {patchResult && (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Section: <span className="font-medium">{patchResult.sectionKey}</span>
              {" — "}
              {patchResult.changelog}
            </p>
            <div>
              <p className="mb-1 text-xs font-medium text-red-400">Before</p>
              <pre className="max-h-[150px] overflow-y-auto rounded-lg bg-red-500/10 p-3 text-xs leading-relaxed text-foreground/70 whitespace-pre-wrap">
                {patchResult.before}
              </pre>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-emerald-500">After</p>
              <pre className="max-h-[150px] overflow-y-auto rounded-lg bg-emerald-500/10 p-3 text-xs leading-relaxed text-foreground/70 whitespace-pre-wrap">
                {patchResult.after}
              </pre>
            </div>
            <Button onClick={handleApply} disabled={applying}>
              {applying ? "Applying…" : "Apply patch"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
