"use client";

import { Provider } from "jotai";
import { AuthProvider } from "@/components/auth/auth-provider";
import { WorkflowsList } from "@/components/workflows/workflows-list";

export default function WorkflowsPage() {
  return (
    <Provider>
      <AuthProvider>
        <WorkflowsList enableSelection showPrompt={false} />
      </AuthProvider>
    </Provider>
  );
}
