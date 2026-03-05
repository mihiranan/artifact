# Artifact

Artifact takes messy product requests and turns them into structured, cross-functional requirements records. You paste in a rough idea, and an AI collaborator (Andy) breaks it down into sections with inline questions routed to the right stakeholders — product, engineering, design, data, legal, support. Each role answers their questions, threads catch misalignments early, and an alignment audit tracks how close the spec is to being ship-ready.

**Live at [artifact-mihir.vercel.app](https://artifact-mihir.vercel.app)**

## Tech Stack

- **Framework**: Next.js 16 (App Router, React Server Components)
- **UI**: React 19, Tailwind CSS v4, shadcn/ui, Framer Motion
- **AI**: Anthropic Claude (streaming chat, structured generation, alignment audits)
- **Database**: SQLite with Prisma ORM
- **Validation**: Zod

## Getting Started

```bash
# install dependencies
npm install

# copy environment variables
cp .env.example .env.local
# add your ANTHROPIC_API_KEY to .env.local

# run database migrations
npx prisma migrate dev

# start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── p/[id]/page.tsx             # Workspace (artifact editor)
│   └── api/                        # API routes
│       ├── chat/                   #   Home page chat
│       ├── proposals/              #   CRUD, audit, chat, questions, patches
│       └── threads/                #   Thread messages, resolve, accept
├── components/
│   ├── workspace/                  # Artifact editor components
│   │   ├── prd-document.tsx        #   Full artifact renderer
│   │   ├── section-nav.tsx         #   Left sidebar TOC
│   │   ├── chat-bot.tsx            #   Andy chat panel
│   │   ├── content-block.tsx       #   Editable content blocks
│   │   ├── question-block.tsx      #   Role-routed question blocks
│   │   ├── thread-popover.tsx      #   Inline discussion threads
│   │   └── top-bar.tsx             #   Header with role switcher
│   ├── andy-face.tsx               # Andy smiley SVG
│   ├── ticking-logo.tsx            # Animated logo
│   ├── humans-and-logo.tsx         # Landing page canvas animation
│   └── generation-loading.tsx      # Loading state during generation
└── lib/
    ├── types.ts                    # Shared TypeScript types
    ├── roles.ts                    # Role colors & descriptions
    ├── db.ts                       # Prisma client singleton
    ├── proposals.ts                # Proposal CRUD helpers
    ├── alignment.ts                # Alignment score computation
    ├── api-helpers.ts              # Shared API route helpers
    ├── export.ts                   # Markdown / plaintext / DOCX export
    └── claude/                     # AI service layer
        ├── client.ts               #   Claude client + model config
        ├── prd.ts                  #   Artifact structure & question generation
        ├── audit.ts                #   Alignment audit
        ├── patch.ts                #   Section patching
        └── schemas.ts              #   Zod schemas for Claude responses
```

## How It Works

A user submits a raw product request on the landing page. The API generates an artifact (content blocks first), then generates role-specific question blocks in a second pass. Each section goes through question rounds — once all questions for a section are answered, Andy drafts new content or asks follow-ups.

Six stakeholder roles (Product, Engineering, Design, Data, Legal, Support) each get tailored questions and a filtered view. Share links let real teammates pick their role and answer asynchronously.

After each answer or edit, an alignment audit runs to compute coverage, contradiction count, and decision closure. The alignment score drives the proposal status from Draft → In Review → Ready.

Proposals store the artifact as a JSON blob (`prdJson`) alongside threads, decisions, and Andy messages. All mutations go through API routes; the workspace page polls for updates.
