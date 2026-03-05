"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Proposal, Role, ROLES, GenerationStatus, AndyMessage } from "@/lib/types";
import { TopBar } from "@/components/workspace/top-bar";
import { PrdDocument } from "@/components/workspace/prd-document";
import { RolePickerDialog } from "@/components/workspace/role-picker-dialog";
import { ChatBot } from "@/components/workspace/chat-bot";
import { GuidedTour } from "@/components/workspace/guided-tour";
import { SectionNav } from "@/components/workspace/section-nav";

const APPROVED_QUIPS = [
  "Looks good to me!",
  "Nice edit, locked it in.",
  "That works — updated.",
  "Approved, you're on a roll.",
  "Clean edit, it's in.",
];

const REJECTED_QUIPS = [
  "Hmm, not quite — %s",
  "I'd hold off on that one. %s",
  "Can't do that one — %s",
];

function pickRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function WorkspacePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const token = searchParams.get("t") || "";
  const roleParam = searchParams.get("as") || "";
  const fromParam = searchParams.get("from") || "";
  const isNew = searchParams.get("new") === "1";

  const rolesParam = searchParams.get("roles") || "";
  const draftedRoles: Role[] =
    rolesParam === "andy" || !rolesParam
      ? [...ROLES]
      : (rolesParam.split(",").filter((r) => (ROLES as readonly string[]).includes(r)) as Role[]);

  const hasExplicitRole = ROLES.includes(roleParam as Role);
  const fromRole = ROLES.includes(fromParam as Role) ? (fromParam as Role) : undefined;
  const needsRolePicker = !hasExplicitRole && !!fromRole;

  const [currentRole, setCurrentRole] = useState<Role>(
    hasExplicitRole ? (roleParam as Role) : "Product"
  );
  const [roleChosen, setRoleChosen] = useState(!needsRolePicker);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [visibleSectionKey, setVisibleSectionKey] = useState<string | null>(null);
  const [editResultQuip, setEditResultQuip] = useState<{ msg: string; key: number } | null>(null);
  const [latestAndyQuip, setLatestAndyQuip] = useState<{ msg: string; key: number } | null>(null);
  const lastSeenMessageId = useRef<string | null>(null);
  const skipNextQuipRef = useRef(true);
  const docPanelRef = useRef<HTMLDivElement>(null);
  const manualScrollLock = useRef<number | null>(null);
  const fetchIdRef = useRef(0);
  const pollGraceRef = useRef(0);
  const prevQuestionsLoadingRef = useRef(false);

  const questionsLoaded = proposal?.prdJson.sections.some(s =>
    s.blocks.some(b => b.type === "question")
  ) ?? false;
  const questionsLoading = isNew && !loading && !questionsLoaded;

  useEffect(() => {
    const wasLoading = prevQuestionsLoadingRef.current;
    prevQuestionsLoadingRef.current = questionsLoading;

    if (questionsLoading && !wasLoading) {
      setLatestAndyQuip({
        msg: "Just a moment — I'm drafting questions for your team.",
        key: Date.now(),
      });
    }
    if (!questionsLoading && wasLoading) {
      setLatestAndyQuip({ msg: "", key: Date.now() });
    }
  }, [questionsLoading]);

  const scrollToSection = useCallback((sectionKey: string) => {
    const container = docPanelRef.current;
    if (!container) return;
    const el = container.querySelector(`[data-section-key="${sectionKey}"]`);
    if (!el) return;

    setVisibleSectionKey(sectionKey);

    if (manualScrollLock.current) clearTimeout(manualScrollLock.current);
    manualScrollLock.current = window.setTimeout(() => {
      manualScrollLock.current = null;
    }, 800);

    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    const container = docPanelRef.current;
    if (!container) return;

    let ticking = false;

    function updateActiveSection() {
      if (manualScrollLock.current) return;

      const els = container!.querySelectorAll("[data-section-key]");
      if (els.length === 0) return;

      const containerRect = container!.getBoundingClientRect();

      if (container!.scrollHeight - container!.scrollTop - container!.clientHeight < 40) {
        const last = (els[els.length - 1] as HTMLElement).dataset.sectionKey;
        if (last) setVisibleSectionKey(last);
        return;
      }

      let current: string | null = null;
      for (const el of els) {
        const top = el.getBoundingClientRect().top - containerRect.top;
        if (top <= 80) {
          current = (el as HTMLElement).dataset.sectionKey ?? null;
        }
      }

      if (!current) {
        current = (els[0] as HTMLElement).dataset.sectionKey ?? null;
      }

      if (current) setVisibleSectionKey(current);
    }

    function handleScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          updateActiveSection();
          ticking = false;
        });
      }
    }

    updateActiveSection();
    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [proposal]);

  function handleRolePicked(role: Role) {
    skipNextQuipRef.current = true;
    lastSeenMessageId.current = null;
    setCurrentRole(role);
    setRoleChosen(true);
    const url = new URL(window.location.href);
    url.searchParams.set("as", role);
    router.replace(url.pathname + url.search);
  }

  const onBeforeMutate = useCallback(() => {
    pollGraceRef.current = Date.now() + 2000;
  }, []);

  const fetchProposal = useCallback(async () => {
    const thisId = ++fetchIdRef.current;
    try {
      const res = await fetch(`/api/proposals/${id}?t=${token}`);
      if (!res.ok || thisId !== fetchIdRef.current) return;
      const data: Proposal = await res.json();
      if (thisId !== fetchIdRef.current) return;
      setProposal(data);

      // Detect new Andy messages for the current role
      if (data.andyMessages?.length > 0) {
        const myMessages = data.andyMessages.filter((m: AndyMessage) =>
          m.forRoles.includes(currentRole)
        );
        if (myMessages.length > 0) {
          const latest = myMessages[myMessages.length - 1];
          if (latest.id !== lastSeenMessageId.current) {
            lastSeenMessageId.current = latest.id;
            if (!skipNextQuipRef.current) {
              setLatestAndyQuip({ msg: latest.message, key: Date.now() });
            }
            skipNextQuipRef.current = false;
          }
        }
      }
    } catch {
      /* ignore */
    } finally {
      if (thisId === fetchIdRef.current) setLoading(false);
    }
  }, [id, token, currentRole]);

  useEffect(() => {
    fetchProposal();
  }, [fetchProposal]);

  const onMutationComplete = useCallback(async () => {
    pollGraceRef.current = 0;
    await fetchProposal();
  }, [fetchProposal]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() >= pollGraceRef.current) fetchProposal();
    }, questionsLoading ? 1500 : 3000);
    return () => clearInterval(interval);
  }, [fetchProposal, questionsLoading]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
          <p className="text-sm text-muted-foreground">
            Artifact is drafting the spec and identifying what&apos;s missing…
          </p>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">
          Proposal not found or invalid token.
        </p>
      </div>
    );
  }

  const processingPhase = proposal.prdJson.sections
    .find(s => s.generationStatus && s.generationStatus !== "idle")
    ?.generationStatus ?? null;

  const myAndyMessages = proposal.andyMessages?.filter((m) =>
    m.forRoles.includes(currentRole)
  ) ?? [];

  return (
    <div className="relative h-screen bg-background overflow-hidden">
      <TopBar
        proposal={proposal}
        currentRole={currentRole}
        token={token}
        draftedRoles={draftedRoles}
        onRoleChange={(r) => {
          skipNextQuipRef.current = true;
          lastSeenMessageId.current = null;
          setCurrentRole(r);
        }}
      />

      <SectionNav
        sections={proposal.prdJson.sections}
        onSectionSelect={scrollToSection}
        visibleSectionKey={visibleSectionKey}
      />

      <div className="h-full overflow-hidden">
        <div ref={docPanelRef} className="mx-auto h-full max-w-3xl overflow-y-auto hide-scrollbar px-8 pt-20 pb-6 lg:px-12" data-tour="prd-document">
          <PrdDocument
            proposal={proposal}
            currentRole={currentRole}
            onUpdate={fetchProposal}
            onBeforeMutate={onBeforeMutate}
            onMutationComplete={onMutationComplete}
            token={token}
            activeBlockId={activeBlockId}
            onBlockSelect={setActiveBlockId}
            andyMessages={myAndyMessages}
            questionsLoading={questionsLoading}
            onEditResult={(approved, reason) => {
              const msg = approved
                ? pickRandom(APPROVED_QUIPS)
                : pickRandom(REJECTED_QUIPS).replace("%s", reason.toLowerCase());
              setEditResultQuip({ msg, key: Date.now() });
            }}
          />
        </div>

      </div>

      <RolePickerDialog
        open={!roleChosen}
        excludeRole={fromRole}
        draftedRoles={draftedRoles}
        onSelectRole={handleRolePicked}
      />

      <ChatBot
        proposal={proposal}
        currentRole={currentRole}
        token={token}
        processingPhase={processingPhase}
        editResultQuip={editResultQuip}
        latestAndyMessage={latestAndyQuip}
      />

      <div className="fixed bottom-6 left-6 z-50">
        <GuidedTour questionsLoaded={!isNew || questionsLoaded} />
      </div>
    </div>
  );
}
