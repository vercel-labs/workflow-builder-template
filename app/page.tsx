'use client';

import { Provider } from 'jotai';
import { WorkflowsList } from '@/components/workflows/workflows-list';

export default function Home() {
  return (
    <Provider>
      <WorkflowsList limit={3} />
    </Provider>
  );
}
