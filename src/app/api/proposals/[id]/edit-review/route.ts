import { NextRequest, NextResponse } from "next/server";
import { getClient, CLAUDE_MODEL, extractJson } from "@/lib/claude/client";
import { PrdJson, QuestionBlock } from "@/lib/types";
import { withAuth, auditAndSave } from "@/lib/api-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, params, async (proposal, id) => {
    const { blockId, originalText, editedText } = await request.json();
    if (!blockId || !originalText || !editedText) {
      return NextResponse.json(
        { error: "blockId, originalText, and editedText are required" },
        { status: 400 }
      );
    }

    const prdJson: PrdJson = { ...proposal.prdJson };

    let sectionTitle = "";
    let fullBlockText = "";
    const answeredQuestions: string[] = [];

    for (const section of prdJson.sections) {
      for (const block of section.blocks) {
        if (block.id === blockId && block.type === "content") {
          sectionTitle = section.title;
          fullBlockText = block.text;
        }
        if (block.type === "question" && block.status === "answered") {
          const qb = block as QuestionBlock;
          answeredQuestions.push(`Q: ${qb.prompt}\nA: ${qb.answer}`);
        }
      }
    }

    if (!fullBlockText) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }

    const client = getClient();

    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 256,
      system: `You review manual edits to a PRD artifact. You must decide whether an edit is safe to apply.

An edit is SAFE if it:
- Does not contradict any answered questions
- Does not introduce factual inconsistencies with the rest of the section
- Does not remove critical information that was established by prior answers
- Is a reasonable refinement (clarification, rewording, adding detail, fixing grammar)

An edit is UNSAFE if it:
- Contradicts an answer that was already provided
- Removes or reverses a decision that was explicitly made
- Introduces scope or requirements that conflict with existing alignment

Respond with ONLY valid JSON: { "approved": true/false, "reason": "one sentence" }`,
      messages: [
        {
          role: "user",
          content: `Section: ${sectionTitle}

Full block text:
${fullBlockText}

Answered questions context:
${answeredQuestions.length > 0 ? answeredQuestions.join("\n\n") : "None yet."}

ORIGINAL text selection:
"${originalText}"

PROPOSED edit:
"${editedText}"

Is this edit safe? Respond with JSON only.`,
        },
      ],
    });

    const raw =
      response.content[0].type === "text" ? response.content[0].text : "";

    let approved = false;
    let reason = "Could not determine.";
    try {
      const parsed = JSON.parse(extractJson(raw));
      approved = !!parsed.approved;
      reason = parsed.reason || reason;
    } catch {
      // fallback: leave defaults
    }

    if (approved) {
      for (const section of prdJson.sections) {
        for (const block of section.blocks) {
          if (block.id === blockId && block.type === "content") {
            block.text = fullBlockText.replace(originalText, editedText);
          }
        }
      }

      await auditAndSave(id, prdJson, proposal);
    }

    return NextResponse.json({ approved, reason });
  });
}
