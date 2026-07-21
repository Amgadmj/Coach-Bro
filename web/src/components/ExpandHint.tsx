"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/** True only for a real mouse/trackpad - guards against mobile Safari's sticky
 * synthetic hover on tap, which would otherwise leave a panel stuck open. */
export function useCanHover() {
  const [canHover, setCanHover] = useState(false);
  useEffect(() => {
    setCanHover(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }, []);
  return canHover;
}

/** Click-to-pin + (desktop-only) hover-to-preview open state - shared by every
 * tap/hover-to-expand affordance in the app (debate bubbles, the gauge detail). */
export function useExpandable() {
  const [pinned, setPinned] = useState(false);
  const [hovering, setHovering] = useState(false);
  const canHover = useCanHover();
  const open = pinned || hovering;
  return {
    open,
    toggle: () => setPinned((p) => !p),
    hoverHandlers: {
      onMouseEnter: () => canHover && setHovering(true),
      onMouseLeave: () => canHover && setHovering(false),
    },
  };
}

export function ExpandChevron({
  open,
  moreLabel,
  lessLabel,
  className,
}: {
  open: boolean;
  moreLabel: string;
  lessLabel: string;
  className?: string;
}) {
  return (
    <div className={className ?? "mt-1 flex items-center gap-1 text-[9px] font-bold text-ink3"}>
      <motion.svg
        width="8"
        height="8"
        viewBox="0 0 8 8"
        animate={{ rotate: open ? 180 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <path
          d="M1 2 L4 6 L7 2"
          stroke="currentColor"
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.svg>
      {open ? lessLabel : moreLabel}
    </div>
  );
}
