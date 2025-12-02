import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";

type WorkflowLayoutProps = {
  children: ReactNode;
  params: Promise<{ workflowId: string }>;
};

export async function generateMetadata({
  params,
}: WorkflowLayoutProps): Promise<Metadata> {
  const { workflowId } = await params;

  // Try to fetch the workflow to get its name
  let title = "Workflow";
  let isPublic = false;

  try {
    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId),
      columns: {
        name: true,
        visibility: true,
      },
    });

    if (workflow) {
      isPublic = workflow.visibility === "public";
      // Only expose workflow name in metadata if it's public
      // This prevents private workflow name enumeration
      if (isPublic) {
        title = workflow.name;
      }
    }
  } catch {
    // Ignore errors, use defaults
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://workflow-builder.dev";
  const workflowUrl = `${baseUrl}/workflows/${workflowId}`;
  const ogImageUrl = isPublic
    ? `${baseUrl}/api/og/workflow/${workflowId}`
    : `${baseUrl}/og-default.png`;

  return {
    title: `${title} | AI Workflow Builder`,
    description: `View and explore the "${title}" workflow built with AI Workflow Builder.`,
    openGraph: {
      title: `${title} | AI Workflow Builder`,
      description: `View and explore the "${title}" workflow built with AI Workflow Builder.`,
      type: "website",
      url: workflowUrl,
      siteName: "AI Workflow Builder",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${title} workflow visualization`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | AI Workflow Builder`,
      description: `View and explore the "${title}" workflow built with AI Workflow Builder.`,
      images: [ogImageUrl],
    },
  };
}

export default function WorkflowLayout({ children }: WorkflowLayoutProps) {
  return children;
}
