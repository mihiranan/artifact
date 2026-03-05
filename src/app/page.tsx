"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { HumansAndLogo } from "@/components/humans-and-logo";
import { GenerationLoading } from "@/components/generation-loading";
import { TickingLogo } from "@/components/ticking-logo";
import { ROLES, Role } from "@/lib/types";

const SUGGESTIONS = [
  {
    label: "Add short-form video to the feed",
    prompt:
      "We need to add short-form video to the main feed before TikTok eats our engagement numbers. Product wants it yesterday, Engineering is worried about CDN costs and encoding pipeline, Design needs to figure out the creation UX, and Legal has concerns about content moderation at scale.",
  },
  {
    label: "Migrate payments to microservices",
    prompt:
      "Migrate the payments service from our monolith to a standalone microservice before Black Friday. The current system can't handle the projected load, but we need to do it without any downtime and maintain PCI compliance throughout the migration.",
  },
  {
    label: "AI copilot for support agents",
    prompt:
      "Launch an AI copilot for our support agents to cut average resolution time in half. We're drowning in ticket volume and agents are burning out. Need to figure out the right AI/human handoff, integrate with our existing ticketing system, and make sure we don't hallucinate policy details.",
  },
  {
    label: "Redesign mobile onboarding",
    prompt:
      "Redesign the mobile onboarding flow — we're losing 60% of signups before activation. The current flow has too many steps, asks for too much information upfront, and doesn't show value quickly enough. We need to get users to their aha moment in under 2 minutes.",
  },
  {
    label: "Build self-serve enterprise tier",
    prompt:
      "Build a self-serve enterprise tier so sales isn't a bottleneck for mid-market deals. We're losing deals because the procurement process takes 6 weeks. Need SSO, SCIM, audit logs, and a billing system that handles annual contracts — all without requiring a sales call.",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.15 + i * 0.06, duration: 0.35, ease: "easeOut" as const },
  }),
};

type Phase1Result = { id: string; shareToken: string };

