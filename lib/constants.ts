// Vercel deployment configuration
export const VERCEL_DEPLOY_URL =
  "https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel-labs%2Fworkflow-builder-template&env=DATABASE_URL,BETTER_AUTH_SECRET,BETTER_AUTH_URL,VERCEL_API_TOKEN,OPENAI_API_KEY&envDescription=Required+environment+variables+for+workflow-builder-template.+See+README+for+details.&stores=%5B%7B%22type%22%3A%22postgres%22%7D%5D&project-name=workflow-builder-template&repository-name=workflow-builder-template";

// Vercel button URL for markdown
export const VERCEL_DEPLOY_BUTTON_URL = `[![Deploy with Vercel](https://vercel.com/button)](${VERCEL_DEPLOY_URL})`;
