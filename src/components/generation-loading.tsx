"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ROLES, Role } from "@/lib/types";
import { ROLE_DESCRIPTIONS } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { TickingLogo } from "@/components/ticking-logo";
import { AndyFace } from "@/components/andy-face";

const PHASE1_STEPS = [
  "Analyzing your request…",
  "Drafting artifact sections…",
];

const PHASE2_STEPS = [
  "Generating role-specific questions…",
  "Scoring initial alignment…",
];

const FINISHING_STEPS = [
  { main: "Reading between the lines…", sub: "Finding what the request didn't say" },
  { main: "Tailoring questions to each role…", sub: "Every perspective sees different gaps" },
  { main: "Ranking by severity…", sub: "So you focus on what matters most" },
  { main: "Preparing your workspace…", sub: "Almost there" },
];

const STEP_INTERVAL = 4000;
const FINISHING_INTERVAL = 2800;

const ROLE_CARD_COLORS: Record<
  string,
  {
    bg: string;
    border: string;
    text: string;
    selectedBg: string;
    selectedBorder: string;
  }
> = {
  Product: {
    bg: "bg-blue-500/5",
    border: "border-blue-500/15",
    text: "text-blue-400",
    selectedBg: "bg-blue-500/15",
    selectedBorder: "border-blue-500/40",
  },
  Engineering: {
    bg: "bg-violet-500/5",
    border: "border-violet-500/15",
    text: "text-violet-400",
    selectedBg: "bg-violet-500/15",
    selectedBorder: "border-violet-500/40",
  },
  Design: {
    bg: "bg-pink-500/5",
    border: "border-pink-500/15",
    text: "text-pink-400",
    selectedBg: "bg-pink-500/15",
    selectedBorder: "border-pink-500/40",
  },
  Data: {
    bg: "bg-cyan-500/5",
    border: "border-cyan-500/15",
    text: "text-cyan-400",
    selectedBg: "bg-cyan-500/15",
    selectedBorder: "border-cyan-500/40",
  },
  Legal: {
    bg: "bg-amber-500/5",
    border: "border-amber-500/15",
    text: "text-amber-400",
    selectedBg: "bg-amber-500/15",
    selectedBorder: "border-amber-500/40",
  },
  Support: {
    bg: "bg-orange-500/5",
    border: "border-orange-500/15",
    text: "text-orange-400",
    selectedBg: "bg-orange-500/15",
    selectedBorder: "border-orange-500/40",
  },
};

interface GenerationLoadingProps {
  userRole: Role;
  phase1Done: boolean;
  phase2Running: boolean;
  onRolesConfirmed: (roles: Role[], andyDecides: boolean) => void;
}

