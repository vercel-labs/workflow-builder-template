/**
 * Code generation template for Update User action
 * Used when exporting workflows to standalone Next.js projects
 */
export const updateUserCodegenTemplate = `export async function clerkUpdateUserStep(input: {
  userId: string;
  firstName?: string;
  lastName?: string;
  publicMetadata?: string;
  privateMetadata?: string;
}) {
  "use step";

  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY environment variable is required');
  }

  const body: Record<string, unknown> = {};

  if (input.firstName) body.first_name = input.firstName;
  if (input.lastName) body.last_name = input.lastName;
  if (input.publicMetadata) body.public_metadata = JSON.parse(input.publicMetadata);
  if (input.privateMetadata) body.private_metadata = JSON.parse(input.privateMetadata);

  const response = await fetch(
    \`https://api.clerk.com/v1/users/\${input.userId}\`,
    {
      method: 'PATCH',
      headers: {
        Authorization: \`Bearer \${secretKey}\`,
        'Content-Type': 'application/json',
        'User-Agent': 'workflow-builder.dev',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.errors?.[0]?.message || \`Failed to update user: \${response.status}\`);
  }

  return await response.json();
}`;
