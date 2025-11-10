"use client";

import type { ReactNode } from "react";

export function AuthProvider({ children }: { children: ReactNode }) {
  // No automatic session creation - let users browse anonymously
  // Anonymous sessions will be created on-demand when needed
  return <>{children}</>;
}
