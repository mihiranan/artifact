import { callClaude, extractJson } from "./client";
import { alignmentAuditSchema } from "./schemas";
import { PrdJson, AuditJson, Thread, Decision } from "../types";

export async function runAlignmentAudit(
  prdJson: PrdJson,
  threads: Thread[],
  decisions: Decision[]
): Promise<AuditJson> {
  const prompt = `Analyze this artifact for alignment across stakeholder roles. Assess coverage, contradictions, and decision closure.

Artifact:
${JSON.stringify(prdJson, null, 2)}

Threads (inline comments):
${JSON.stringify(
  threads.map((t) => ({
    id: t.id,
    blockId: t.blockId,
    role: t.role,
    status: t.status,
    isSuggested: t.isSuggested,
    messages: t.messages.map((m) => ({ author: m.author, body: m.body })),
  })),
  null,
  2
)}

Decisions:
${JSON.stringify(decisions, null, 2)}

Return JSON matching this exact schema:
{
  "alignmentScore": number (0-100),
  "coverage": number (0-100, percentage of sections with meaningful input from relevant roles),
  "contradictions": number (count of contradictory positions found),
  "decisionClosure": number (0-100, percentage of key decisions that are explicitly resolved),
  "blockers": [
    {
      "id": "string (unique)",
      "title": "string (one-line description)",
      "severity": "high|medium|low",
      "rolesInvolved": ["string"],
      "evidence": ["string (thread IDs or block IDs that demonstrate the issue)"],
      "recommendedFix": "patch|meeting",
      "fixDetail": "string (specific recommended action)"
    }
  ] (max 6 blockers, ordered by severity)
}

Score guidelines:
- Subtract for: open high-severity questions, missing role participation, unresolved contradictions, no decisions on key tradeoffs
- Add for: answered questions, resolved threads, explicit decisions, multi-role participation`;

  return callClaude(prompt, (text) => {
    return alignmentAuditSchema.parse(
      JSON.parse(extractJson(text))
    ) as AuditJson;
  });
}
