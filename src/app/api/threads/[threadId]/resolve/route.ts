import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;

  const thread = await prisma.thread.findUnique({ where: { id: threadId } });
  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const newStatus = thread.status === "open" ? "resolved" : "open";
  const updated = await prisma.thread.update({
    where: { id: threadId },
    data: { status: newStatus },
  });

  return NextResponse.json(updated);
}
