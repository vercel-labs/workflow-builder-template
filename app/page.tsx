"use client";

import { Provider } from "jotai";
import { Canvas } from "@/components/ai-elements/canvas";
import { Panel } from "@/components/ai-elements/panel";
import { UserMenu } from "@/components/workflows/user-menu";
import { WorkflowIndexPrompt } from "@/components/workflows/workflow-index-prompt";
import { WorkflowsList } from "@/components/workflows/workflows-list";

export default function Home() {
  return (
    <Provider>
      <div className="fixed top-0 left-0 z-0 h-screen w-screen">
        <Canvas>
          <Panel position="top-left">
            <p>Workflow Builder Template</p>
          </Panel>
          <Panel className="rounded-full p-0" position="top-right">
            <UserMenu />
          </Panel>
          <WorkflowIndexPrompt />
          <Panel className="bg-transparent p-0" position="bottom-center">
            <WorkflowsList limit={3} />
          </Panel>
        </Canvas>
      </div>
    </Provider>
  );
}
