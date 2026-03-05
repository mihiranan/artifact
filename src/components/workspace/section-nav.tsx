"use client";

import { useState, useEffect, useRef } from "react";
import { Section } from "@/lib/types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SectionNav({
  sections,
  onSectionSelect,
  visibleSectionKey,
}: {
  sections: Section[];
  onSectionSelect: (sectionKey: string) => void;
  visibleSectionKey: string | null;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [autoCollapsed, setAutoCollapsed] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const userOverride = useRef(false);
  const mountedRef = useRef(false);

  const isCollapsed = collapsed || autoCollapsed;

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const timer = setTimeout(() => { mountedRef.current = true; }, 1000);

    const ro = new ResizeObserver(() => {
      if (!mountedRef.current || isCollapsed || userOverride.current) return;
      const buttons = nav.querySelectorAll<HTMLElement>("button[data-nav-label]");
      let clipped = false;
      for (const btn of buttons) {
        if (btn.scrollWidth > btn.clientWidth + 1) {
          clipped = true;
          break;
        }
      }
      setAutoCollapsed(clipped);
    });

    ro.observe(nav);
    return () => { ro.disconnect(); clearTimeout(timer); };
  }, [isCollapsed]);

  return (
    <div
      onClick={() => {
        setCollapsed((c) => {
          if (c) userOverride.current = true;
          return !c;
        });
        setAutoCollapsed(false);
      }}
      className={`fixed left-0 top-0 z-20 flex h-full items-start pt-20 pb-4 pl-4 pr-2 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        isCollapsed ? "w-[72px] cursor-e-resize" : "w-64 cursor-w-resize"
      }`}
    >
      <nav ref={navRef} className="w-full px-3 py-4 overflow-hidden">
        <ul>
          {sections.map((s) => {
            const isActive = s.key === visibleSectionKey;
            const hasQuestions = s.blocks.some((b) => b.type === "question");
            const allAnswered = hasQuestions && s.blocks.filter((b) => b.type === "question").every((b) => b.status === "answered");
            const isComplete = allAnswered && (s.questionRound ?? 0) >= 1 && (!s.generationStatus || s.generationStatus === "idle");

            const btn = (
              <button
                onClick={(e) => { e.stopPropagation(); onSectionSelect(s.key); }}
                data-nav-label
                className={`group flex w-full items-center h-7 text-left text-[13px] whitespace-nowrap transition-colors ${
                  isCollapsed
                    ? "justify-center"
                    : isActive
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground/70 hover:text-foreground"
                }`}
                aria-label={s.title}
              >
                {isCollapsed ? (
                  isComplete ? (
                    <span className="flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500/20">
                      <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  ) : (
                    <span
                      className={`block rounded-full transition-all duration-300 ${
                        isActive
                          ? "h-[2px] w-5 bg-foreground"
                          : "h-[2px] w-3 bg-muted-foreground/40 group-hover:bg-muted-foreground group-hover:w-4"
                      }`}
                    />
                  )
                ) : (
                  <>
                    {isComplete ? (
                      <span className="flex h-3.5 w-3.5 mr-1.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    ) : (
                      <span
                        className={`h-1.5 w-1.5 mr-2 shrink-0 rounded-full transition-opacity ${
                          isActive ? "opacity-100 bg-foreground" : "opacity-0"
                        }`}
                      />
                    )}
                    {s.title}
                  </>
                )}
              </button>
            );

            return (
              <li key={s.key}>
                {isCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{btn}</TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">
                      {s.title}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  btn
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
