/**
 * Code generation template for Get User action
 * Used when exporting workflows to standalone Next.js projects
 */
export const getUserCodegenTemplate = `export async function clerkGetUserStep(input: {
  userId: string;
}) {
  "use step";

  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY environment variable is required');
  }

  const response = await fetch(
    \`https://api.clerk.com/v1/users/\${input.userId}\`,
    {
      headers: {
        Authorization: \`Bearer \${secretKey}\`,
        'Content-Type': 'application/json',
        'User-Agent': 'workflow-builder.dev',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.errors?.[0]?.message || \`Failed to get user: \${response.status}\`);
  }

  return await response.json();
}`;
