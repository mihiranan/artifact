"use client";

import { ROLES, Role } from "@/lib/types";
import { ROLE_STYLE } from "@/lib/roles";

const MENTION_PATTERN = `@(${ROLES.join("|")})(?=\\s|$|[.,;!?])`;

export function MentionText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts: (string | { role: string })[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const regex = new RegExp(MENTION_PATTERN, "g");
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push({ role: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  if (parts.length === 1 && typeof parts[0] === "string") {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {parts.map((part, i) =>
        typeof part === "string" ? (
          <span key={i}>{part}</span>
        ) : (
          <span
            key={`mention-${i}`}
            className={`inline-flex rounded-sm px-1 py-0.5 text-[12px] font-medium ${
              ROLE_STYLE[part.role as Role]?.mention ?? ""
            }`}
          >
            @{part.role}
          </span>
        )
      )}
    </span>
  );
}
