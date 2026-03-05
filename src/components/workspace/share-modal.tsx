"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Role } from "@/lib/types";
import { useMemo, useState } from "react";

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalId: string;
  token: string;
  currentRole: Role;
  draftedRoles?: Role[];
}

export function ShareModal({
  open,
  onOpenChange,
  proposalId,
  token,
  currentRole,
  draftedRoles,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const shareLink = useMemo(() => {
    const base =
      typeof window !== "undefined" ? window.location.origin : "";
    const params = new URLSearchParams({ t: token, from: currentRole });
    if (draftedRoles && draftedRoles.length > 0) {
      params.set("roles", draftedRoles.join(","));
    }
    return `${base}/p/${proposalId}?${params.toString()}`;
  }, [proposalId, token, currentRole, draftedRoles]);

  async function copyLink() {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-hidden">
        <DialogHeader className="min-w-0">
          <DialogTitle className="text-base">Share this proposal</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            The link will be shared as <span className="font-medium text-foreground">{currentRole}</span>.
            Recipients will be asked to select their role.
          </DialogDescription>
        </DialogHeader>
        <div className="min-w-0 space-y-3 pt-2">
          <div className="overflow-hidden rounded-lg border border-border bg-muted/30 px-3 py-2">
            <p className="truncate text-sm text-muted-foreground font-mono">
              {shareLink}
            </p>
          </div>
          <Button
            className="w-full"
            onClick={copyLink}
          >
            {copied ? "Copied!" : "Copy link"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
