"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const COLORS = ["bg-accent", "bg-lime", "bg-ai", "bg-ink", "bg-ok"];

/* Trajectoires fixes (déterministes) : une gerbe régulière, légèrement irrégulière. */
const PIECES = Array.from({ length: 34 }, (_, i) => {
  const angle = (i / 34) * Math.PI * 2 + (((i * 37) % 11) / 11) * 0.5;
  const dist = 160 + ((i * 53) % 7) * 38;
  return {
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist * 0.75 - 40,
    r: ((i * 71) % 360) - 180,
    w: 6 + (i % 3) * 3,
    h: i % 2 ? 10 : 6,
    color: COLORS[i % COLORS.length],
    delay: (i % 6) * 0.015,
  };
});

/** Petite célébration à la mise en production : confettis sobres + tampon « En ligne ». */
export function Celebration({ burst, version }: { burst: number; version: string | null }) {
  const reduce = useReducedMotion();
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (!burst) return;
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), 2200);
    return () => window.clearTimeout(t);
  }, [burst]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key={burst}
          className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35 } }}
          aria-live="polite"
        >
          {!reduce
            ? PIECES.map((p, i) => (
                <motion.span
                  key={i}
                  className={`absolute rounded-[2px] ${p.color}`}
                  style={{ width: p.w, height: p.h }}
                  initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 0.6 }}
                  animate={{ x: p.x, y: [0, p.y, p.y + 160], rotate: p.r * 3, opacity: [1, 1, 0], scale: 1 }}
                  transition={{ duration: 1.6, delay: p.delay, ease: [0.16, 1, 0.3, 1] }}
                />
              ))
            : null}
          <motion.div
            className="sticky-lime px-6 py-3 text-center"
            initial={{ scale: reduce ? 1 : 0.6, rotate: -8, opacity: 0 }}
            animate={{ scale: 1, rotate: -4, opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 18 }}
          >
            <div className="text-[30px] leading-none">EN LIGNE !</div>
            {version ? <div className="mt-1 text-[15px] leading-none">{version} EST EN PRODUCTION</div> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
