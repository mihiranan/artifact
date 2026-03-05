import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const { author, body } = await request.json();

  if (!body) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  const message = await prisma.threadMessage.create({
    data: {
      threadId,
      author: author || "human",
      body,
    },
  });

  await prisma.thread.update({
    where: { id: threadId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json(message);
}
