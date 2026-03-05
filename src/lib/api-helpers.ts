import { NextRequest, NextResponse } from "next/server";
import { Proposal, PrdJson } from "./types";
import { validateToken, getProposal, updateProposalPrd } from "./proposals";
import { runAlignmentAudit } from "./claude/audit";
import { computeAlignmentScore, deriveStatus } from "./alignment";

export async function withAuth(
  request: NextRequest,
  params: Promise<{ id: string }>,
  handler: (proposal: Proposal, id: string, token: string) => Promise<Response>
): Promise<Response> {
  const { id } = await params;
  const token = request.nextUrl.searchParams.get("t") || "";
  if (!(await validateToken(id, token))) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
  const proposal = await getProposal(id, token);
  if (!proposal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return handler(proposal, id, token);
}

export async function auditAndSave(
  id: string,
  prdJson: PrdJson,
  proposal: Proposal,
  opts?: { ratchetScore?: boolean }
): Promise<void> {
  let auditJson = proposal.lastAuditJson;
  try {
    auditJson = await runAlignmentAudit(
      prdJson,
      proposal.threads,
      proposal.decisions
    );
  } catch {
    /* best-effort */
  }

  let score = computeAlignmentScore(
    prdJson,
    proposal.threads,
    proposal.decisions,
    auditJson
  );
  if (opts?.ratchetScore) {
    score = Math.max(score, proposal.alignmentScore);
  }
  const status = deriveStatus(score, prdJson, proposal.threads);
  await updateProposalPrd(id, prdJson, score, auditJson, status);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function streamClaudeResponse(stream: AsyncIterable<any>): Response {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(event.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
