import { NextRequest, NextResponse } from "next/server";
import {
  getProposal,
  updateProposalPrd,
  createAndyMessage,
} from "@/lib/proposals";
import { PrdJson, QuestionBlock, Role, ROLES, Section } from "@/lib/types";
import {
  generateFirstDraft,
  evaluateSection,
  MAX_FOLLOW_UP_ROUNDS,
} from "@/lib/claude/patch";
import { runAlignmentAudit } from "@/lib/claude/audit";
import { computeAlignmentScore, deriveStatus } from "@/lib/alignment";
import { withAuth } from "@/lib/api-helpers";

const ROLE_PATTERN =
  /^for\s+(product|engineering|design|data|legal|support):\s*/i;

function getInvolvedRoles(section: Section): string[] {
  const roles = new Set<string>();
  for (const b of section.blocks) {
    if (b.type === "question") {
      roles.add(b.suggestedRole);
      if (b.assignedRole) roles.add(b.assignedRole);
    }
  }
  return [...roles];
}

function belongsToRole(b: QuestionBlock, role: string): boolean {
  return (
    b.assignedRole === role || (!b.assignedRole && b.suggestedRole === role)
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; blockId: string }> }
) {
  return withAuth(request, params, async (proposal, id, token) => {
    const { blockId } = await params;
    const { text, actingRole } = await request.json();
    if (!text) {
      return NextResponse.json(
        { error: "text is required" },
        { status: 400 }
      );
    }

    const prdJson: PrdJson = { ...proposal.prdJson };
    let targetSection: Section | null = null;
    let targetBlock: QuestionBlock | null = null;

    for (const section of prdJson.sections) {
      for (const block of section.blocks) {
        if (block.id === blockId && block.type === "question") {
          targetBlock = block;
          targetSection = section;
          break;
        }
      }
      if (targetBlock) break;
    }

    if (!targetBlock) {
      return NextResponse.json(
        { error: "Block not found" },
        { status: 404 }
      );
    }

    const roleMatch = text.match(ROLE_PATTERN);
    const isAssignment = !!roleMatch;

    if (isAssignment) {
      const targetRole =
        ROLES.find((r) => r.toLowerCase() === roleMatch[1].toLowerCase()) ||
        actingRole;
      targetBlock.status = "assigned";
      targetBlock.assignedRole = targetRole as Role;
      targetBlock.refractedFrom =
        (actingRole as Role) || targetBlock.suggestedRole;

      await updateProposalPrd(id, prdJson);

      if (targetSection) {
        const truncatedPrompt =
          targetBlock.prompt.length > 80
            ? targetBlock.prompt.slice(0, 80) + "…"
            : targetBlock.prompt;
        await createAndyMessage({
          proposalId: id,
          sectionKey: targetSection.key,
          message: `${actingRole} assigned you a question in ${targetSection.title}: "${truncatedPrompt}"`,
          type: "role_update",
          forRoles: [targetRole],
        });
      }

      const updated = await getProposal(id, token);
      return NextResponse.json(updated);
    }

    // --- Answer flow ---
    targetBlock.status = "answered";
    targetBlock.answer = text;

    const earlyScoreRaw = computeAlignmentScore(
      prdJson,
      proposal.threads,
      proposal.decisions,
      proposal.lastAuditJson
    );
    const earlyScore = Math.max(earlyScoreRaw, proposal.alignmentScore);
    const earlyStatus = deriveStatus(earlyScore, prdJson, proposal.threads);
    await updateProposalPrd(
      id,
      prdJson,
      earlyScore,
      proposal.lastAuditJson,
      earlyStatus
    );

    const involvedRoles = getInvolvedRoles(targetSection!);
    const sectionIdx = prdJson.sections.findIndex(
      (s) => s.key === targetSection!.key
    );

    const remainingForRole = targetSection!.blocks.filter(
      (b) =>
        b.type === "question" &&
        b.id !== blockId &&
        b.status !== "answered" &&
        belongsToRole(b as QuestionBlock, actingRole)
    );

    if (remainingForRole.length === 0) {
      const rolesStillOpen = involvedRoles.filter((role) => {
        if (role === actingRole) return false;
        return targetSection!.blocks.some(
          (b) =>
            b.type === "question" &&
            b.status !== "answered" &&
            belongsToRole(b as QuestionBlock, role)
        );
      });

      if (rolesStillOpen.length > 0) {
        await createAndyMessage({
          proposalId: id,
          sectionKey: targetSection!.key,
          message: `Done with your questions for ${targetSection!.title}. Waiting on ${rolesStillOpen.join(", ")}.`,
          type: "role_update",
          forRoles: [actingRole],
        });

        for (const role of rolesStillOpen) {
          await createAndyMessage({
            proposalId: id,
            sectionKey: targetSection!.key,
            message: `${actingRole} just finished their questions for ${targetSection!.title}. Waiting on your response.`,
            type: "role_update",
            forRoles: [role],
          });
        }

        const alreadyDone = involvedRoles.filter(
          (r) => r !== actingRole && !rolesStillOpen.includes(r)
        );
        if (alreadyDone.length > 0) {
          await createAndyMessage({
            proposalId: id,
            sectionKey: targetSection!.key,
            message: `${actingRole} finished their questions for ${targetSection!.title}. Still waiting on ${rolesStillOpen.join(", ")}.`,
            type: "role_update",
            forRoles: alreadyDone,
          });
        }
      }
    }

    const remainingInSection = targetSection!.blocks.filter(
      (b) => b.type === "question" && b.status !== "answered"
    );

    if (
      remainingInSection.length === 0 &&
      targetSection!.generationStatus !== "generating"
    ) {
      const answeredQuestions = targetSection!.blocks.filter(
        (b) => b.type === "question" && b.status === "answered"
      ) as QuestionBlock[];

      const allAnswers = answeredQuestions
        .map((b) => `[${b.suggestedRole}] ${b.prompt}: ${b.answer}`)
        .join("\n");

      await createAndyMessage({
        proposalId: id,
        sectionKey: targetSection!.key,
        message: `Thanks for your answers. Let me write up a draft of ${targetSection!.title} based on responses from ${involvedRoles.join(" and ")}.`,
        type: "system",
        forRoles: involvedRoles,
      });

      targetSection!.generationStatus = "generating";
      prdJson.sections[sectionIdx] = targetSection!;
      await updateProposalPrd(id, prdJson);

      try {
        const draft = await generateFirstDraft(targetSection!, allAnswers);

        const mergedBlocks = [...answeredQuestions, ...draft.contentBlocks];
        targetSection!.blocks = mergedBlocks;

        const draftScore = computeAlignmentScore(
          prdJson,
          proposal.threads,
          proposal.decisions,
          proposal.lastAuditJson
        );
        const draftStatus = deriveStatus(
          draftScore,
          prdJson,
          proposal.threads
        );

        const currentRound = targetSection!.questionRound ?? 0;

        if (currentRound >= MAX_FOLLOW_UP_ROUNDS) {
          await createAndyMessage({
            proposalId: id,
            sectionKey: targetSection!.key,
            message: `${targetSection!.title} is looking solid. No follow-ups needed.`,
            type: "system",
            forRoles: involvedRoles,
          });
        } else {
          await createAndyMessage({
            proposalId: id,
            sectionKey: targetSection!.key,
            message: `First draft of ${targetSection!.title} is ready. Let me check if we need more alignment or clarification.`,
            type: "system",
            forRoles: involvedRoles,
          });

          targetSection!.generationStatus = "evaluating";
          prdJson.sections[sectionIdx] = targetSection!;
          await updateProposalPrd(
            id,
            prdJson,
            draftScore,
            proposal.lastAuditJson,
            draftStatus
          );

          const evaluation = await evaluateSection(
            targetSection!,
            allAnswers,
            involvedRoles,
            currentRound
          );

          const scopedQuestions = evaluation.questions.filter((q) =>
            involvedRoles.includes(q.suggestedRole as string)
          );

          if (evaluation.needsMoreQuestions && scopedQuestions.length > 0) {
            targetSection!.questionRound = currentRound + 1;
            targetSection!.blocks = [
              ...answeredQuestions,
              ...draft.contentBlocks,
              ...scopedQuestions,
            ];

            const affectedRoles = [
              ...new Set(
                scopedQuestions.map((q) => q.suggestedRole as string)
              ),
            ];
            const unaffectedRoles = involvedRoles.filter(
              (r) => !affectedRoles.includes(r)
            );

            for (const role of affectedRoles) {
              await createAndyMessage({
                proposalId: id,
                sectionKey: targetSection!.key,
                message: `I need a bit more detail from you on ${targetSection!.title}.`,
                type: "role_update",
                forRoles: [role],
              });
            }
            if (unaffectedRoles.length > 0) {
              await createAndyMessage({
                proposalId: id,
                sectionKey: targetSection!.key,
                message: `Asked ${affectedRoles.join(" and ")} a follow-up on ${targetSection!.title}. Hang tight.`,
                type: "role_update",
                forRoles: unaffectedRoles,
              });
            }
          } else {
            targetSection!.questionRound = currentRound + 1;
            await createAndyMessage({
              proposalId: id,
              sectionKey: targetSection!.key,
              message: `${targetSection!.title} is looking solid. No follow-ups needed.`,
              type: "system",
              forRoles: involvedRoles,
            });
          }
        }

        targetSection!.generationStatus = "idle";
        prdJson.sections[sectionIdx] = targetSection!;
        await updateProposalPrd(id, prdJson);
      } catch {
        targetSection!.generationStatus = "idle";
        prdJson.sections[sectionIdx] = targetSection!;
        await updateProposalPrd(id, prdJson);
      }
    }

    // Re-read latest state so the audit save doesn't overwrite concurrent
    // block updates (e.g. another question answered while this handler ran).
    const fresh = await getProposal(id, token);
    if (!fresh) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const freshPrd = fresh.prdJson;
    let auditJson = fresh.lastAuditJson;
    let score = fresh.alignmentScore;
    let status: string = fresh.status;

    try {
      auditJson = await runAlignmentAudit(
        freshPrd,
        fresh.threads,
        fresh.decisions
      );
    } catch {
      /* audit is best-effort */
    }

    const prevScore = fresh.alignmentScore;

    score = computeAlignmentScore(
      freshPrd,
      fresh.threads,
      fresh.decisions,
      auditJson
    );

    score = Math.max(score, prevScore);

    status = deriveStatus(score, freshPrd, fresh.threads);

    const allRoles = [
      ...new Set(freshPrd.sections.flatMap((s) => getInvolvedRoles(s))),
    ];

    if (prevScore < 50 && score >= 50) {
      await createAndyMessage({
        proposalId: id,
        sectionKey: "__global__",
        message: `Halfway there — alignment is at ${score}%. Keep answering and we'll get this locked down.`,
        type: "system",
        forRoles: allRoles,
      });
    }

    if (status === "Ready" && fresh.status !== "Ready") {
      await createAndyMessage({
        proposalId: id,
        sectionKey: "__global__",
        message: `You're ready to go! Alignment hit ${score}% — all sections are solid. Export your artifact from the top-right and take this into your next meeting.`,
        type: "system",
        forRoles: allRoles,
      });
    }

    await updateProposalPrd(
      id,
      freshPrd,
      score,
      auditJson,
      status
    );

    const updated = await getProposal(id, token);
    return NextResponse.json(updated);
  });
}
