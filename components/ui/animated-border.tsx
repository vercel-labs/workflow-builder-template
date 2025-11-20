"use client";

import { cn } from "@/lib/utils";

interface AnimatedBorderProps {
  className?: string;
}

export const AnimatedBorder = ({ className }: AnimatedBorderProps) => {
  return (
    <>
      <style jsx>{`
        @property --angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }

        @keyframes border-rotate {
          from {
            --angle: 0deg;
          }
          to {
            --angle: 360deg;
          }
        }

        .animate-border-mask {
          animation: border-rotate 2s linear infinite;
          mask-image: conic-gradient(
            from var(--angle),
            transparent 70%,
            black 90%,
            transparent 100%
          );
        }
      `}</style>
      <div
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[inherit] animate-border-mask",
          className
        )}
      >
        <svg
          className="h-full w-full overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="gradient-glow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
          </defs>
          <rect
            x="1"
            y="1"
            width="calc(100% - 2px)"
            height="calc(100% - 2px)"
            rx="6"
            fill="none"
            stroke="url(#gradient-glow)"
            strokeWidth="2"
            style={{
              filter: "drop-shadow(0 0 4px #3b82f6)",
            }}
          />
        </svg>
      </div>
      {/* Static faint border for structure */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[inherit] border-2 border-blue-500/10",
          className
        )}
      />
    </>
  );
};
