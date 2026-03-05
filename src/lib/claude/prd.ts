import { callClaude, extractJson } from "./client";
import {
  generatePrdStructureSchema,
  generateQuestionsResultSchema,
} from "./schemas";
import { PrdJson, QuestionBlock, Role } from "../types";

export const MAX_SECTIONS = 12;
export const MAX_QUESTIONS_PER_ROLE = 2;

/**
 * Phase 1: generate title + sections with content blocks only (role-independent).
 * Question blocks are NOT generated here — that happens in generatePrdQuestions.
 */
export async function generatePrdStructure(rawRequest: string): Promise<{
  title: string;
  prdJson: PrdJson;
}> {
  const prompt = `Generate a structured artifact from the following messy request. Fill sections you can confidently draft with content blocks only. Do NOT include any question blocks — those will be generated in a separate step once the stakeholder roles are confirmed.

Request:
"""
${rawRequest}
"""

Generate the sections that are most relevant to this request. Choose appropriate section keys and titles based on the content. You may use up to ${MAX_SECTIONS} sections maximum. Use short, lowercase, underscore-separated keys (e.g. "problem", "goals", "tech_architecture", "pricing_model"). Pick sections that best fit the request — do not force a fixed template.

For each section:
- Include at least one content block with drafted text based on the request
- Use **bold** (double asterisks) sparingly to emphasize genuinely important phrases — key decisions, critical constraints, specific metrics/targets, and non-obvious conclusions. Do NOT bold proper nouns, product names, company names, or generic terms just because they are nouns. A bolded phrase should make a reader stop and pay attention. Do not use ==highlight== markers or any other markdown in the initial draft.
- Draft as much as you can from the information given. Where details are unclear, write what you can infer and note gaps in the prose — the question blocks will be added later to address those gaps.

Block ID format: <sectionKey>-001, <sectionKey>-002, etc.

Return JSON matching this exact schema:
{
  "title": "string - concise proposal title",
  "prdJson": {
    "sections": [
      {
        "key": "string (short lowercase underscore-separated identifier)",
        "title": "string (human-readable section heading)",
        "blocks": [
          { "id": "string", "type": "content", "text": "string" }
        ]
      }
    ]
  }
}`;

  return callClaude(prompt, (text) => {
    const parsed = generatePrdStructureSchema.parse(
      JSON.parse(extractJson(text))
    );
    return {
      title: parsed.title,
      prdJson: parsed.prdJson as PrdJson,
    };
  });
}

/**
 * Phase 2: given an existing content-only PRD and selected roles,
 * generate role-specific question blocks for each section.
 */
export async function generatePrdQuestions(
  prdJson: PrdJson,
  roles: Role[]
): Promise<PrdJson> {
  const rolesStr = roles.join(", ");
  const sectionsContext = prdJson.sections
    .map(
      (s) =>
        `## ${s.title} (key: "${s.key}")\n${s.blocks.map((b) => (b.type === "content" ? b.text : "")).join("\n")}`
    )
    .join("\n\n");

  const prompt = `You are given an existing artifact with drafted content. Generate question blocks for each section to expose missing information and route it to the right stakeholders.

Selected roles for this artifact: ${rolesStr}

IMPORTANT: Only generate questions for these roles. Do NOT assign questions to any role not in the list above.

Existing artifact sections:
"""
${sectionsContext}
"""

For each section, generate question blocks where information is missing or ambiguous:
- Generate at most ${MAX_QUESTIONS_PER_ROLE} questions per role per section. Prioritize high-severity gaps.
- Each question must have a suggestedRole (one of: ${rolesStr}) and severity (high/medium/low)
- Questions MUST be specific and actionable — reference concrete details from the content. Never ask vague questions like "What are the goals?" or "What metrics matter?". Instead ask things like "What's the target activation rate for new users in the first 7 days?" or "Should the search index use Elasticsearch or Postgres full-text — what's the expected corpus size?"
- Tailor each question to the expertise of the assigned role. A Product question should ask about business trade-offs and metrics. An Engineering question should ask about architecture and technical constraints. A Data question should ask about instrumentation and experiment design. Match the depth and vocabulary to what that role actually decides.

Question block ID format: <sectionKey>-q01, <sectionKey>-q02, etc.

Return JSON matching this exact schema:
{
  "sections": [
    {
      "key": "string (must match an existing section key)",
      "questions": [
        { "id": "string", "type": "question", "prompt": "string", "suggestedRole": "Role", "status": "open", "severity": "high|medium|low", "answer": null, "assignedRole": null }
      ]
    }
  ]
}`;

  const result = await callClaude(prompt, (text) =>
    generateQuestionsResultSchema.parse(JSON.parse(extractJson(text)))
  );

  const questionsBySection = new Map(
    result.sections.map((s) => [s.key, s.questions])
  );

  const mergedSections = prdJson.sections.map((section) => {
    const questions = questionsBySection.get(section.key) || [];
    const capped = capQuestionsPerRole(questions as QuestionBlock[]);
    return {
      ...section,
      blocks: [...section.blocks, ...capped],
    };
  });

  return { sections: mergedSections };
}

export function capQuestionsPerRole(questions: QuestionBlock[]): QuestionBlock[] {
  return questions.reduce<QuestionBlock[]>((acc, q) => {
    const count = acc.filter((x) => x.suggestedRole === q.suggestedRole).length;
    if (count < MAX_QUESTIONS_PER_ROLE) acc.push(q);
    return acc;
  }, []);
}

