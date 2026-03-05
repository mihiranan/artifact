import { callClaude, extractJson } from "./client";
import {
  sectionPatchSchema,
  firstDraftSchema,
  evaluationSchema,
} from "./schemas";
import { Section, Block, ContentBlock, QuestionBlock } from "../types";
import { capQuestionsPerRole } from "./prd";

export const MAX_FOLLOW_UP_ROUNDS = 1;

export async function generateFirstDraft(
  section: Section,
  allAnswers: string
): Promise<{ sectionKey: string; contentBlocks: ContentBlock[]; changelog: string }> {
  const contentBlocks = section.blocks.filter((b) => b.type === "content");
  const answeredBlocks = section.blocks.filter(
    (b) => b.type === "question" && b.status === "answered"
  ) as QuestionBlock[];

  const prompt = `All roles have finished answering their questions for this section. Write the definitive first draft.

Section key: ${section.key}
Section title: ${section.title}

Existing content (placeholder from initial generation):
${contentBlocks.map((b) => b.text).join("\n\n")}

All answered questions and their responses:
${answeredBlocks.map((b) => `- [${b.suggestedRole}] ${b.prompt}\n  Answer: "${b.answer}"`).join("\n\n")}

Combined answer text:
"${allAnswers}"

Write polished, specific prose for this section that integrates ALL the answers. Do not use generic filler — ground everything in the actual answers provided. The content should read as a professional product specification section.

Formatting rules:
- Use **bold** (double asterisks) sparingly to emphasize genuinely important phrases — key decisions, critical constraints, specific metrics/targets, and non-obvious conclusions. Do NOT bold proper nouns, product names, company names, or generic terms just because they are nouns.
- Use ==highlight== (double equals) to wrap the specific phrases or sentences that were directly shaped by or derived from the answered questions above. This shows stakeholders exactly what their answers contributed. Only highlight text whose substance came from the answers — do not highlight text that was already in the existing content or that you inferred independently.
- Do not use any other markdown.

Return JSON:
{
  "sectionKey": "${section.key}",
  "contentBlocks": [
    { "id": "${section.key}-001", "type": "content", "text": "paragraph text here" }
  ],
  "changelog": "brief description of what was written"
}

You may use multiple content blocks for distinct paragraphs or subsections. Use IDs like ${section.key}-001, ${section.key}-002, etc.`;

  return callClaude(prompt, (text) => {
    const parsed = firstDraftSchema.parse(JSON.parse(extractJson(text)));
    return {
      sectionKey: parsed.sectionKey,
      contentBlocks: parsed.contentBlocks as ContentBlock[],
      changelog: parsed.changelog,
    };
  });
}

export async function evaluateSection(
  section: Section,
  allAnswers: string,
  involvedRoles: string[],
  currentRound: number = 0
): Promise<{ needsMoreQuestions: boolean; questions: QuestionBlock[]; changelog: string }> {
  if (currentRound >= MAX_FOLLOW_UP_ROUNDS) {
    return { needsMoreQuestions: false, questions: [], changelog: "Max follow-up rounds reached." };
  }

  const contentBlocks = section.blocks.filter((b) => b.type === "content");
  const answeredBlocks = section.blocks.filter(
    (b) => b.type === "question" && b.status === "answered"
  ) as QuestionBlock[];

  const rolesStr = involvedRoles.join(", ");

  const roundGuidance = currentRound + 1 >= MAX_FOLLOW_UP_ROUNDS
    ? "This is the LAST allowed follow-up round. Only ask if there are critical, blocking gaps. Prefer returning needsMoreQuestions: false."
    : "Be very selective — only ask about gaps that would block implementation.";

  const prompt = `Evaluate whether this section draft has enough specificity and alignment, or if follow-up questions are needed.

This is follow-up round ${currentRound + 1} of ${MAX_FOLLOW_UP_ROUNDS} maximum. ${roundGuidance}

Section key: ${section.key}
Section title: ${section.title}

Current draft content:
${contentBlocks.map((b) => b.text).join("\n\n")}

Questions that were answered to produce this draft:
${answeredBlocks.map((b) => `- [${b.suggestedRole}] ${b.prompt}\n  Answer: "${b.answer}"`).join("\n\n")}

Evaluate: Does this section have enough concrete detail to be actionable? Look for:
- Missing numbers, metrics, or targets
- Unclear scope or ambiguous trade-offs
- Decisions that were deferred or left vague
- Gaps that would force implementation guesswork

If the section is solid and specific enough, return needsMoreQuestions: false with an empty questions array.

If gaps exist, return needsMoreQuestions: true with specific, actionable follow-up questions targeting the right roles. Each question should address a concrete gap. Generate at most 2 questions per role.

IMPORTANT: Only generate questions for these roles that are involved in this section: ${rolesStr}. Do NOT assign questions to any other roles.

Return JSON:
{
  "needsMoreQuestions": true/false,
  "questions": [
    { "id": "${section.key}-q50", "type": "question", "prompt": "specific question", "suggestedRole": "Role", "status": "open", "severity": "medium", "answer": null, "assignedRole": null }
  ],
  "changelog": "brief evaluation summary"
}

Use question IDs starting at ${section.key}-q50. Only use roles from this list: ${rolesStr}.`;

  return callClaude(prompt, (text) => {
    const parsed = evaluationSchema.parse(JSON.parse(extractJson(text)));
    return {
      needsMoreQuestions: parsed.needsMoreQuestions,
      questions: capQuestionsPerRole(parsed.questions as QuestionBlock[]),
      changelog: parsed.changelog,
    };
  });
}

/** @deprecated Use generateFirstDraft + evaluateSection instead. Kept for /patch chatbot route. */
export async function generateSectionPatch(
  section: Section,
  roleAnswers: string,
  actingRole: string
): Promise<{ sectionKey: string; updatedBlocks: Block[]; changelog: string }> {
  const contentBlocks = section.blocks.filter((b) => b.type === "content");

  const prompt = `Update this section based on the provided intent/answers.

Section key: ${section.key}
Section title: ${section.title}

Existing content:
${contentBlocks.map((b) => b.text).join("\n\n")}

Intent from ${actingRole}:
"${roleAnswers}"

Rewrite the content blocks to integrate the intent. Return only content blocks.

Formatting rules:
- Use **bold** (double asterisks) sparingly to emphasize genuinely important phrases — key decisions, critical constraints, specific metrics/targets, and non-obvious conclusions. Do NOT bold proper nouns, product names, company names, or generic terms just because they are nouns.
- Use ==highlight== (double equals) to wrap the specific phrases or sentences that were directly shaped by the intent above. This shows stakeholders exactly what changed. Only highlight text whose substance came from the new intent — do not highlight text that was already in the existing content.
- Do not use any other markdown.

Return JSON:
{
  "sectionKey": "${section.key}",
  "updatedBlocks": [
    { "id": "string", "type": "content", "text": "string" }
  ],
  "changelog": "brief description"
}`;

  return callClaude(prompt, (text) => {
    const parsed = sectionPatchSchema.parse(JSON.parse(extractJson(text)));
    return {
      sectionKey: parsed.sectionKey,
      updatedBlocks: parsed.updatedBlocks as Block[],
      changelog: parsed.changelog,
    };
  });
}
