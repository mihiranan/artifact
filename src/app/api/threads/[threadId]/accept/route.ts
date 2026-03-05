import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;

  const updated = await prisma.thread.update({
    where: { id: threadId },
    data: { isSuggested: false },
  });

  return NextResponse.json(updated);
}
