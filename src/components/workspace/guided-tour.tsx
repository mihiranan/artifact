"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface TourStep {
  target: string;
  title: React.ReactNode;
  description: string;
  placement: "top" | "bottom" | "left" | "right";
}

const BASE_STEPS: TourStep[] = [
  {
    target: "[data-tour='chatbot']",
    title: <>Meet Andy <span className="font-normal italic">(also goes by &y)</span></>,
    description:
      "Andy is the brain behind everything here. He shaped your rough idea into a structured spec, and he's read the whole thing. Ask him anything, anytime.",
    placement: "top",
  },
  {
    target: "[data-tour='prd-document']",
    title: "Your Spec, Ready to Go",
    description:
      "This is what Andy built from your input. Every section is editable — click any text to refine it, and Andy reviews your changes in real time.",
    placement: "right",
  },
  {
    target: "[data-tour='question-block']",
    title: "Questions That Need You",
    description:
      "Andy spotted gaps and assigned each one to the right role. These are yours — answer them to move the spec forward. Other roles will see the questions meant for them.",
    placement: "bottom",
  },
  {
    target: "[data-tour='share-button']",
    title: "Bring In Your Team",
    description:
      "Click Share to send a link to your engineering lead, designer, or anyone involved. They'll pick their role and see only the questions and sections relevant to them.",
    placement: "bottom",
  },
  {
    target: "[data-tour='role-switcher']",
    title: "See Every Angle",
    description:
      "Switch roles to answer questions as different stakeholders — a quick way to collaborate from one device instead of sharing a link. Each role gets a tailored view with its own questions and context.",
    placement: "bottom",
  },
];

