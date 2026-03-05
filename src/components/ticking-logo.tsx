"use client";

import { useRef, useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function TickingLogo({
  className = "h-10 w-10",
  interval = 800,
}: {
  className?: string;
  interval?: number;
}) {
  const raw = useMotionValue(0);
  const rotation = useSpring(raw, { stiffness: 300, damping: 18 });
  const tickRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current += 45;
      raw.set(tickRef.current);
    }, interval);
    return () => clearInterval(id);
  }, [raw, interval]);

  return (
    <motion.img
      src="/artifact-logo.svg"
      alt=""
      className={className}
      style={{ rotate: rotation }}
    />
  );
}
