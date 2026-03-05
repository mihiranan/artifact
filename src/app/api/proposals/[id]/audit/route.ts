import { NextRequest, NextResponse } from "next/server";
import { getProposal, updateProposalPrd } from "@/lib/proposals";
import { runAlignmentAudit } from "@/lib/claude/audit";
import { computeAlignmentScore, deriveStatus } from "@/lib/alignment";
import { withAuth } from "@/lib/api-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, params, async (proposal, id, token) => {
    const auditJson = await runAlignmentAudit(
      proposal.prdJson,
      proposal.threads,
      proposal.decisions
    );

    const score = computeAlignmentScore(
      proposal.prdJson,
      proposal.threads,
      proposal.decisions,
      auditJson
    );
    const status = deriveStatus(score, proposal.prdJson, proposal.threads);

    await updateProposalPrd(
      id,
      proposal.prdJson,
      score,
      auditJson,
      status
    );

    const updated = await getProposal(id, token);
    return NextResponse.json(updated);
  });
}
