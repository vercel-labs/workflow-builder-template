import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default withWorkflow(nextConfig);
