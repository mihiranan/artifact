"use client";

import React from "react";

const FORMAT_RE = /(\*\*.+?\*\*|==.+?==)/g;

export function FormattedText({ text }: { text: string }) {
  const parts = text.split(FORMAT_RE);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-foreground">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("==") && part.endsWith("==")) {
          return (
            <mark key={i} className="prd-highlight">
              {part.slice(2, -2)}
            </mark>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

export function stripMarkers(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/==(.+?)==/g, "$1");
}
