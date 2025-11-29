/**
 * Code generation template for Create User action
 * Used when exporting workflows to standalone Next.js projects
 */
export const createUserCodegenTemplate = `export async function clerkCreateUserStep(input: {
  emailAddress: string;
  password?: string;
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

  const body: Record<string, unknown> = {
    email_address: [input.emailAddress],
  };

  if (input.password) body.password = input.password;
  if (input.firstName) body.first_name = input.firstName;
  if (input.lastName) body.last_name = input.lastName;
  if (input.publicMetadata) body.public_metadata = JSON.parse(input.publicMetadata);
  if (input.privateMetadata) body.private_metadata = JSON.parse(input.privateMetadata);

  const response = await fetch('https://api.clerk.com/v1/users', {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${secretKey}\`,
      'Content-Type': 'application/json',
      'User-Agent': 'workflow-builder.dev',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.errors?.[0]?.message || \`Failed to create user: \${response.status}\`);
  }

  return await response.json();
}`;
