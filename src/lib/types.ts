export const ROLES = [
  "Product",
  "Engineering",
  "Design",
  "Data",
  "Legal",
  "Support",
] as const;

export type Role = (typeof ROLES)[number];

export type BlockStatus = "open" | "answered" | "assigned";
export type Severity = "high" | "medium" | "low";
export type ProposalStatus = "Draft" | "In Review" | "Stuck" | "Ready";
export type ThreadStatus = "open" | "resolved";
export type GenerationStatus = "idle" | "generating" | "evaluating";

export interface ContentBlock {
  id: string;
  type: "content";
  text: string;
}

export interface QuestionBlock {
  id: string;
  type: "question";
  prompt: string;
  suggestedRole: Role;
  status: BlockStatus;
  severity: Severity;
  answer: string | null;
  assignedRole: Role | null;
  refractedFrom: Role | null;
}

export type Block = ContentBlock | QuestionBlock;

export interface Section {
  key: string;
  title: string;
  blocks: Block[];
  generationStatus?: GenerationStatus;
  questionRound?: number;
}

export interface PrdJson {
  sections: Section[];
}

export interface ThreadMessage {
  id: string;
  threadId: string;
  author: "prism" | "human";
  body: string;
  createdAt: string;
}

export interface Thread {
  id: string;
  proposalId: string;
  blockId: string;
  role: string;
  status: ThreadStatus;
  isSuggested: boolean;
  createdAt: string;
  updatedAt: string;
  messages: ThreadMessage[];
}

export interface Decision {
  id: string;
  proposalId: string;
  title: string;
  outcome: string;
  rationale: string | null;
  ownerRole: string | null;
  createdAt: string;
}

export interface Blocker {
  id: string;
  title: string;
  severity: Severity;
  rolesInvolved: string[];
  evidence: string[];
  recommendedFix: "patch" | "meeting";
  fixDetail: string;
}

export interface AuditJson {
  alignmentScore: number;
  coverage: number;
  contradictions: number;
  decisionClosure: number;
  blockers: Blocker[];
}

export interface AndyMessage {
  id: string;
  sectionKey: string;
  message: string;
  type: "role_update" | "system";
  forRoles: string[];
  createdAt: string;
}

export interface Proposal {
  id: string;
  title: string;
  rawRequest: string;
  prdJson: PrdJson;
  shareToken: string;
  alignmentScore: number;
  lastAuditJson: AuditJson | null;
  status: ProposalStatus;
  threads: Thread[];
  decisions: Decision[];
  andyMessages: AndyMessage[];
  createdAt: string;
  updatedAt: string;
}
