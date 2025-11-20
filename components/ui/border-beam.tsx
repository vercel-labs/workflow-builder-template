"use client";

import { cn } from "@/lib/utils";
import { motion, type MotionStyle, type Transition } from "framer-motion";

interface BorderBeamProps {
  /**
   * The size of the border beam.
   */
  size?: number;
  /**
   * The duration of the border beam.
   */
  duration?: number;
  /**
   * The delay of the border beam.
   */
  delay?: number;
  /**
   * The color of the border beam from.
   */
  colorFrom?: string;
  /**
   * The color of the border beam to.
   */
  colorTo?: string;
  /**
   * The motion transition of the border beam.
   */
  transition?: Transition;
  /**
   * The class name of the border beam.
   */
  className?: string;
  /**
   * The style of the border beam.
   */
  style?: React.CSSProperties;
  /**
   * Whether to reverse the animation direction.
   */
  reverse?: boolean;
  /**
   * The initial offset position (0-100).
   */
  initialOffset?: number;
  /**
   * The border width of the beam.
   */
  borderWidth?: number;
}

export const BorderBeam = ({
  className,
  size = 50,
  delay = 0,
  duration = 6,
  colorFrom = "#3b82f6",
  colorTo = "#60a5fa",
  transition,
  style,
  reverse = false,
  initialOffset = 0,
  borderWidth = 2,
}: BorderBeamProps) => {
  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-[inherit] border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]"
      style={
        {
          "--border-beam-width": `${borderWidth}px`,
          borderWidth: `${borderWidth}px`,
        } as React.CSSProperties
      }
    >
      <motion.div
        className={cn(
          "absolute aspect-square",
          "bg-gradient-to-l from-[var(--color-from)] via-[var(--color-to)] to-transparent",
          className
        )}
        style={
          {
            width: size,
            offsetPath: `rect(0 auto auto 0 round 8px)`,
            "--color-from": colorFrom,
            "--color-to": colorTo,
            ...style,
          } as MotionStyle
        }
        initial={{ offsetDistance: `${initialOffset}%` }}
        animate={{
          offsetDistance: reverse
            ? [`${100 - initialOffset}%`, `${-initialOffset}%`]
            : [`${initialOffset}%`, `${100 + initialOffset}%`],
        }}
        transition={{
          repeat: Number.POSITIVE_INFINITY,
          ease: "linear",
          duration,
          delay: -delay,
          ...transition,
        }}
      />
    </div>
  );
};

