import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { GitHubIcon } from "./icon";

const githubPlugin: IntegrationPlugin = {
  type: "github",
  label: "GitHub",
  description: "Create and manage issues in GitHub repositories",

  icon: GitHubIcon,

  formFields: [
    {
      id: "token",
      label: "Personal Access Token",
      type: "password",
      placeholder: "ghp_... or github_pat_...",
      configKey: "token",
      envVar: "GITHUB_TOKEN",
      helpText: "Create a token with 'repo' scope from ",
      helpLink: {
        text: "github.com/settings/tokens",
        url: "https://github.com/settings/tokens",
      },
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testGitHub } = await import("./test");
      return testGitHub;
    },
  },

  actions: [
    {
      slug: "create-issue",
      label: "Create Issue",
      description: "Create a new issue in a GitHub repository",
      category: "GitHub",
      stepFunction: "createIssueStep",
      stepImportPath: "create-issue",
      outputFields: [
        { field: "id", description: "Unique ID of the created issue" },
        { field: "number", description: "Issue number in the repository" },
        { field: "title", description: "Title of the issue" },
        { field: "url", description: "URL to view the issue on GitHub" },
        { field: "state", description: "State of the issue (open/closed)" },
      ],
      configFields: [
        {
          key: "owner",
          label: "Repository Owner",
          type: "template-input",
          placeholder: "octocat or {{NodeName.owner}}",
          example: "octocat",
          required: true,
        },
        {
          key: "repo",
          label: "Repository Name",
          type: "template-input",
          placeholder: "hello-world or {{NodeName.repo}}",
          example: "hello-world",
          required: true,
        },
        {
          key: "title",
          label: "Issue Title",
          type: "template-input",
          placeholder: "Bug report or {{NodeName.title}}",
          example: "Bug: Login button not working",
          required: true,
        },
        {
          key: "body",
          label: "Issue Body",
          type: "template-textarea",
          placeholder:
            "Describe the issue. Use {{NodeName.field}} to insert data from previous nodes.",
          rows: 4,
          example: "Steps to reproduce:\n1. Go to login page\n2. Click login button",
        },
        {
          key: "labels",
          label: "Labels (comma-separated)",
          type: "template-input",
          placeholder: "bug, help wanted",
          example: "bug, help wanted",
        },
        {
          key: "assignees",
          label: "Assignees (comma-separated)",
          type: "template-input",
          placeholder: "octocat, hubot",
          example: "octocat",
        },
      ],
    },
    {
      slug: "list-issues",
      label: "List Issues",
      description: "List issues in a GitHub repository",
      category: "GitHub",
      stepFunction: "listIssuesStep",
      stepImportPath: "list-issues",
      outputFields: [
        { field: "issues", description: "Array of issue objects" },
        { field: "count", description: "Number of issues returned" },
      ],
      configFields: [
        {
          key: "owner",
          label: "Repository Owner",
          type: "template-input",
          placeholder: "octocat or {{NodeName.owner}}",
          example: "octocat",
          required: true,
        },
        {
          key: "repo",
          label: "Repository Name",
          type: "template-input",
          placeholder: "hello-world or {{NodeName.repo}}",
          example: "hello-world",
          required: true,
        },
        {
          key: "state",
          label: "State",
          type: "select",
          defaultValue: "open",
          options: [
            { value: "open", label: "Open" },
            { value: "closed", label: "Closed" },
            { value: "all", label: "All" },
          ],
        },
        {
          key: "labels",
          label: "Labels (comma-separated)",
          type: "template-input",
          placeholder: "bug, help wanted",
        },
        {
          key: "assignee",
          label: "Assignee",
          type: "template-input",
          placeholder: "octocat or {{NodeName.assignee}}",
        },
        {
          key: "perPage",
          label: "Results per page",
          type: "number",
          min: 1,
          defaultValue: "30",
        },
      ],
    },
    {
      slug: "get-issue",
      label: "Get Issue",
      description: "Get details of a specific issue",
      category: "GitHub",
      stepFunction: "getIssueStep",
      stepImportPath: "get-issue",
      outputFields: [
        { field: "id", description: "Unique ID of the issue" },
        { field: "number", description: "Issue number in the repository" },
        { field: "title", description: "Title of the issue" },
        { field: "url", description: "URL to view the issue on GitHub" },
        { field: "state", description: "State of the issue (open/closed)" },
        { field: "body", description: "Body content of the issue" },
        { field: "labels", description: "Array of label names" },
        { field: "assignees", description: "Array of assignee usernames" },
        { field: "author", description: "Username of the issue creator" },
        { field: "createdAt", description: "ISO timestamp when issue was created" },
        { field: "updatedAt", description: "ISO timestamp when issue was last updated" },
        { field: "closedAt", description: "ISO timestamp when issue was closed" },
        { field: "commentsCount", description: "Number of comments on the issue" },
      ],
      configFields: [
        {
          key: "owner",
          label: "Repository Owner",
          type: "template-input",
          placeholder: "octocat or {{NodeName.owner}}",
          example: "octocat",
          required: true,
        },
        {
          key: "repo",
          label: "Repository Name",
          type: "template-input",
          placeholder: "hello-world or {{NodeName.repo}}",
          example: "hello-world",
          required: true,
        },
        {
          key: "issueNumber",
          label: "Issue Number",
          type: "template-input",
          placeholder: "123 or {{NodeName.issueNumber}}",
          example: "123",
          required: true,
        },
      ],
    },
    {
      slug: "update-issue",
      label: "Update Issue",
      description: "Update an existing issue in a GitHub repository",
      category: "GitHub",
      stepFunction: "updateIssueStep",
      stepImportPath: "update-issue",
      outputFields: [
        { field: "id", description: "Unique ID of the updated issue" },
        { field: "number", description: "Issue number in the repository" },
        { field: "title", description: "Title of the issue" },
        { field: "url", description: "URL to view the issue on GitHub" },
        { field: "state", description: "State of the issue (open/closed)" },
      ],
      configFields: [
        {
          key: "owner",
          label: "Repository Owner",
          type: "template-input",
          placeholder: "octocat or {{NodeName.owner}}",
          example: "octocat",
          required: true,
        },
        {
          key: "repo",
          label: "Repository Name",
          type: "template-input",
          placeholder: "hello-world or {{NodeName.repo}}",
          example: "hello-world",
          required: true,
        },
        {
          key: "issueNumber",
          label: "Issue Number",
          type: "template-input",
          placeholder: "123 or {{NodeName.issueNumber}}",
          example: "123",
          required: true,
        },
        {
          key: "title",
          label: "New Title (optional)",
          type: "template-input",
          placeholder: "Updated title or {{NodeName.title}}",
        },
        {
          key: "body",
          label: "New Body (optional)",
          type: "template-textarea",
          placeholder: "Updated description. Use {{NodeName.field}} to insert data.",
          rows: 4,
        },
        {
          key: "state",
          label: "State",
          type: "select",
          options: [
            { value: "", label: "No change" },
            { value: "open", label: "Open" },
            { value: "closed", label: "Closed" },
          ],
        },
        {
          key: "labels",
          label: "Labels (comma-separated, replaces existing)",
          type: "template-input",
          placeholder: "bug, help wanted",
        },
        {
          key: "assignees",
          label: "Assignees (comma-separated, replaces existing)",
          type: "template-input",
          placeholder: "octocat, hubot",
        },
      ],
    },
  ],
};

registerIntegration(githubPlugin);

export default githubPlugin;

