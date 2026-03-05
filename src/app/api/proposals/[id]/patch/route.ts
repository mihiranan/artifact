import { NextRequest, NextResponse } from "next/server";
import { getProposal } from "@/lib/proposals";
import { generateSectionPatch } from "@/lib/claude/patch";
import { Block } from "@/lib/types";
import { withAuth, auditAndSave } from "@/lib/api-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, params, async (proposal, id) => {
    const { intent, sectionKey: requestedKey } = await request.json();

    let targetSectionKey = requestedKey;
    if (!targetSectionKey) {
      targetSectionKey =
        proposal.prdJson.sections.find(
          (s) => s.key === "rollout" || s.key === "solution"
        )?.key || proposal.prdJson.sections[0]?.key;
    }

    const section = proposal.prdJson.sections.find(
      (s) => s.key === targetSectionKey
    );
    if (!section) {
      return NextResponse.json(
        { error: "Section not found" },
        { status: 404 }
      );
    }

    const beforeText = section.blocks
      .map((b) => (b.type === "content" ? b.text : `[Q] ${b.prompt}`))
      .join("\n\n");

    const patch = await generateSectionPatch(section, intent, "Product");

    const afterText = patch.updatedBlocks
      .map((b: Block) =>
        b.type === "content" ? b.text : `[Q] ${b.prompt}`
      )
      .join("\n\n");

    return NextResponse.json({
      sectionKey: targetSectionKey,
      before: beforeText,
      after: afterText,
      updatedBlocks: patch.updatedBlocks,
      changelog: patch.changelog,
    });
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, params, async (proposal, id, token) => {
    const { sectionKey, updatedBlocks } = await request.json();

    const prdJson = { ...proposal.prdJson };
    const sectionIdx = prdJson.sections.findIndex(
      (s) => s.key === sectionKey
    );
    if (sectionIdx !== -1 && updatedBlocks) {
      prdJson.sections[sectionIdx].blocks = updatedBlocks;
    }

    await auditAndSave(id, prdJson, proposal);

    const updated = await getProposal(id, token);
    return NextResponse.json(updated);
  });
}
