import { NextRequest } from "next/server";
import { getClient, CLAUDE_MODEL } from "@/lib/claude/client";
import { prisma } from "@/lib/db";
import { streamClaudeResponse } from "@/lib/api-helpers";
import { PrdJson, QuestionBlock } from "@/lib/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { messages, role } = await request.json();

  const proposal = await prisma.proposal.findUnique({ where: { id } });
  if (!proposal) {
    return new Response("Not found", { status: 404 });
  }

  const prd: PrdJson = JSON.parse(proposal.prdJson as string);

  const allQuestions: QuestionBlock[] = [];
  const sections = prd.sections
    .map(
      (s) =>
        `## ${s.title}\n${s.blocks
          .map((b) => {
            if (b.type === "content") return b.text;
            if (b.type === "question") {
              allQuestions.push(b);
              const owner = b.assignedRole || b.suggestedRole || "Unassigned";
              if (b.status === "answered") {
                return `Q (${owner}, answered): ${b.prompt}\n  → ${b.answer}`;
              }
              return `Q (${owner}, open): ${b.prompt}`;
            }
            return "";
          })
          .join("\n")}`
    )
    .join("\n\n");

  const answered = allQuestions.filter((q) => q.status === "answered");
  const open = allQuestions.filter((q) => q.status !== "answered");
  const myOpen = open.filter(
    (q) => (q.assignedRole || q.suggestedRole) === role
  );
  const othersOpen = open.filter(
    (q) => (q.assignedRole || q.suggestedRole) !== role
  );

  const roleCounts: Record<string, number> = {};
  for (const q of open) {
    const r = q.assignedRole || q.suggestedRole || "Unassigned";
    roleCounts[r] = (roleCounts[r] || 0) + 1;
  }
  const openByRole = Object.entries(roleCounts)
    .map(([r, n]) => `${r}: ${n}`)
    .join(", ");

  const systemPrompt = `You are Artifact, a terse AI assistant embedded in a PRD workspace. You know the document below inside-out.

CURRENT USER ROLE: ${role}

QUESTION STATUS:
- Total questions: ${allQuestions.length}
- Answered: ${answered.length}
- Open (all roles): ${open.length} — ${openByRole || "none"}
- Open for ${role}: ${myOpen.length}
- Open for other roles: ${othersOpen.length}

DOCUMENT: ${proposal.title}

${sections}

Response rules — follow strictly:
- Maximum 2-3 short sentences by default. Only go longer if the user explicitly asks for detail.
- Lead with the direct answer. No preamble, no "Great question", no filler.
- For lists, ALWAYS use proper markdown syntax: "- item" for bullets or "1. item" for numbered lists, each on its own line. NEVER use "•" or other unicode bullet characters. Example:
- First item
- Second item
- Bold (**word**) sparingly for key terms. No markdown headers.
- If something is an open/unanswered question in the doc, say so in one line.
- When discussing questions, always mention which role owns them.
- You know exactly which questions ${role} still needs to answer vs. which belong to other roles.
- Never repeat the question back. Never summarize what you're about to say.`;

  const client = getClient();

  const stream = await client.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 512,
    system: systemPrompt,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });

  return streamClaudeResponse(stream);
}
