import { NextRequest, NextResponse } from "next/server";
import { generatePrdQuestions } from "@/lib/claude/prd";
import { getProposal, updateProposalPrd } from "@/lib/proposals";
import { computeAlignmentScore } from "@/lib/alignment";
import { ROLES, Role } from "@/lib/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { roles, token } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "token is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(roles) || roles.length === 0) {
      return NextResponse.json(
        { error: "roles array is required and must not be empty" },
        { status: 400 }
      );
    }

    const validRoles = roles.filter((r: string) =>
      (ROLES as readonly string[]).includes(r)
    ) as Role[];

    if (validRoles.length === 0) {
      return NextResponse.json(
        { error: "No valid roles provided" },
        { status: 400 }
      );
    }

    const proposal = await getProposal(id, token);
    if (!proposal) {
      return NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 }
      );
    }

    const mergedPrd = await generatePrdQuestions(proposal.prdJson, validRoles);
    const score = computeAlignmentScore(mergedPrd, [], []);

    await updateProposalPrd(id, mergedPrd, score);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to finalize proposal:", error);
    return NextResponse.json(
      { error: "Failed to finalize proposal" },
      { status: 500 }
    );
  }
}
