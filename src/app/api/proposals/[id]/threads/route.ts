import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, params, async (_proposal, id) => {
    const { blockId, role, body, isSuggested } = await request.json();
    if (!blockId || !role || !body) {
      return NextResponse.json(
        { error: "blockId, role, and body are required" },
        { status: 400 }
      );
    }

    const thread = await prisma.thread.create({
      data: {
        proposalId: id,
        blockId,
        role,
        isSuggested: isSuggested ?? false,
        messages: {
          create: {
            author: isSuggested ? "prism" : "human",
            body,
          },
        },
      },
      include: { messages: true },
    });

    return NextResponse.json(thread);
  });
}
