import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateRoleReviewPack } from "@/lib/claude/role-pack";
import { Role, ROLES } from "@/lib/types";
import { withAuth } from "@/lib/api-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, params, async (proposal, id) => {
    const { role } = await request.json();
    if (!role || !ROLES.includes(role as Role)) {
      return NextResponse.json(
        { error: "Valid role is required" },
        { status: 400 }
      );
    }

    const pack = await generateRoleReviewPack(proposal.prdJson, role as Role);

    for (const suggested of pack.suggestedThreads) {
      const existing = await prisma.thread.findFirst({
        where: {
          proposalId: id,
          blockId: suggested.blockId,
          role,
          isSuggested: true,
        },
      });
      if (!existing) {
        await prisma.thread.create({
          data: {
            proposalId: id,
            blockId: suggested.blockId,
            role,
            isSuggested: true,
            messages: {
              create: {
                author: "prism",
                body: suggested.body,
              },
            },
          },
        });
      }
    }

    return NextResponse.json({
      focusBullets: pack.focusBullets,
      threadCount: pack.suggestedThreads.length,
    });
  });
}