export default function CreateProposalPage() {
  const router = useRouter();
  const [request, setRequest] = useState("");
  const [userRole, setUserRole] = useState<Role>("Product");
  const [loading, setLoading] = useState(false);
  const [phase1Done, setPhase1Done] = useState(false);
  const [phase2Running, setPhase2Running] = useState(false);

  const phase1ResultRef = useRef<Phase1Result | null>(null);
  const phase1PromiseRef = useRef<Promise<Phase1Result | null> | null>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  const handlePaletteChange = useCallback(
    (color: [number, number, number]) => {
      const mix = 0.06;
      const r = Math.round(255 + (color[0] - 255) * mix);
      const g = Math.round(255 + (color[1] - 255) * mix);
      const b = Math.round(255 + (color[2] - 255) * mix);

      if (bgRef.current) {
        bgRef.current.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
      }
      if (glowRef.current) {
        const gMix = 0.12;
        const gR = Math.round(255 + (color[0] - 255) * gMix);
        const gG = Math.round(255 + (color[1] - 255) * gMix);
        const gB = Math.round(255 + (color[2] - 255) * gMix);
        glowRef.current.style.background = `radial-gradient(ellipse 90% 60% at 50% 28%, rgb(${gR}, ${gG}, ${gB}), transparent 100%)`;
      }
    },
    []
  );

  function handleSubmit() {
    if (!request.trim()) return;
    setLoading(true);
    setPhase1Done(false);

    phase1PromiseRef.current = (async () => {
      try {
        const res = await fetch("/api/proposals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawRequest: request }),
        });
        const data: Phase1Result = await res.json();
        phase1ResultRef.current = data;
        setPhase1Done(true);
        return data;
      } catch {
        setLoading(false);
        return null;
      }
    })();
  }

  const handleRolesConfirmed = useCallback(
    async (draftedRoles: Role[], andyDecides: boolean) => {
      const allRoles = andyDecides
        ? [...ROLES]
        : Array.from(new Set([userRole, ...draftedRoles]));
      const rolesParam = andyDecides ? "andy" : allRoles.join(",");

      function navigateAndFinalize(p1: Phase1Result) {
        // Fire finalize in background — workspace polling picks up questions
        fetch(`/api/proposals/${p1.id}/finalize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roles: allRoles, token: p1.shareToken }),
        }).catch(() => {});

        router.push(
          `/p/${p1.id}?t=${p1.shareToken}&as=${userRole}&new=1&roles=${rolesParam}`
        );
      }

      if (phase1ResultRef.current) {
        navigateAndFinalize(phase1ResultRef.current);
      } else {
        setPhase2Running(true);
        const data = await phase1PromiseRef.current;
        if (data) {
          navigateAndFinalize(data);
        } else {
          setPhase2Running(false);
          setLoading(false);
        }
      }
    },
    [router, userRole]
  );

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <GenerationLoading
          key="loading"
          userRole={userRole}
          phase1Done={phase1Done}
          phase2Running={phase2Running}
          onRolesConfirmed={handleRolesConfirmed}
        />
      ) : (
        <motion.div
          ref={bgRef}
          key="form"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.35 }}
          className="relative flex min-h-screen flex-col bg-background px-6 md:px-12 lg:px-20"
          style={{ transition: "background-color 2s ease" }}
        >
          <div
            ref={glowRef}
            className="pointer-events-none absolute inset-0 z-0"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative z-10 flex justify-center pt-4 md:pt-5"
          >
            <div className="text-[3rem] md:text-[4.5rem] lg:text-[5.5rem]">
              <HumansAndLogo onPaletteChange={handlePaletteChange} />
            </div>
          </motion.div>

          <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center gap-10 pt-6 md:flex-row md:items-start md:gap-16 md:pt-10 lg:gap-24">
            <div className="w-full md:w-1/2 md:max-w-lg">
              <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut", delay: 0.08 }}
                className="mb-4 flex items-center gap-x-3 text-4xl font-semibold tracking-tight text-foreground md:text-5xl"
              >
                <TickingLogo className="h-10 w-10 md:h-12 md:w-12" interval={2000} />
                <span className="font-bold uppercase tracking-tight">
                  Artifact
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut", delay: 0.12 }}
                className="mb-1 text-xl font-semibold tracking-tight text-foreground md:text-2xl"
              >
                Every stakeholder. One artifact.
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut", delay: 0.16 }}
                className="mb-8 whitespace-nowrap text-[14px] text-muted-foreground md:text-[15px]"
              >
                Describe what you want to build. We&rsquo;ll bring every perspective to the table.
              </motion.p>

              <p className="mb-1.5 pl-3 text-[13px] font-semibold text-muted-foreground/60">
                Try an example
              </p>
              <div className="flex flex-col gap-0.5">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={i}
                    custom={i}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setRequest(s.prompt)}
                    className="group flex items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-foreground/[0.04]"
                  >
                    <span className="shrink-0 text-[11px] text-muted-foreground/50 transition-colors group-hover:text-muted-foreground">
                      &rarr;
                    </span>
                    <span className="text-[13px] leading-snug text-muted-foreground transition-colors group-hover:text-foreground">
                      {s.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="w-full pb-12 md:w-1/2 md:max-w-lg md:pb-0 md:pt-[68px]">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: "easeOut", delay: 0.2 }}
              >
                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-[12px] font-semibold text-muted-foreground">
                    Your role
                  </span>
                  {ROLES.map((role) => {
                    const selected = userRole === role;
                    return (
                      <motion.button
                        key={role}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setUserRole(role)}
                        className={`rounded-full px-3 py-1 text-[12px] font-medium transition-all ${
                          selected
                            ? "bg-foreground text-background"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {role}
                      </motion.button>
                    );
                  })}
                </div>

                <div className="landing-input relative rounded-2xl border border-border bg-card/90 shadow-sm">
                  <Textarea
                    value={request}
                    onChange={(e) => setRequest(e.target.value)}
                    placeholder="Describe what you want to build or change. Messy is fine…"
                    className="!border-none min-h-[160px] resize-none bg-transparent text-[15px] leading-relaxed text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-transparent md:min-h-[200px]"
                    disabled={loading}
                  />
                  <div className="flex justify-end px-3 pb-3">
                    <Button
                      onClick={handleSubmit}
                      disabled={!request.trim() || loading}
                      size="sm"
                      className="shrink-0 rounded-full px-5"
                    >
                      Build Artifact
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          <div className="fixed bottom-5 left-0 right-0 z-10 flex justify-center">
            <span className="rounded-full bg-foreground/5 px-5 py-2 text-[14px] font-medium tracking-wide text-muted-foreground/50 backdrop-blur-md">
              Built by Mihir
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