export function GuidedTour({ questionsLoaded = true }: { questionsLoaded?: boolean }) {
  const searchParams = useSearchParams();
  const isNew = searchParams.get("new") === "1";
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const current = BASE_STEPS[step];
    if (!current) return;
    const el = document.querySelector(current.target);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setHighlightRect(rect);

    const tooltipEl = tooltipRef.current;
    const tooltipW = 320;
    const tooltipH = tooltipEl ? tooltipEl.offsetHeight : 180;
    const pad = 16;
    let top = 0;
    let left = 0;

    switch (current.placement) {
      case "bottom":
        top = rect.bottom + pad;
        left = rect.left + rect.width / 2 - tooltipW / 2;
        break;
      case "top":
        top = rect.top - tooltipH - pad;
        left = rect.left + rect.width / 2 - tooltipW / 2;
        break;
      case "right":
        top = rect.top + rect.height / 2 - tooltipH / 2;
        left = rect.right + pad;
        break;
      case "left":
        top = rect.top + rect.height / 2 - tooltipH / 2;
        left = rect.left - tooltipW - pad;
        break;
    }

    top = Math.max(8, Math.min(top, window.innerHeight - tooltipH - 8));
    left = Math.max(8, Math.min(left, window.innerWidth - tooltipW - 8));
    setPosition({ top, left });
  }, [step, BASE_STEPS]);

  useEffect(() => {
    if (!active) return;
    updatePosition();
    const raf = requestAnimationFrame(() => updatePosition());
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [active, step, updatePosition]);

  useEffect(() => {
    if (active) {
      const prevHtmlOverflow = document.documentElement.style.overflow;
      const prevBodyOverflow = document.body.style.overflow;
      const prevBodyPosition = document.body.style.position;
      const prevBodyWidth = document.body.style.width;
      const scrollY = window.scrollY;
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.width = "100%";
      return () => {
        document.documentElement.style.overflow = prevHtmlOverflow;
        document.body.style.overflow = prevBodyOverflow;
        document.body.style.position = prevBodyPosition;
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.width = prevBodyWidth;
        window.scrollTo(0, scrollY);
      };
    }
  }, [active]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isNew) return;
    if (!questionsLoaded) return;
    const timer = setTimeout(() => {
      setActive(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [isNew, questionsLoaded]);

  function handleNext() {
    if (step + 1 < BASE_STEPS.length) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  }

  function handleClose() {
    setActive(false);
    setStep(0);
  }

  function startTour() {
    setStep(0);
    setActive(true);
  }

  const current = BASE_STEPS[step];

  const cx = highlightRect ? highlightRect.left + highlightRect.width / 2 : 0;
  const cy = highlightRect ? highlightRect.top + highlightRect.height / 2 : 0;
  const spreadPad = 50;
  const spreadX = highlightRect ? highlightRect.width / 2 + spreadPad : 0;
  const spreadY = highlightRect ? highlightRect.height / 2 + spreadPad : 0;
  const gradR = Math.sqrt(spreadX * spreadX + spreadY * spreadY) + 60;

  return (
    <>
      <button
        onClick={startTour}
        data-tour="tour-trigger"
        className="flex items-center gap-2 rounded-full bg-foreground/[0.06] px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.1] hover:text-foreground"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
        Tour
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {active && current && (
              <>
                {/* Soft vignette overlay — no hard cutout */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="fixed inset-0 z-[99999]"
                  style={{ pointerEvents: "auto" }}
                  onClick={(e) => e.preventDefault()}
                >
                  <svg className="absolute inset-0 h-full w-full pointer-events-none">
                    <defs>
                      <mask id="tour-mask">
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        {highlightRect && (
                          <motion.ellipse
                            initial={{ opacity: 0 }}
                            animate={{
                              cx,
                              cy,
                              rx: spreadX + 60,
                              ry: spreadY + 60,
                              opacity: 1,
                            }}
                            transition={{ type: "spring", stiffness: 80, damping: 20 }}
                            fill="url(#soft-vignette)"
                          />
                        )}
                      </mask>
                      {highlightRect && (
                        <motion.radialGradient
                          id="soft-vignette"
                          gradientUnits="userSpaceOnUse"
                          animate={{ cx, cy, r: gradR }}
                          transition={{ type: "spring", stiffness: 80, damping: 20 }}
                        >
                          <stop offset="0%" stopColor="black" stopOpacity="1" />
                          <stop offset="35%" stopColor="black" stopOpacity="0.88" />
                          <stop offset="58%" stopColor="black" stopOpacity="0.42" />
                          <stop offset="80%" stopColor="black" stopOpacity="0.1" />
                          <stop offset="100%" stopColor="black" stopOpacity="0" />
                        </motion.radialGradient>
                      )}
                    </defs>
                    <rect
                      x="0" y="0" width="100%" height="100%"
                      fill="rgba(0,0,0,0.45)"
                      mask="url(#tour-mask)"
                    />
                  </svg>

                </motion.div>

                {/* Tooltip card */}
                <motion.div
                  ref={tooltipRef}
                  key={step}
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 260, damping: 24 }}
                  className="fixed z-[99999] w-80 rounded-2xl border border-white/[0.08] bg-zinc-900/95 backdrop-blur-2xl p-5 shadow-[0_8px_40px_rgba(0,0,0,0.35)]"
                  style={{ top: position.top, left: position.left }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex gap-1.5">
                      {BASE_STEPS.map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 rounded-full transition-all duration-300 ${
                            i === step
                              ? "w-5 bg-white"
                              : i < step
                                ? "w-1.5 bg-white/40"
                                : "w-1.5 bg-white/10"
                          }`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={handleClose}
                      className="text-[11px] text-white/30 hover:text-white/60 transition-colors"
                    >
                      Skip tour
                    </button>
                  </div>
                  <h3 className="mb-1.5 text-[15px] font-semibold text-white tracking-tight">
                    {current.title}
                  </h3>
                  <p className="mb-4 text-[13px] leading-relaxed text-white/55">
                    {current.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white/25">
                      {step + 1} of {BASE_STEPS.length}
                    </span>
                    <button
                      onClick={handleNext}
                      className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-zinc-900 transition-all hover:bg-white/90 active:scale-[0.97]"
                    >
                      {step + 1 < BASE_STEPS.length ? "Next" : "Let\u2019s go"}
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
