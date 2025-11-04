import { Provider } from "jotai";
import { Canvas } from "@/components/ai-elements/canvas";
import { Panel } from "@/components/ai-elements/panel";
import { Recents } from "@/components/workflows/recents";
import { UserMenu } from "@/components/workflows/user-menu";
import { WorkflowIndexPrompt } from "@/components/workflows/workflow-index-prompt";

const Home = () => (
  <Provider>
    <div className="fixed top-0 left-0 z-0 h-screen w-screen">
      <Canvas>
        <Panel className="rounded-full p-0" position="top-right">
          <UserMenu />
        </Panel>
        <WorkflowIndexPrompt />
        <Panel
          className="w-full max-w-md border-none bg-transparent p-0"
          position="bottom-center"
        >
          <Recents limit={3} />
        </Panel>
      </Canvas>
    </div>
  </Provider>
);

export default Home;
