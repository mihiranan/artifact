"use client";

import { Proposal, Role, Block, Section, Thread, QuestionBlock as QuestionBlockType, AndyMessage } from "@/lib/types";
import { ContentBlock } from "./content-block";
import { QuestionBlock } from "./question-block";
import { ThreadBubble } from "./thread-bubble";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ROLE_STYLE } from "@/lib/roles";
import { TickingLogo } from "@/components/ticking-logo";
import { AndyFace } from "@/components/andy-face";

function questionBelongsToRole(block: QuestionBlockType, role: Role): boolean {
  return block.suggestedRole === role || block.assignedRole === role;
}

function canAnswerQuestion(block: QuestionBlockType, role: Role): boolean {
  if (block.assignedRole) return block.assignedRole === role;
  return block.suggestedRole === role;
}

function effectiveRole(block: QuestionBlockType): Role {
  return block.assignedRole || block.suggestedRole;
}

function QuestionSkeleton() {
  return (
    <div className="grid grid-cols-[1fr_72px] py-1">
      <div className="min-w-0 py-1">
        <div className="my-1 overflow-hidden rounded-2xl border border-dashed border-muted-foreground/12">
          <div className="animate-pulse px-4 py-3.5">
            <div className="mb-2.5 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-muted-foreground/10" />
              <div className="h-2.5 w-16 rounded-full bg-muted-foreground/8" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-[85%] rounded bg-muted-foreground/6" />
              <div className="h-3 w-[60%] rounded bg-muted-foreground/4" />
            </div>
          </div>
        </div>
      </div>
      <div />
    </div>
  );
}

interface PrdDocumentProps {
  proposal: Proposal;
  currentRole: Role;
  onUpdate: () => void | Promise<void>;
  onBeforeMutate?: () => void;
  onMutationComplete?: () => void | Promise<void>;
  token: string;
  activeBlockId: string | null;
  onBlockSelect: (id: string | null) => void;
  andyMessages?: AndyMessage[];
  onEditResult?: (approved: boolean, reason: string) => void;
  questionsLoading?: boolean;
}

