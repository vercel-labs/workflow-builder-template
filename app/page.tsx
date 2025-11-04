'use client';

import { Provider } from 'jotai';
import { WorkflowsList } from '@/components/workflows/workflows-list';
import { Canvas } from '@/components/ai-elements/canvas';
import { Panel } from '@/components/ai-elements/panel';
import { UserMenu } from '@/components/workflows/user-menu';
import { WorkflowIndexPrompt } from '@/components/workflows/workflow-index-prompt';

export default function Home() {
  return (
    <Provider>
      <div className="fixed w-screen h-screen top-0 left-0 z-0">
        <Canvas>
          <Panel position='top-left'>
            <p>Workflow Builder Template</p>
          </Panel>
          <Panel position='top-right' className="rounded-full p-0">
            <UserMenu />
          </Panel>
          <WorkflowIndexPrompt />
          <Panel position='bottom-center' className="p-0 bg-transparent">
            <WorkflowsList limit={3} />
          </Panel>
        </Canvas>
      </div>
    </Provider>
  );
}
