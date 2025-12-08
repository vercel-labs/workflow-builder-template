// No test function needed for Discord
// Users provide webhook URLs directly in each step
// Webhook validity will be tested when the workflow runs

export async function testDiscord(_credentials: Record<string, string>) {
  return {
    success: true,
  };
}
