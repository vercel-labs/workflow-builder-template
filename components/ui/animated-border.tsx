"use client";

import { cn } from "@/lib/utils";

interface AnimatedBorderProps {
  className?: string;
}

export const AnimatedBorder = ({ className }: AnimatedBorderProps) => {
  return (
    <>
      <style jsx>{`
        @keyframes clip-border {
          0%, 100% {
            clip-path: inset(0 0 98% 0);
          }
          25% {
            clip-path: inset(0 0 0 98%);
          }
          50% {
            clip-path: inset(98% 0 0 0);
          }
          75% {
            clip-path: inset(0 98% 0 0);
          }
        }
      `}</style>
      <div
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[inherit] border-2 border-blue-500",
          className
        )}
        style={{
          animation: "clip-border 4s linear infinite",
        }}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[inherit] border-2 border-blue-300 opacity-20",
          className
        )}
      />
    </>
  );
};
