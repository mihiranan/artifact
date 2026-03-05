# Prism

Prism turns rough product ideas into structured, cross-functional specs. You paste a messy request, and the AI collaborator (Andy) generates a PRD with inline question blocks routed to the right stakeholders. Each role answers their questions, threads surface misalignments, and an alignment audit tracks how close the spec is to ship-ready.

## Tech Stack

- **Framework**: Next.js 16 (App Router, React Server Components)
- **UI**: React 19, Tailwind CSS v4, shadcn/ui, Framer Motion
- **AI**: Anthropic Claude (streaming chat, structured generation, alignment audits)
- **Database**: SQLite with Prisma ORM
- **Validation**: Zod

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env.local
# Then add your ANTHROPIC_API_KEY to .env.local

# 3. Run database migrations
npx prisma migrate dev

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page (submit a request)
│   ├── p/[id]/page.tsx             # Workspace page (PRD editor)
│   └── api/                        # API routes
│       ├── chat/                   #   Home page chat
│       ├── proposals/              #   CRUD, audit, chat, questions, patches
│       └── threads/                #   Thread messages, resolve, accept
├── components/
│   ├── workspace/                  # PRD editor components
│   │   ├── prd-document.tsx        #   Full PRD renderer
│   │   ├── section-nav.tsx         #   Left sidebar TOC
│   │   ├── chat-bot.tsx            #   Andy chat panel
│   │   ├── content-block.tsx       #   Editable content blocks
│   │   ├── question-block.tsx      #   Role-routed question blocks
│   │   ├── thread-popover.tsx      #   Inline discussion threads
│   │   └── top-bar.tsx             #   Header with role switcher
│   ├── andy-face.tsx               # Shared Andy smiley SVG
│   ├── ticking-logo.tsx            # Shared animated logo
│   ├── humans-and-logo.tsx         # Landing page canvas animation
│   └── generation-loading.tsx      # Loading state during generation
└── lib/
    ├── types.ts                    # Shared TypeScript types
    ├── roles.ts                    # Centralized role colors & descriptions
    ├── db.ts                       # Prisma client singleton
    ├── proposals.ts                # Proposal CRUD helpers
    ├── alignment.ts                # Alignment score computation
    ├── api-helpers.ts              # Shared API route helpers (auth, audit, streaming)
    ├── export.ts                   # Markdown / plaintext / DOCX export
    └── claude/                     # AI service layer
        ├── client.ts               #   Claude client + model constant
        ├── prd.ts                  #   PRD structure & question generation
        ├── audit.ts                #   Alignment audit
        ├── patch.ts                #   Section patching
        └── schemas.ts              #   Zod schemas for Claude responses
```

## Architecture

**Generation flow**: A user submits a raw request on the landing page. The API generates a PRD structure (content blocks only), then generates role-specific question blocks in a second pass. Each section progresses through question rounds -- when all questions for a section are answered, Andy drafts new content or asks follow-up questions.

**Role system**: Six stakeholder roles (Product, Engineering, Design, Data, Legal, Support) each get tailored questions and a filtered view. Share links let real teammates pick their role and answer their questions asynchronously.

**Alignment tracking**: After each answer or edit, an alignment audit runs (via Claude) to compute coverage, contradiction count, and decision closure. The alignment score drives the proposal status (Draft → In Review → Ready).

**Data model**: Proposals store the PRD as a JSON blob (`prdJson`) alongside threads, decisions, and Andy messages. All mutations go through API routes; the workspace page polls for updates.
