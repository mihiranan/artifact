import { z } from "zod";
import { ROLES } from "../types";

const contentBlockSchema = z.object({
  id: z.string(),
  type: z.literal("content"),
  text: z.string(),
});

const questionBlockSchema = z.object({
  id: z.string(),
  type: z.literal("question"),
  prompt: z.string(),
  suggestedRole: z.enum(ROLES),
  status: z.enum(["open", "answered", "assigned"]),
  severity: z.enum(["high", "medium", "low"]),
  answer: z.string().nullable(),
  assignedRole: z.enum(ROLES).nullable(),
  refractedFrom: z.enum(ROLES).nullable().optional().default(null),
});

const blockSchema = z.discriminatedUnion("type", [
  contentBlockSchema,
  questionBlockSchema,
]);

const sectionSchema = z.object({
  key: z.string(),
  title: z.string(),
  blocks: z.array(blockSchema),
});

const prdJsonSchema = z.object({
  sections: z.array(sectionSchema),
});

const contentOnlySectionSchema = z.object({
  key: z.string(),
  title: z.string(),
  blocks: z.array(contentBlockSchema),
});

export const generatePrdStructureSchema = z.object({
  title: z.string(),
  prdJson: z.object({ sections: z.array(contentOnlySectionSchema) }),
});

const sectionQuestionsSchema = z.object({
  key: z.string(),
  questions: z.array(questionBlockSchema),
});

export const generateQuestionsResultSchema = z.object({
  sections: z.array(sectionQuestionsSchema),
});

export const roleReviewPackSchema = z.object({
  focusBullets: z.array(z.string()),
  suggestedThreads: z.array(
    z.object({
      blockId: z.string(),
      body: z.string(),
    })
  ),
});

const blockerSchema = z.object({
  id: z.string(),
  title: z.string(),
  severity: z.enum(["high", "medium", "low"]),
  rolesInvolved: z.array(z.string()),
  evidence: z.array(z.string()),
  recommendedFix: z.enum(["patch", "meeting"]),
  fixDetail: z.string(),
});

export const alignmentAuditSchema = z.object({
  alignmentScore: z.number().min(0).max(100),
  coverage: z.number().min(0).max(100),
  contradictions: z.number(),
  decisionClosure: z.number().min(0).max(100),
  blockers: z.array(blockerSchema).max(6),
});

export const sectionPatchSchema = z.object({
  sectionKey: z.string(),
  updatedBlocks: z.array(blockSchema),
  changelog: z.string(),
});

export const firstDraftSchema = z.object({
  sectionKey: z.string(),
  contentBlocks: z.array(contentBlockSchema),
  changelog: z.string(),
});

export const evaluationSchema = z.object({
  needsMoreQuestions: z.boolean(),
  questions: z.array(questionBlockSchema),
  changelog: z.string(),
});