export function GenerationLoading({
  userRole,
  phase1Done,
  phase2Running,
  onRolesConfirmed,
}: GenerationLoadingProps) {
  const [phase1Step, setPhase1Step] = useState(0);
  const [phase2Step, setPhase2Step] = useState(0);
  const [selectedRoles, setSelectedRoles] = useState<Set<Role>>(new Set());
  const [andyDecides, setAndyDecides] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [finishingStep, setFinishingStep] = useState(0);

  const otherRoles = ROLES.filter((r) => r !== userRole);

  // Phase 1 step progression
  useEffect(() => {
    if (phase1Done) {
      setPhase1Step(PHASE1_STEPS.length - 1);
      return;
    }
    const timer = setInterval(() => {
      setPhase1Step((s) =>
        s + 1 < PHASE1_STEPS.length ? s + 1 : s
      );
    }, STEP_INTERVAL);
    return () => clearInterval(timer);
  }, [phase1Done]);

  // Phase 2 step progression
  useEffect(() => {
    if (!phase2Running) return;
    const timer = setInterval(() => {
      setPhase2Step((s) =>
        s + 1 < PHASE2_STEPS.length ? s + 1 : s
      );
    }, STEP_INTERVAL);
    return () => clearInterval(timer);
  }, [phase2Running]);

  useEffect(() => {
    if (!confirmed) return;
    const timer = setInterval(() => {
      setFinishingStep((s) => (s + 1) % FINISHING_STEPS.length);
    }, FINISHING_INTERVAL);
    return () => clearInterval(timer);
  }, [confirmed]);

  const currentStepText = phase2Running
    ? PHASE2_STEPS[phase2Step]
    : phase1Done
      ? "Structure ready — draft your team"
      : PHASE1_STEPS[phase1Step];

  const totalSteps = PHASE1_STEPS.length + PHASE2_STEPS.length;
  const completedSteps = phase2Running
    ? PHASE1_STEPS.length + phase2Step
    : phase1Done
      ? PHASE1_STEPS.length
      : phase1Step;

  function toggleRole(role: Role) {
    setAndyDecides(false);
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  }

  function selectAll() {
    setAndyDecides(false);
    setSelectedRoles(new Set(otherRoles));
  }

  function letAndyDecide() {
    setAndyDecides(true);
    setSelectedRoles(new Set());
  }

  function handleConfirm() {
    setConfirmed(true);
    onRolesConfirmed(Array.from(selectedRoles), andyDecides);
  }

  const canConfirm = andyDecides || selectedRoles.size > 0;
  const isAllSelected =
    !andyDecides && selectedRoles.size === otherRoles.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 grid place-items-center bg-background"
    >
      <div className="flex w-full max-w-xl flex-col items-center px-6">
        {/* Ticking logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mb-4"
        >
          <TickingLogo />
        </motion.div>

        {/* Progress bar + step text (hidden once roles are confirmed) */}
        <AnimatePresence>
          {!confirmed && (
            <motion.div
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="mb-10 flex flex-col items-center gap-2 overflow-hidden"
            >
              <div className="flex gap-1.5">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="h-1 rounded-full"
                    animate={{
                      width: i <= completedSteps ? 24 : 8,
                      backgroundColor:
                        i <= completedSteps
                          ? "hsl(var(--muted-foreground) / 0.5)"
                          : "hsl(var(--muted-foreground) / 0.15)",
                    }}
                    transition={{ type: "spring", stiffness: 200, damping: 25 }}
                  />
                ))}
              </div>
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentStepText}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-muted-foreground"
                >
                  {currentStepText}
                </motion.span>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {!confirmed ? (
            <motion.div
              key="drafter"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex w-full flex-col items-center"
            >
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="mb-1.5 text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
              >
                Assemble your team
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="mb-8 text-sm text-muted-foreground"
              >
                Pick at least one more perspective to include.
              </motion.p>

              {/* Role grid */}
              <div className="mb-5 grid w-full grid-cols-2 gap-2.5 sm:grid-cols-3">
                {ROLES.map((role, i) => {
                  const colors = ROLE_CARD_COLORS[role];
                  const isUserRole = role === userRole;
                  const isSelected = isUserRole || selectedRoles.has(role);
                  const dimmed = !isUserRole && andyDecides;

                  return (
                    <motion.button
                      key={role}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.35,
                        delay: 0.2 + i * 0.05,
                        ease: "easeOut",
                      }}
                      whileHover={isUserRole ? {} : { scale: 1.03 }}
                      whileTap={isUserRole ? {} : { scale: 0.97 }}
                      onClick={isUserRole ? undefined : () => toggleRole(role)}
                      disabled={isUserRole}
                      className={`relative flex flex-col items-start rounded-xl border px-4 py-3.5 text-left transition-all duration-200 ${
                        isUserRole
                          ? `${colors.selectedBg} ${colors.selectedBorder} cursor-default`
                          : isSelected
                            ? `${colors.selectedBg} ${colors.selectedBorder}`
                            : dimmed
                              ? `${colors.bg} ${colors.border} opacity-40`
                              : `${colors.bg} ${colors.border}`
                      }`}
                    >
                      <span
                        className={`text-sm font-semibold ${colors.text}`}
                      >
                        {role}
                      </span>
                      <span className="text-[11px] leading-tight text-muted-foreground">
                        {isUserRole ? "You" : ROLE_DESCRIPTIONS[role]}
                      </span>

                      {isSelected && (
                        <motion.div
                          initial={isUserRole ? false : { scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 15,
                          }}
                          className="absolute top-2.5 right-2.5"
                        >
                          <svg
                            className={`h-3.5 w-3.5 ${colors.text}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Special options */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.5 }}
                className="mb-8 flex gap-2.5"
              >
                <button
                  onClick={selectAll}
                  className={`rounded-full border px-4 py-2 text-[13px] font-medium transition-all ${
                    isAllSelected
                      ? "border-foreground/20 bg-foreground/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-foreground/15 hover:text-foreground"
                  }`}
                >
                  All perspectives
                </button>
                <button
                  onClick={letAndyDecide}
                  className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-medium transition-all ${
                    andyDecides
                      ? "border-purple-500/30 bg-purple-500/10 text-purple-400"
                      : "border-border text-muted-foreground hover:border-foreground/15 hover:text-foreground"
                  }`}
                >
                  <AndyFace size={24} />
                  Let Andy decide
                </button>
              </motion.div>

              {/* Confirm */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
              >
                <Button
                  onClick={handleConfirm}
                  disabled={!canConfirm}
                  className="rounded-full px-10"
                >
                  Continue
                </Button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="finishing"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex flex-col items-center gap-3"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={finishingStep}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center gap-1.5"
                >
                  <p className="text-sm font-medium text-foreground">
                    {FINISHING_STEPS[finishingStep].main}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {FINISHING_STEPS[finishingStep].sub}
                  </p>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
