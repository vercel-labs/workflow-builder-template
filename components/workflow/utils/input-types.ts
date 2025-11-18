/**
 * Input type definitions for workflow step functions
 */

export const getEmailInputType = (): string => `{
  to: string;
  subject: string;
  body: string;
}`;

export const getSlackInputType = (): string => `{
  channel: string;
  text: string;
}`;

export const getDatabaseInputType = (): string => `{
  query: string;
}`;

export const getAiTextInputType = (): string => `{
  model: string;
  prompt: string;
  format?: 'text' | 'object';
  schema?: any;
}`;

export const getAiImageInputType = (): string => `{
  model: string;
  prompt: string;
}`;

export const getTicketInputType = (): string => `{
  title: string;
  description: string;
}`;

export const getLinearInputType = (): string => `{
  title: string;
  description: string;
}`;

export const getExecuteCodeInputType = (
  config: Record<string, unknown>
): string => {
  const codeLanguage = (config?.codeLanguage as string) || "javascript";
  return `{
  code: string;
  language?: '${codeLanguage}';
}`;
};

export const getFindIssuesInputType = (): string => `{
  assigneeId: string;
  status: string;
}`;

export const getConditionInputType = (): string => `{
  condition: boolean;
}`;
