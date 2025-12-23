import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { LeadMagicIcon } from "./icon";

const leadmagicPlugin: IntegrationPlugin = {
  type: "leadmagic",
  label: "LeadMagic",
  description: "B2B data enrichment and lead intelligence platform",

  icon: LeadMagicIcon,

  formFields: [
    {
      id: "apiKey",
      label: "API Key",
      type: "password",
      placeholder: "Your LeadMagic API key",
      configKey: "apiKey",
      envVar: "LEADMAGIC_API_KEY",
      helpText: "Get your API key from ",
      helpLink: {
        text: "leadmagic.io/dashboard",
        url: "https://leadmagic.io/dashboard",
      },
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testLeadMagic } = await import("./test");
      return testLeadMagic;
    },
  },

  actions: [
    // People Operations
    {
      slug: "email-finder",
      label: "Find Email",
      description: "Find a person's email address using their LinkedIn profile URL",
      category: "LeadMagic",
      stepFunction: "emailFinderStep",
      stepImportPath: "email-finder",
      outputFields: [
        { field: "email", description: "Email address" },
        { field: "email_status", description: "Email status" },
        { field: "first_name", description: "First name" },
        { field: "last_name", description: "Last name" },
        { field: "company", description: "Company" },
        { field: "job_title", description: "Job title" },
      ],
      configFields: [
        {
          key: "profile_url",
          label: "LinkedIn Profile URL",
          type: "template-input",
          placeholder: "https://linkedin.com/in/username or {{NodeName.profileUrl}}",
          required: true,
        },
      ],
    },
    {
      slug: "email-validation",
      label: "Validate Email",
      description: "Validate an email address and check deliverability",
      category: "LeadMagic",
      stepFunction: "emailValidationStep",
      stepImportPath: "email-validation",
      outputFields: [
        { field: "email", description: "Email address" },
        { field: "status", description: "Validation status" },
        { field: "is_valid", description: "Is valid" },
        { field: "is_deliverable", description: "Is deliverable" },
        { field: "is_catch_all", description: "Is catch-all" },
        { field: "is_disposable", description: "Is disposable" },
      ],
      configFields: [
        {
          key: "email",
          label: "Email Address",
          type: "template-input",
          placeholder: "john@example.com or {{NodeName.email}}",
          required: true,
        },
      ],
    },
    {
      slug: "profile-search",
      label: "Search Profile",
      description: "Get detailed profile information from a LinkedIn URL",
      category: "LeadMagic",
      stepFunction: "profileSearchStep",
      stepImportPath: "profile-search",
      outputFields: [
        { field: "first_name", description: "First name" },
        { field: "last_name", description: "Last name" },
        { field: "headline", description: "Headline" },
        { field: "location", description: "Location" },
        { field: "company", description: "Company" },
        { field: "job_title", description: "Job title" },
        { field: "profile_picture", description: "Profile picture URL" },
      ],
      configFields: [
        {
          key: "profile_url",
          label: "LinkedIn Profile URL",
          type: "template-input",
          placeholder: "https://linkedin.com/in/username or {{NodeName.profileUrl}}",
          required: true,
        },
      ],
    },
    {
      slug: "mobile-finder",
      label: "Find Mobile",
      description: "Find a person's mobile phone number from their LinkedIn profile",
      category: "LeadMagic",
      stepFunction: "mobileFinderStep",
      stepImportPath: "mobile-finder",
      outputFields: [
        { field: "mobile", description: "Mobile number" },
        { field: "mobile_status", description: "Mobile status" },
        { field: "first_name", description: "First name" },
        { field: "last_name", description: "Last name" },
      ],
      configFields: [
        {
          key: "profile_url",
          label: "LinkedIn Profile URL",
          type: "template-input",
          placeholder: "https://linkedin.com/in/username or {{NodeName.profileUrl}}",
          required: true,
        },
      ],
    },
    {
      slug: "role-finder",
      label: "Find Role",
      description: "Find a person at a company by their role/title",
      category: "LeadMagic",
      stepFunction: "roleFinderStep",
      stepImportPath: "role-finder",
      outputFields: [
        { field: "first_name", description: "First name" },
        { field: "last_name", description: "Last name" },
        { field: "email", description: "Email address" },
        { field: "job_title", description: "Job title" },
        { field: "linkedin_url", description: "LinkedIn URL" },
      ],
      configFields: [
        {
          key: "company_name",
          label: "Company Name",
          type: "template-input",
          placeholder: "Acme Inc or {{NodeName.companyName}}",
          required: true,
        },
        {
          key: "role",
          label: "Role/Title",
          type: "template-input",
          placeholder: "CEO or {{NodeName.role}}",
          required: true,
        },
      ],
    },
    {
      slug: "b2b-profile-email",
      label: "B2B Profile Email",
      description: "Get B2B profile data and email from a LinkedIn URL",
      category: "LeadMagic",
      stepFunction: "b2bProfileEmailStep",
      stepImportPath: "b2b-profile-email",
      outputFields: [
        { field: "email", description: "Email address" },
        { field: "first_name", description: "First name" },
        { field: "last_name", description: "Last name" },
        { field: "company", description: "Company" },
        { field: "job_title", description: "Job title" },
        { field: "linkedin_url", description: "LinkedIn URL" },
      ],
      configFields: [
        {
          key: "profile_url",
          label: "LinkedIn Profile URL",
          type: "template-input",
          placeholder: "https://linkedin.com/in/username or {{NodeName.profileUrl}}",
          required: true,
        },
      ],
    },
    // Company Operations
    {
      slug: "company-search",
      label: "Search Company",
      description: "Get company information from a domain or LinkedIn URL",
      category: "LeadMagic",
      stepFunction: "companySearchStep",
      stepImportPath: "company-search",
      outputFields: [
        { field: "name", description: "Company name" },
        { field: "domain", description: "Domain" },
        { field: "industry", description: "Industry" },
        { field: "employee_count", description: "Employee count" },
        { field: "location", description: "Location" },
        { field: "description", description: "Description" },
        { field: "linkedin_url", description: "LinkedIn URL" },
      ],
      configFields: [
        {
          key: "domain",
          label: "Company Domain",
          type: "template-input",
          placeholder: "example.com or {{NodeName.domain}}",
        },
        {
          key: "linkedin_url",
          label: "LinkedIn Company URL",
          type: "template-input",
          placeholder: "https://linkedin.com/company/example or {{NodeName.linkedinUrl}}",
        },
      ],
    },
    {
      slug: "technographics",
      label: "Get Technographics",
      description: "Get technology stack information for a company",
      category: "LeadMagic",
      stepFunction: "technographicsStep",
      stepImportPath: "technographics",
      outputFields: [
        { field: "domain", description: "Domain" },
        { field: "technologies", description: "Technologies" },
        { field: "categories", description: "Categories" },
      ],
      configFields: [
        {
          key: "domain",
          label: "Company Domain",
          type: "template-input",
          placeholder: "example.com or {{NodeName.domain}}",
          required: true,
        },
      ],
    },
    {
      slug: "company-funding",
      label: "Get Company Funding",
      description: "Get funding information for a company",
      category: "LeadMagic",
      stepFunction: "companyFundingStep",
      stepImportPath: "company-funding",
      outputFields: [
        { field: "company_name", description: "Company name" },
        { field: "total_funding", description: "Total funding" },
        { field: "last_funding_date", description: "Last funding date" },
        { field: "last_funding_amount", description: "Last funding amount" },
        { field: "funding_rounds", description: "Funding rounds" },
      ],
      configFields: [
        {
          key: "domain",
          label: "Company Domain",
          type: "template-input",
          placeholder: "example.com or {{NodeName.domain}}",
          required: true,
        },
      ],
    },
  ],
};

registerIntegration(leadmagicPlugin);

export default leadmagicPlugin;
