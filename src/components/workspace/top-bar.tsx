"use client";

import { Proposal, Role } from "@/lib/types";
import { ROLE_STYLE, SCORE_THRESHOLD_READY, SCORE_THRESHOLD_REVIEW } from "@/lib/roles";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShareModal } from "./share-modal";
import { useState } from "react";
import {
  downloadMarkdown,
  downloadPlainText,
  downloadDocx,
  copyMarkdown,
} from "@/lib/export";

interface TopBarProps {
  proposal: Proposal;
  currentRole: Role;
  token: string;
  draftedRoles?: Role[];
  onRoleChange?: (role: Role) => void;
}

export function TopBar({
  proposal,
  currentRole,
  token,
  draftedRoles,
  onRoleChange,
}: TopBarProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const visibleRoles = draftedRoles && draftedRoles.length > 0 ? draftedRoles : [currentRole];

  async function handleCopy() {
    await copyMarkdown(proposal);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <header className="absolute inset-x-0 top-0 z-30 flex h-16 items-center justify-between px-4 backdrop-blur-md [background:linear-gradient(to_bottom,hsl(var(--background))_0%,hsl(var(--background)/0.7)_60%,transparent_100%)]">
      <div className="flex items-center gap-3">
        <img
          src="/humans-logo.svg"
          alt="humans&"
          className="h-12 w-auto"
        />
      </div>

      {/* Role switcher — centered */}
      {onRoleChange && visibleRoles.length > 1 ? (
        <div className="absolute left-1/2 -translate-x-1/2" data-tour="role-switcher">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full border border-border/60 bg-background/90 px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background hover:text-foreground">
                Viewing as{" "}
                <span
                  className={`font-semibold ${ROLE_STYLE[currentRole].text || "text-foreground"}`}
                >
                  {currentRole}
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-40"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              {visibleRoles.map((r) => (
                <DropdownMenuItem
                  key={r}
                  onClick={() => onRoleChange(r)}
                  className={r === currentRole ? "font-semibold" : ""}
                >
                  <span className={ROLE_STYLE[r].text || ""}>{r}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : onRoleChange ? (
        <div className="absolute left-1/2 -translate-x-1/2">
          <span className="text-sm text-muted-foreground">
            Viewing as{" "}
            <span
              className={`font-semibold ${ROLE_STYLE[currentRole].text || "text-foreground"}`}
            >
              {currentRole}
            </span>
          </span>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <AlignmentScorePill score={proposal.alignmentScore} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/90 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background hover:text-foreground">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => downloadDocx(proposal)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 text-blue-400">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Word Document (.docx)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => downloadMarkdown(proposal)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 text-violet-400">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Markdown (.md)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => downloadPlainText(proposal)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 text-muted-foreground">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Plain Text (.txt)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCopy}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 text-muted-foreground">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
              {copied ? "Copied!" : "Copy as Markdown"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/90 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background hover:text-foreground"
          onClick={() => setShareOpen(true)}
          data-tour="share-button"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Share
        </button>
      </div>

      <ShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        proposalId={proposal.id}
        token={token}
        currentRole={currentRole}
        draftedRoles={draftedRoles}
      />
    </header>
  );
}

function AlignmentScorePill({ score }: { score: number }) {
  const radius = 7;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const strokeColor =
    score >= SCORE_THRESHOLD_READY
      ? "stroke-emerald-500"
      : score > SCORE_THRESHOLD_REVIEW
        ? "stroke-amber-500"
        : "stroke-muted-foreground/50";

  const textColor =
    score >= SCORE_THRESHOLD_READY
      ? "text-emerald-500"
      : score > SCORE_THRESHOLD_REVIEW
        ? "text-amber-500"
        : "text-muted-foreground";

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/90 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
      <svg width="18" height="18" viewBox="0 0 18 18" className="-rotate-90">
        <circle
          cx="9"
          cy="9"
          r={radius}
          fill="none"
          strokeWidth="2"
          className="stroke-muted/40"
        />
        <circle
          cx="9"
          cy="9"
          r={radius}
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${strokeColor} transition-all duration-700 ease-out`}
        />
      </svg>
      <span className={textColor}>{score}%</span>
    </div>
  );
}
