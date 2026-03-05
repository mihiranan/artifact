import { prisma } from "./db";
import { Proposal, PrdJson, AuditJson } from "./types";
import crypto from "crypto";

function generateToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export async function createProposal(data: {
  title: string;
  rawRequest: string;
  prdJson: PrdJson;
  alignmentScore: number;
  lastAuditJson?: AuditJson;
}): Promise<{ id: string; shareToken: string }> {
  const shareToken = generateToken();
  const row = await prisma.proposal.create({
    data: {
      title: data.title,
      rawRequest: data.rawRequest,
      prdJson: JSON.stringify(data.prdJson),
      shareToken,
      alignmentScore: data.alignmentScore,
      lastAuditJson: data.lastAuditJson
        ? JSON.stringify(data.lastAuditJson)
        : null,
      status: "Draft",
    },
  });
  return { id: row.id, shareToken: row.shareToken };
}

export async function getProposal(
  id: string,
  token: string
): Promise<Proposal | null> {
  const row = await prisma.proposal.findFirst({
    where: { id, shareToken: token },
    include: {
      threads: { include: { messages: { orderBy: { createdAt: "asc" } } } },
      decisions: { orderBy: { createdAt: "asc" } },
      andyMessages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    rawRequest: row.rawRequest,
    prdJson: JSON.parse(row.prdJson) as PrdJson,
    shareToken: row.shareToken,
    alignmentScore: row.alignmentScore,
    lastAuditJson: row.lastAuditJson
      ? (JSON.parse(row.lastAuditJson) as AuditJson)
      : null,
    status: row.status as Proposal["status"],
    threads: row.threads.map((t) => ({
      id: t.id,
      proposalId: t.proposalId,
      blockId: t.blockId,
      role: t.role,
      status: t.status as "open" | "resolved",
      isSuggested: t.isSuggested,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      messages: t.messages.map((m) => ({
        id: m.id,
        threadId: m.threadId,
        author: m.author as "prism" | "human",
        body: m.body,
        createdAt: m.createdAt.toISOString(),
      })),
    })),
    decisions: row.decisions.map((d) => ({
      id: d.id,
      proposalId: d.proposalId,
      title: d.title,
      outcome: d.outcome,
      rationale: d.rationale,
      ownerRole: d.ownerRole,
      createdAt: d.createdAt.toISOString(),
    })),
    andyMessages: row.andyMessages.map((m) => ({
      id: m.id,
      sectionKey: m.sectionKey,
      message: m.message,
      type: m.type as "role_update" | "system",
      forRoles: JSON.parse(m.forRoles) as string[],
      createdAt: m.createdAt.toISOString(),
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function updateProposalPrd(
  id: string,
  prdJson: PrdJson,
  alignmentScore?: number,
  lastAuditJson?: AuditJson | null,
  status?: string
) {
  await prisma.proposal.update({
    where: { id },
    data: {
      prdJson: JSON.stringify(prdJson),
      ...(alignmentScore !== undefined && { alignmentScore }),
      ...(lastAuditJson && { lastAuditJson: JSON.stringify(lastAuditJson) }),
      ...(status && { status }),
    },
  });
}

export async function createAndyMessage(data: {
  proposalId: string;
  sectionKey: string;
  message: string;
  type: "role_update" | "system";
  forRoles: string[];
}) {
  await prisma.andyMessage.create({
    data: { ...data, forRoles: JSON.stringify(data.forRoles) },
  });
}

export async function validateToken(
  proposalId: string,
  token: string
): Promise<boolean> {
  const row = await prisma.proposal.findFirst({
    where: { id: proposalId, shareToken: token },
    select: { id: true },
  });
  return !!row;
}
