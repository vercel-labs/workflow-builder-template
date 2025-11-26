import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ReactFlowProvider } from "@xyflow/react";
import { Provider } from "jotai";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/auth/provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { PersistentCanvas } from "@/components/workflow/persistent-canvas";
import { mono, sans } from "@/lib/fonts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "AI Workflow Builder - Visual Workflow Automation",
  description:
    "Build powerful AI-driven workflow automations with a visual, node-based editor. Built with Next.js and React Flow.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

type RootLayoutProps = {
  children: ReactNode;
};

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="en" suppressHydrationWarning>
    <body className={cn(sans.variable, mono.variable, "antialiased")}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        disableTransitionOnChange
        enableSystem
      >
        <Provider>
          <AuthProvider>
            <ReactFlowProvider>
              <PersistentCanvas />
              <div className="pointer-events-none relative z-10">
                {children}
              </div>
            </ReactFlowProvider>
            <Toaster />
          </AuthProvider>
        </Provider>
      </ThemeProvider>
    </body>
  </html>
);

export default RootLayout;
