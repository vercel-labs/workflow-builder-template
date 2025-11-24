import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Provider } from "jotai";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/auth/provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { mono, sans } from "@/lib/fonts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Workflow Builder - Visual Workflow Automation",
  description:
    "Build powerful workflow automations with a visual, node-based editor. Similar to n8n, built with Next.js and React Flow.",
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
            {children}
            <Toaster />
          </AuthProvider>
        </Provider>
      </ThemeProvider>
    </body>
  </html>
);

export default RootLayout;
