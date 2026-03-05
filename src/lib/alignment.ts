import { PrdJson, AuditJson, Thread, Decision } from "./types";
import { SCORE_THRESHOLD_READY, SCORE_THRESHOLD_REVIEW } from "./roles";

export function computeAlignmentScore(
  prdJson: PrdJson,
  threads: Thread[],
  decisions: Decision[],
  claudeAudit?: AuditJson | null
): number {
  let score = 0;
  const sections = prdJson.sections;
  const totalSections = sections.length || 1;

  // --- Section draft progress (0-30 pts) ---
  // Scaffold content (initial generation) = 30% credit.
  // Full credit only after a first draft has been written from answers (questionRound >= 1).
  const perSection = 30 / totalSections;
  for (const section of sections) {
    const hasContent = section.blocks.some((b) => b.type === "content" && b.text.trim().length > 0);
    const isGenerating =
      section.generationStatus === "generating" ||
      section.generationStatus === "evaluating";
    const hasDraftedFromAnswers = (section.questionRound ?? 0) >= 1;

    if (hasDraftedFromAnswers && hasContent) {
      score += perSection;
    } else if (hasContent) {
      score += perSection * 0.3;
    } else if (isGenerating) {
      score += perSection * 0.15;
    }
  }

  // --- Question completion (0-50 pts) ---
  let totalQuestions = 0;
  let answeredQuestions = 0;
  for (const section of sections) {
    for (const block of section.blocks) {
      if (block.type === "question") {
        totalQuestions++;
        if (block.status === "answered") answeredQuestions++;
      }
    }
  }
  if (totalQuestions > 0) {
    score += (answeredQuestions / totalQuestions) * 50;
  }

  // --- Audit quality bonus (0-20 pts) ---
  if (claudeAudit) {
    let auditBonus = 20;
    for (const blocker of claudeAudit.blockers) {
      if (blocker.severity === "high") auditBonus -= 6;
      else if (blocker.severity === "medium") auditBonus -= 3;
      else auditBonus -= 1;
    }
    score += Math.max(0, auditBonus);
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function deriveStatus(
  alignmentScore: number,
  prdJson: PrdJson,
  threads: Thread[]
): string {
  const hasOpenHighBlockers = prdJson.sections.some((s) =>
    s.blocks.some(
      (b) =>
        b.type === "question" &&
        b.status === "open" &&
        b.severity === "high"
    )
  );
  const hasUnresolvedContradictions = threads.some(
    (t) => t.status === "open" && !t.isSuggested && t.messages.length > 1
  );

  if (alignmentScore >= SCORE_THRESHOLD_READY) return "Ready";
  if (hasOpenHighBlockers || hasUnresolvedContradictions) return "Stuck";
  if (threads.length > 0 || alignmentScore > SCORE_THRESHOLD_REVIEW) return "In Review";
  return "Draft";
}
