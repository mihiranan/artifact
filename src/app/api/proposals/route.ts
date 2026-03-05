import { NextRequest, NextResponse } from "next/server";
import { generatePrdStructure } from "@/lib/claude/prd";
import { createProposal } from "@/lib/proposals";
import { computeAlignmentScore } from "@/lib/alignment";

export async function POST(request: NextRequest) {
  try {
    const { rawRequest } = await request.json();
    if (!rawRequest || typeof rawRequest !== "string") {
      return NextResponse.json(
        { error: "rawRequest is required" },
        { status: 400 }
      );
    }

    const result = await generatePrdStructure(rawRequest);
    const score = computeAlignmentScore(result.prdJson, [], []);

    const { id, shareToken } = await createProposal({
      title: result.title,
      rawRequest,
      prdJson: result.prdJson,
      alignmentScore: score,
    });

    return NextResponse.json({ id, shareToken });
  } catch (error) {
    console.error("Failed to create proposal:", error);
    return NextResponse.json(
      { error: "Failed to create proposal" },
      { status: 500 }
    );
  }
}
