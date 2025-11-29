/**
 * Code generation template for Delete User action
 * Used when exporting workflows to standalone Next.js projects
 */
export const deleteUserCodegenTemplate = `export async function clerkDeleteUserStep(input: {
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
      method: 'DELETE',
      headers: {
        Authorization: \`Bearer \${secretKey}\`,
        'Content-Type': 'application/json',
        'User-Agent': 'workflow-builder.dev',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.errors?.[0]?.message || \`Failed to delete user: \${response.status}\`);
  }

  return { deleted: true, id: input.userId };
}`;
