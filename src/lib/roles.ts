import type { Role } from "./types";

export const ROLE_STYLE: Record<
  Role,
  {
    text: string;
    bg: string;
    border: string;
    dot: string;
    badge: string;
    mention: string;
    popoverBg: string;
  }
> = {
  Product: {
    text: "text-blue-500",
    bg: "bg-blue-500/15",
    border: "border-blue-500/20",
    dot: "bg-blue-400",
    badge: "border-blue-500/30 text-blue-400 bg-blue-500/10",
    mention: "text-blue-400 bg-blue-500/15",
    popoverBg: "bg-blue-500",
  },
  Engineering: {
    text: "text-violet-500",
    bg: "bg-violet-500/15",
    border: "border-violet-500/20",
    dot: "bg-violet-400",
    badge: "border-violet-500/30 text-violet-400 bg-violet-500/10",
    mention: "text-violet-400 bg-violet-500/15",
    popoverBg: "bg-violet-500",
  },
  Design: {
    text: "text-pink-500",
    bg: "bg-pink-500/15",
    border: "border-pink-500/20",
    dot: "bg-pink-400",
    badge: "border-pink-500/30 text-pink-400 bg-pink-500/10",
    mention: "text-pink-400 bg-pink-500/15",
    popoverBg: "bg-pink-500",
  },
  Data: {
    text: "text-cyan-500",
    bg: "bg-cyan-500/15",
    border: "border-cyan-500/20",
    dot: "bg-cyan-400",
    badge: "border-cyan-500/30 text-cyan-400 bg-cyan-500/10",
    mention: "text-cyan-400 bg-cyan-500/15",
    popoverBg: "bg-cyan-500",
  },
  Legal: {
    text: "text-amber-500",
    bg: "bg-amber-500/15",
    border: "border-amber-500/20",
    dot: "bg-amber-400",
    badge: "border-amber-500/30 text-amber-400 bg-amber-500/10",
    mention: "text-amber-400 bg-amber-500/15",
    popoverBg: "bg-amber-500",
  },
  Support: {
    text: "text-orange-500",
    bg: "bg-orange-500/15",
    border: "border-orange-500/20",
    dot: "bg-orange-400",
    badge: "border-orange-500/30 text-orange-400 bg-orange-500/10",
    mention: "text-orange-400 bg-orange-500/15",
    popoverBg: "bg-orange-500",
  },
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  Product: "Strategy & priorities",
  Engineering: "Feasibility & architecture",
  Design: "Experience & usability",
  Data: "Metrics & insights",
  Legal: "Compliance & risk",
  Support: "Customer impact & ops",
};

export const SCORE_THRESHOLD_READY = 80;
export const SCORE_THRESHOLD_REVIEW = 30;
