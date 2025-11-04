"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { useSession } from "@/lib/auth-client";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending, error } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Add a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (isPending) {
        console.warn("Session check timed out, redirecting to login");
        router.push("/login");
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [isPending, router]);

  useEffect(() => {
    if (!(isPending || session) && pathname !== "/login") {
      router.push("/login");
    }
  }, [session, isPending, router, pathname]);

  // Show error if session check failed
  if (error) {
    console.error("Auth error:", error);
    if (pathname !== "/login") {
      router.push("/login");
    }
    return null;
  }

  // Don't block rendering while checking auth
  // The content will show immediately, and we'll redirect if needed
  return <>{children}</>;
}
