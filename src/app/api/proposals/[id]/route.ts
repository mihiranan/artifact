import { NextRequest, NextResponse } from "next/server";
import { getProposal, validateToken } from "@/lib/proposals";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = request.nextUrl.searchParams.get("t");
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 401 });
  }

  const proposal = await getProposal(id, token);
  if (!proposal) {
    return NextResponse.json(
      { error: "Not found or invalid token" },
      { status: 404 }
    );
  }

  return NextResponse.json(proposal);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = request.nextUrl.searchParams.get("t") || "";
  if (!(await validateToken(id, token))) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const { title } = await request.json();
  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  await prisma.proposal.update({
    where: { id },
    data: { title: title.trim() },
  });

  return NextResponse.json({ ok: true });
}