export function PrdDocument({
  proposal,
  currentRole,
  onUpdate,
  onBeforeMutate,
  onMutationComplete,
  token,
  activeBlockId,
  onBlockSelect,
  andyMessages = [],
  onEditResult,
  questionsLoading,
}: PrdDocumentProps) {
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { prdJson, threads } = proposal;

  const sections = prdJson.sections;

  useEffect(() => {
    if (activeBlockId && blockRefs.current[activeBlockId]) {
      blockRefs.current[activeBlockId]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeBlockId]);

  const threadsByBlock = useMemo(() => {
    const map = new Map<string, Thread[]>();
    for (const t of threads) {
      const arr = map.get(t.blockId) || [];
      arr.push(t);
      map.set(t.blockId, arr);
    }
    return map;
  }, [threads]);

  function threadsForBlock(blockId: string): Thread[] {
    return threadsByBlock.get(blockId) || [];
  }

  return (
    <div className="mx-auto max-w-[680px]">
      {sections.map((section) => (
        <SectionRenderer
          key={section.key}
          section={section}
          proposal={proposal}
          currentRole={currentRole}
          onUpdate={onUpdate}
          onBeforeMutate={onBeforeMutate}
          onMutationComplete={onMutationComplete}
          token={token}
          activeBlockId={activeBlockId}
          onBlockSelect={onBlockSelect}
          blockRefs={blockRefs}
          threadsForBlock={threadsForBlock}
          andyMessages={andyMessages.filter((m) => m.sectionKey === section.key)}
          onEditResult={onEditResult}
          questionsLoading={questionsLoading}
        />
      ))}
    </div>
  );
}

function SectionRenderer({
  section,
  proposal,
  currentRole,
  onUpdate,
  onBeforeMutate,
  onMutationComplete,
  token,
  activeBlockId,
  onBlockSelect,
  blockRefs,
  threadsForBlock,
  andyMessages,
  onEditResult,
  questionsLoading,
}: {
  section: Section;
  proposal: Proposal;
  currentRole: Role;
  onUpdate: () => void | Promise<void>;
  onBeforeMutate?: () => void;
  onMutationComplete?: () => void | Promise<void>;
  token: string;
  activeBlockId: string | null;
  onBlockSelect: (id: string | null) => void;
  blockRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  threadsForBlock: (blockId: string) => Thread[];
  andyMessages: AndyMessage[];
  onEditResult?: (approved: boolean, reason: string) => void;
  questionsLoading?: boolean;
}) {
  const hasQuestions = section.blocks.some((b) => b.type === "question");
  const isProcessing = !!section.generationStatus && section.generationStatus !== "idle";
  const allQuestionsAnswered = hasQuestions && section.blocks.filter((b) => b.type === "question").every((b) => b.status === "answered");
  const isSectionComplete = allQuestionsAnswered && (section.questionRound ?? 0) >= 1 && !isProcessing;

  const contentBlocks = isProcessing
    ? []
    : section.blocks.filter((b) => b.type === "content");
  const allQuestionBlocks = section.blocks.filter((b) => b.type === "question") as QuestionBlockType[];
  const questionBlocks = allQuestionBlocks.filter(
    (b) => b.status === "answered" || questionBelongsToRole(b, currentRole)
  );
  const answeredQuestions = questionBlocks.filter((b) => b.status === "answered");
  const openQuestions = questionBlocks.filter((b) => b.status !== "answered");
  const roundDone = allQuestionsAnswered || isProcessing || (section.questionRound ?? 0) >= 1;
  const hasNewBatch = !isProcessing && (section.questionRound ?? 0) >= 1 && answeredQuestions.length > 0 && openQuestions.length > 0;

  const otherRoleQuestions = allQuestionBlocks.filter(
    (b) => b.status !== "answered" && !questionBelongsToRole(b, currentRole)
  );
  const otherRoleCounts: Record<string, number> = {};
  for (const q of otherRoleQuestions) {
    const role = effectiveRole(q);
    otherRoleCounts[role] = (otherRoleCounts[role] || 0) + 1;
  }
  const otherRoleEntries = Object.entries(otherRoleCounts);

  return (
    <section className="mb-8 relative scroll-mt-24" data-section-key={section.key}>
      <h2 className="mb-3 flex items-center gap-3 text-xl font-bold uppercase tracking-tight text-foreground">
        {isProcessing ? (
          <TickingLogo className="h-6 w-6" />
        ) : (
          <img src="/artifact-logo.svg" alt="" className="h-6 w-6" />
        )}
        {section.title}
        {isSectionComplete && (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        )}
      </h2>


      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 -m-2 rounded-lg"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.12), transparent)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.8s ease-in-out infinite",
            }}
          />
        )}
      </AnimatePresence>


      <div>
            <AnimatePresence mode="popLayout" initial={false}>
              {contentBlocks.map((block, index) => (
                <motion.div
                  key={block.id}
                  initial={{ opacity: 0, y: 16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    delay: index * 0.05,
                  }}
                >
                  <BlockRow
                    block={block}
                    proposal={proposal}
                    currentRole={currentRole}
                    onUpdate={onUpdate}
                    token={token}
                    isActive={activeBlockId === block.id}
                    onBlockSelect={onBlockSelect}
                    blockRef={(el) => {
                      blockRefs.current[block.id] = el;
                    }}
                    threads={threadsForBlock(block.id)}
                    onEditResult={onEditResult}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {questionsLoading && allQuestionBlocks.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="mt-2"
              >
                <QuestionSkeleton />
                <QuestionSkeleton />
              </motion.div>
            )}

            {(questionBlocks.length > 0 || otherRoleEntries.length > 0) && (
              <div className="mt-2">

                {/* Answered questions — compact badge once a round is done */}
                {roundDone && answeredQuestions.length > 0 ? (
                  <CompletedQuestionsBadge
                    answeredQuestions={answeredQuestions}
                    proposal={proposal}
                    currentRole={currentRole}
                    onUpdate={onUpdate}
                    token={token}
                    activeBlockId={activeBlockId}
                    onBlockSelect={onBlockSelect}
                    blockRefs={blockRefs}
                    threadsForBlock={threadsForBlock}
                    onEditResult={onEditResult}
                  />
                ) : (
                  <AnimatePresence mode="popLayout" initial={false}>
                    {answeredQuestions.map((block, index) => (
                      <motion.div
                        key={block.id}
                        initial={{ opacity: 0, y: 16, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 30,
                          delay: index * 0.05,
                        }}
                      >
                        <BlockRow
                          block={block}
                          proposal={proposal}
                          currentRole={currentRole}
                          onUpdate={onUpdate}
                          token={token}
                          isActive={activeBlockId === block.id}
                          onBlockSelect={onBlockSelect}
                          blockRef={(el) => {
                            blockRefs.current[block.id] = el;
                          }}
                          threads={threadsForBlock(block.id)}
                          onEditResult={onEditResult}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}

                {/* New batch divider */}
                {hasNewBatch && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="my-3 flex items-center gap-3"
                  >
                    <div className="h-px flex-1 bg-amber-500/20" />
                    <span className="shrink-0 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                      Needs more alignment
                    </span>
                    <div className="h-px flex-1 bg-amber-500/20" />
                  </motion.div>
                )}

                {/* Open questions */}
                <AnimatePresence mode="popLayout" initial={false}>
                  {openQuestions.map((block, index) => (
                    <motion.div
                      key={block.id}
                      initial={{ opacity: 0, y: 16, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                        delay: index * 0.05,
                      }}
                    >
                      <BlockRow
                        block={block}
                        proposal={proposal}
                        currentRole={currentRole}
                        onUpdate={onUpdate}
                        onBeforeMutate={onBeforeMutate}
                        onMutationComplete={onMutationComplete}
                        token={token}
                        isActive={activeBlockId === block.id}
                        onBlockSelect={onBlockSelect}
                        blockRef={(el) => {
                          blockRefs.current[block.id] = el;
                        }}
                        threads={threadsForBlock(block.id)}
                        readOnly={!canAnswerQuestion(block, currentRole)}
                        onEditResult={onEditResult}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Other roles' questions */}
                {otherRoleEntries.length > 0 && (
                  <OtherRoleQuestions
                    otherRoleEntries={otherRoleEntries}
                    otherRoleQuestions={otherRoleQuestions}
                    proposal={proposal}
                    currentRole={currentRole}
                    onUpdate={onUpdate}
                    token={token}
                    activeBlockId={activeBlockId}
                    onBlockSelect={onBlockSelect}
                    blockRefs={blockRefs}
                    threadsForBlock={threadsForBlock}
                    onEditResult={onEditResult}
                  />
                )}
              </div>
            )}

            {andyMessages.length > 0 && (
              <SectionActivity messages={andyMessages} />
            )}
      </div>
    </section>
  );
}

function CompletedQuestionsBadge({
  answeredQuestions,
  proposal,
  currentRole,
  onUpdate,
  token,
  activeBlockId,
  onBlockSelect,
  blockRefs,
  threadsForBlock,
  onEditResult,
}: {
  answeredQuestions: QuestionBlockType[];
  proposal: Proposal;
  currentRole: Role;
  onUpdate: () => void | Promise<void>;
  token: string;
  activeBlockId: string | null;
  onBlockSelect: (id: string | null) => void;
  blockRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  threadsForBlock: (blockId: string) => Thread[];
  onEditResult?: (approved: boolean, reason: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const count = answeredQuestions.length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="my-1.5"
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        className="group flex items-center gap-2 py-1"
      >
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-semibold text-emerald-500">
          {count}
        </span>
        <span className="text-[12px] text-muted-foreground/50 group-hover:text-muted-foreground/70 transition-colors">
          questions resolved
        </span>
        <motion.svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground/30"
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <polyline points="6 9 12 15 18 9" />
        </motion.svg>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            {answeredQuestions.map((block) => (
              <BlockRow
                key={block.id}
                block={block}
                proposal={proposal}
                currentRole={currentRole}
                onUpdate={onUpdate}
                token={token}
                isActive={activeBlockId === block.id}
                onBlockSelect={onBlockSelect}
                blockRef={(el) => {
                  blockRefs.current[block.id] = el;
                }}
                threads={threadsForBlock(block.id)}
                onEditResult={onEditResult}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SectionActivity({ messages }: { messages: AndyMessage[] }) {
  const latest = messages[messages.length - 1];
  if (!latest) return null;

  return (
    <motion.div
      key={latest.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="mt-2 flex items-center gap-1.5"
    >
      <AndyFace size={18} className="shrink-0 text-muted-foreground/30" />
      <span className="text-[11px] text-muted-foreground/40 italic">{latest.message}</span>
    </motion.div>
  );
}

function OtherRoleQuestions({
  otherRoleEntries,
  otherRoleQuestions,
  proposal,
  currentRole,
  onUpdate,
  token,
  activeBlockId,
  onBlockSelect,
  blockRefs,
  threadsForBlock,
  onEditResult,
}: {
  otherRoleEntries: [string, number][];
  otherRoleQuestions: QuestionBlockType[];
  proposal: Proposal;
  currentRole: Role;
  onUpdate: () => void | Promise<void>;
  token: string;
  activeBlockId: string | null;
  onBlockSelect: (id: string | null) => void;
  blockRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  threadsForBlock: (blockId: string) => Thread[];
  onEditResult?: (approved: boolean, reason: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative my-2 mr-[72px] cursor-pointer select-none overflow-hidden rounded-2xl"
      style={{
        background: "linear-gradient(135deg, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0.01) 50%, transparent 100%)",
        border: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors"
      >
        <span className="text-[12px] text-foreground/45">
          Waiting on
        </span>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {otherRoleEntries.map(([role, count]) => (
            <span
              key={role}
              className="inline-flex w-28 items-center gap-1.5 text-[12px]"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${ROLE_STYLE[role as Role]?.dot || "bg-muted-foreground"}`} />
              <span className={`font-medium ${ROLE_STYLE[role as Role]?.text || "text-muted-foreground"}`}>
                {role}
              </span>
              <span className="text-foreground/30">
                {count}
              </span>
            </span>
          ))}
        </div>
        <motion.svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-muted-foreground/30"
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <polyline points="6 9 12 15 18 9" />
        </motion.svg>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="expanded-questions"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/10 px-1 py-1">
              {otherRoleQuestions.map((block) => (
                <div key={block.id} className="relative">
                  <BlockRow
                    block={block}
                    proposal={proposal}
                    currentRole={currentRole}
                    onUpdate={onUpdate}
                    token={token}
                    isActive={activeBlockId === block.id}
                    onBlockSelect={onBlockSelect}
                    blockRef={(el) => {
                      blockRefs.current[block.id] = el;
                    }}
                    threads={threadsForBlock(block.id)}
                    readOnly
                    hideThread
                    onEditResult={onEditResult}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function BlockRow({
  block,
  proposal,
  currentRole,
  onUpdate,
  onBeforeMutate,
  onMutationComplete,
  token,
  isActive,
  onBlockSelect,
  blockRef,
  threads,
  readOnly,
  hideThread,
  onEditResult,
}: {
  block: Block;
  proposal: Proposal;
  currentRole: Role;
  onUpdate: () => void | Promise<void>;
  onBeforeMutate?: () => void;
  onMutationComplete?: () => void | Promise<void>;
  token: string;
  isActive: boolean;
  onBlockSelect: (id: string | null) => void;
  blockRef: (el: HTMLDivElement | null) => void;
  threads: Thread[];
  readOnly?: boolean;
  hideThread?: boolean;
  onEditResult?: (approved: boolean, reason: string) => void;
}) {
  const isUnansweredQuestion = block.type === "question" && block.status !== "answered";

  return (
    <div
      ref={blockRef}
      data-tour={isUnansweredQuestion ? "question-block" : undefined}
      className={`group relative transition-colors ${
        hideThread ? "" : "grid grid-cols-[1fr_72px]"
      } ${isActive ? "bg-accent/40 rounded-lg" : ""}`}
    >
      <div className="min-w-0 py-1">
        {block.type === "content" ? (
          <ContentBlock
            block={block}
            proposalId={proposal.id}
            token={token}
            onUpdate={onUpdate}
            onEditResult={onEditResult}
          />
        ) : (
          <QuestionBlock
            block={block}
            proposalId={proposal.id}
            currentRole={currentRole}
            onUpdate={onMutationComplete || onUpdate}
            onBeforeMutate={onBeforeMutate}
            token={token}
            readOnly={readOnly}
          />
        )}
      </div>
      {!hideThread && (
        <div className="flex items-start justify-center pt-2">
          <ThreadBubble
            blockId={block.id}
            threads={threads}
            proposalId={proposal.id}
            currentRole={currentRole}
            onUpdate={onUpdate}
            token={token}
            onBlockSelect={onBlockSelect}
          />
        </div>
      )}
    </div>
  );
}
