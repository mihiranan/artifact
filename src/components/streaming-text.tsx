"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FormattedText, stripMarkers } from "@/components/formatted-text";

interface StreamingTextProps {
  text: string;
  className?: string;
  speed?: number;
  as?: "p" | "span";
}

export function StreamingText({
  text,
  className = "",
  speed = 20,
  as: Tag = "p",
}: StreamingTextProps) {
  const prevTextRef = useRef<string | null>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const clean = stripMarkers(text);
  const words = clean.split(/(\s+)/);

  useEffect(() => {
    if (prevTextRef.current === null) {
      setShouldAnimate(true);
      prevTextRef.current = text;
    } else if (prevTextRef.current !== text) {
      setShouldAnimate(true);
      setVisibleCount(0);
      prevTextRef.current = text;
    }
  }, [text]);

  useEffect(() => {
    if (!shouldAnimate) return;
    if (visibleCount >= words.length) {
      setShouldAnimate(false);
      return;
    }

    const timer = setTimeout(() => {
      setVisibleCount((c) => c + 1);
    }, speed);
    return () => clearTimeout(timer);
  }, [shouldAnimate, visibleCount, words.length, speed]);

  if (!shouldAnimate) {
    return <Tag className={className}><FormattedText text={text} /></Tag>;
  }

  return (
    <Tag className={className}>
      {words.map((word, i) => (
        <motion.span
          key={`${i}-${word}`}
          initial={{ opacity: 0, filter: "blur(4px)" }}
          animate={
            i < visibleCount
              ? { opacity: 1, filter: "blur(0px)" }
              : { opacity: 0, filter: "blur(4px)" }
          }
          transition={{ duration: 0.15 }}
        >
          {word}
        </motion.span>
      ))}
    </Tag>
  );
}
