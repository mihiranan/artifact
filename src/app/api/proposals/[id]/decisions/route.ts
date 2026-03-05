import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, params, async (_proposal, id) => {
    const { title, outcome, rationale, ownerRole } = await request.json();
    if (!title || !outcome) {
      return NextResponse.json(
        { error: "title and outcome are required" },
        { status: 400 }
      );
    }

    const decision = await prisma.decision.create({
      data: {
        proposalId: id,
        title,
        outcome,
        rationale: rationale || null,
        ownerRole: ownerRole || null,
      },
    });

    return NextResponse.json(decision);
  });
}
