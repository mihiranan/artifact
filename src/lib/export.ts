import { Proposal } from "@/lib/types";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";
import { saveAs } from "file-saver";

function slugify(title: string) {
  return title.replace(/\s+/g, "-").toLowerCase();
}

export function generateMarkdown(proposal: Proposal): string {
  const lines: string[] = [];
  lines.push(`# ${proposal.title}\n`);

  for (const section of proposal.prdJson.sections) {
    lines.push(`## ${section.title}\n`);
    for (const block of section.blocks) {
      if (block.type === "content") {
        lines.push(`${block.text}\n`);
      } else {
        if (block.status === "answered" && block.answer) {
          lines.push(`**Q:** ${block.prompt}`);
          lines.push(`**A:** ${block.answer}\n`);
        } else {
          lines.push(`> **Open question:** ${block.prompt}`);
          if (block.assignedRole) {
            lines.push(`> *Assigned to: ${block.assignedRole}*\n`);
          } else {
            lines.push("");
          }
        }
      }
    }
  }

  if (proposal.decisions.length > 0) {
    lines.push(`## Decisions\n`);
    for (const dec of proposal.decisions) {
      lines.push(`### ${dec.title}`);
      lines.push(`**Outcome:** ${dec.outcome}`);
      if (dec.rationale) lines.push(`**Rationale:** ${dec.rationale}`);
      if (dec.ownerRole) lines.push(`**Owner:** ${dec.ownerRole}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}

export function generatePlainText(proposal: Proposal): string {
  const lines: string[] = [];
  lines.push(proposal.title);
  lines.push("=".repeat(proposal.title.length));
  lines.push("");

  for (const section of proposal.prdJson.sections) {
    lines.push(section.title);
    lines.push("-".repeat(section.title.length));
    lines.push("");
    for (const block of section.blocks) {
      if (block.type === "content") {
        lines.push(block.text);
        lines.push("");
      } else {
        if (block.status === "answered" && block.answer) {
          lines.push(`Q: ${block.prompt}`);
          lines.push(`A: ${block.answer}`);
          lines.push("");
        } else {
          lines.push(`[Open question] ${block.prompt}`);
          if (block.assignedRole) {
            lines.push(`  Assigned to: ${block.assignedRole}`);
          }
          lines.push("");
        }
      }
    }
  }

  if (proposal.decisions.length > 0) {
    lines.push("Decisions");
    lines.push("---------");
    lines.push("");
    for (const dec of proposal.decisions) {
      lines.push(dec.title);
      lines.push(`  Outcome: ${dec.outcome}`);
      if (dec.rationale) lines.push(`  Rationale: ${dec.rationale}`);
      if (dec.ownerRole) lines.push(`  Owner: ${dec.ownerRole}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}

function buildDocxParagraphs(proposal: Proposal): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      text: proposal.title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.LEFT,
      spacing: { after: 200 },
    }),
  );

  for (const section of proposal.prdJson.sections) {
    paragraphs.push(
      new Paragraph({
        text: section.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
    );

    for (const block of section.blocks) {
      if (block.type === "content") {
        for (const line of block.text.split("\n")) {
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: line })],
              spacing: { after: 120 },
            }),
          );
        }
      } else {
        if (block.status === "answered" && block.answer) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({ text: "Q: ", bold: true }),
                new TextRun({ text: block.prompt }),
              ],
              spacing: { after: 60 },
            }),
          );
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({ text: "A: ", bold: true }),
                new TextRun({ text: block.answer }),
              ],
              spacing: { after: 120 },
            }),
          );
        } else {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({ text: "Open question: ", bold: true, italics: true }),
                new TextRun({ text: block.prompt, italics: true }),
              ],
              spacing: { after: 60 },
            }),
          );
          if (block.assignedRole) {
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `Assigned to: ${block.assignedRole}`, italics: true, color: "666666" }),
                ],
                spacing: { after: 120 },
              }),
            );
          }
        }
      }
    }
  }

  if (proposal.decisions.length > 0) {
    paragraphs.push(
      new Paragraph({
        text: "Decisions",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
    );
    for (const dec of proposal.decisions) {
      paragraphs.push(
        new Paragraph({
          text: dec.title,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        }),
      );
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Outcome: ", bold: true }),
            new TextRun({ text: dec.outcome }),
          ],
          spacing: { after: 60 },
        }),
      );
      if (dec.rationale) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: "Rationale: ", bold: true }),
              new TextRun({ text: dec.rationale }),
            ],
            spacing: { after: 60 },
          }),
        );
      }
      if (dec.ownerRole) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: "Owner: ", bold: true }),
              new TextRun({ text: dec.ownerRole }),
            ],
            spacing: { after: 120 },
          }),
        );
      }
    }
  }

  return paragraphs;
}

export function downloadMarkdown(proposal: Proposal) {
  const md = generateMarkdown(proposal);
  const blob = new Blob([md], { type: "text/markdown" });
  saveAs(blob, `${slugify(proposal.title)}.md`);
}

export function downloadPlainText(proposal: Proposal) {
  const txt = generatePlainText(proposal);
  const blob = new Blob([txt], { type: "text/plain" });
  saveAs(blob, `${slugify(proposal.title)}.txt`);
}

export async function downloadDocx(proposal: Proposal) {
  const doc = new Document({
    sections: [{ children: buildDocxParagraphs(proposal) }],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${slugify(proposal.title)}.docx`);
}

export async function copyMarkdown(proposal: Proposal) {
  const md = generateMarkdown(proposal);
  await navigator.clipboard.writeText(md);
}
