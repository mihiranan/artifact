import { callClaude, extractJson } from "./client";
import { roleReviewPackSchema } from "./schemas";
import { PrdJson, Role } from "../types";

export async function generateRoleReviewPack(
  prdJson: PrdJson,
  role: Role
): Promise<{ focusBullets: string[]; suggestedThreads: { blockId: string; body: string }[] }> {
  const allBlockIds = prdJson.sections.flatMap((s) =>
    s.blocks.map((b) => b.id)
  );

  const prompt = `Generate a role-specific review pack for the "${role}" role reviewing this artifact.

Artifact:
${JSON.stringify(prdJson, null, 2)}

Valid block IDs you can anchor threads to:
${JSON.stringify(allBlockIds)}

Return JSON matching this exact schema:
{
  "focusBullets": ["string (2-4 key areas this role should focus on)"],
  "suggestedThreads": [
    {
      "blockId": "string (must be one of the valid block IDs above)",
      "body": "string (the suggested comment or question from Artifact, written in the voice of a helpful collaborator highlighting what ${role} should weigh in on)"
    }
  ]
}

Guidelines:
- Focus bullets should be specific to what ${role} cares about in this artifact
- Suggested threads should highlight areas where ${role}'s input is critical
- Each thread must reference a real block ID from the list above
- Generate 2-5 suggested threads, prioritized by importance
- Write thread bodies as if Artifact is highlighting the concern for the reviewer`;

  return callClaude(prompt, (text) => {
    const parsed = roleReviewPackSchema.parse(JSON.parse(extractJson(text)));
    return {
      focusBullets: parsed.focusBullets,
      suggestedThreads: parsed.suggestedThreads,
    };
  });
}
