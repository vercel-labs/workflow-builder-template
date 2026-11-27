import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { HunterCredentials } from "../credentials";

type PersonData = {
  fullName?: string;
  givenName?: string;
  familyName?: string;
  email?: string;
  location?: string;
  timezone?: string;
  title?: string;
  role?: string;
  seniority?: string;
  domain?: string;
  company?: string;
  twitter?: string;
  linkedin?: string;
  phone?: string;
};

type CompanyData = {
  domain?: string;
  name?: string;
  headcount?: string;
  industry?: string;
  country?: string;
  state?: string;
  city?: string;
  twitter?: string;
  linkedin?: string;
  facebook?: string;
};

type EnrichLeadResult =
  | {
      success: true;
      enrichmentType: string;
      person?: PersonData;
      company?: CompanyData;
    }
  | { success: false; error: string };

export type EnrichLeadCoreInput = {
  email: string;
  enrichmentType?: "individual" | "company" | "combined";
};

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export type EnrichLeadInput = StepInput &
  EnrichLeadCoreInput & {
    integrationId?: string;
  };

async function fetchPersonData(
  email: string,
  apiKey: string
): Promise<PersonData | null> {
  const url = new URL("https://api.hunter.io/v2/people/find");
  url.searchParams.set("email", email);
  url.searchParams.set("api_key", apiKey);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.errors?.[0]?.details || `HTTP ${response.status}: ${response.statusText}`
    );
  }

  const result = await response.json();
  const data = result.data;

  if (!data) {
    return null;
  }

  return {
    fullName: data.name?.fullName,
    givenName: data.name?.givenName,
    familyName: data.name?.familyName,
    email: data.email,
    location: data.location,
    timezone: data.timeZone,
    title: data.employment?.title,
    role: data.employment?.role,
    seniority: data.employment?.seniority,
    domain: data.employment?.domain,
    company: data.employment?.name,
    twitter: data.twitter?.handle,
    linkedin: data.linkedin?.handle,
    phone: data.phone,
  };
}

async function fetchCompanyData(
  domain: string,
  apiKey: string
): Promise<CompanyData | null> {
  const url = new URL("https://api.hunter.io/v2/companies/find");
  url.searchParams.set("domain", domain);
  url.searchParams.set("api_key", apiKey);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.errors?.[0]?.details || `HTTP ${response.status}: ${response.statusText}`
    );
  }

  const result = await response.json();
  const data = result.data;

  if (!data) {
    return null;
  }

  return {
    domain: data.domain,
    name: data.name,
    headcount: data.headcount,
    industry: data.industry,
    country: data.country,
    state: data.state,
    city: data.city,
    twitter: data.twitter,
    linkedin: data.linkedin,
    facebook: data.facebook,
  };
}

async function fetchCombinedData(
  email: string,
  apiKey: string
): Promise<{ person: PersonData | null; company: CompanyData | null }> {
  const url = new URL("https://api.hunter.io/v2/combined/find");
  url.searchParams.set("email", email);
  url.searchParams.set("api_key", apiKey);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return { person: null, company: null };
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.errors?.[0]?.details || `HTTP ${response.status}: ${response.statusText}`
    );
  }

  const result = await response.json();
  const data = result.data;

  if (!data) {
    return { person: null, company: null };
  }

  const person: PersonData | null = data.person
    ? {
        fullName: data.person.name?.fullName,
        givenName: data.person.name?.givenName,
        familyName: data.person.name?.familyName,
        email: data.person.email,
        location: data.person.location,
        timezone: data.person.timeZone,
        title: data.person.employment?.title,
        role: data.person.employment?.role,
        seniority: data.person.employment?.seniority,
        domain: data.person.employment?.domain,
        company: data.person.employment?.name,
        twitter: data.person.twitter?.handle,
        linkedin: data.person.linkedin?.handle,
        phone: data.person.phone,
      }
    : null;

  const company: CompanyData | null = data.company
    ? {
        domain: data.company.domain,
        name: data.company.name,
        headcount: data.company.headcount,
        industry: data.company.industry,
        country: data.company.country,
        state: data.company.state,
        city: data.company.city,
        twitter: data.company.twitter,
        linkedin: data.company.linkedin,
        facebook: data.company.facebook,
      }
    : null;

  return { person, company };
}

function extractDomain(email: string): string | null {
  const parts = email.split("@");
  if (parts.length !== 2) {
    return null;
  }
  return parts[1];
}

async function stepHandler(
  input: EnrichLeadCoreInput,
  credentials: HunterCredentials
): Promise<EnrichLeadResult> {
  const apiKey = credentials.HUNTER_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:
        "HUNTER_API_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  const enrichmentType = input.enrichmentType || "combined";
  const email = input.email.trim();

  if (!isValidEmail(email)) {
    return {
      success: false,
      error: "Invalid email address format",
    };
  }

  try {
    let person: PersonData | null = null;
    let company: CompanyData | null = null;

    if (enrichmentType === "individual") {
      person = await fetchPersonData(email, apiKey);
    } else if (enrichmentType === "company") {
      const domain = extractDomain(email);
      if (!domain) {
        return {
          success: false,
          error: "Invalid email format - could not extract domain",
        };
      }
      company = await fetchCompanyData(domain, apiKey);
    } else {
      const result = await fetchCombinedData(email, apiKey);
      person = result.person;
      company = result.company;
    }

    if (!person && !company) {
      return {
        success: false,
        error: "No enrichment data found for the provided identifier",
      };
    }

    return {
      success: true,
      enrichmentType,
      ...(person && { person }),
      ...(company && { company }),
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to enrich lead: ${getErrorMessage(error)}`,
    };
  }
}

export async function enrichLeadStep(
  input: EnrichLeadInput
): Promise<EnrichLeadResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}

export const _integrationType = "hunter";
