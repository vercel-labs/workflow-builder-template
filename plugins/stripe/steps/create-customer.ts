import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { StripeCredentials } from "../credentials";

const STRIPE_API_URL = "https://api.stripe.com/v1";

type StripeCustomerResponse = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  created: number;
};

type StripeErrorResponse = {
  error: {
    type: string;
    message: string;
    code?: string;
  };
};

type CreateCustomerResult =
  | { success: true; id: string; email: string }
  | { success: false; error: string };

export type CreateCustomerCoreInput = {
  email: string;
  name?: string;
  phone?: string;
  description?: string;
  metadata?: string;
};

export type CreateCustomerInput = StepInput &
  CreateCustomerCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: CreateCustomerCoreInput,
  credentials: StripeCredentials
): Promise<CreateCustomerResult> {
  const apiKey = credentials.STRIPE_SECRET_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:
        "STRIPE_SECRET_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  try {
    const params = new URLSearchParams();
    params.append("email", input.email);

    if (input.name) {
      params.append("name", input.name);
    }
    if (input.phone) {
      params.append("phone", input.phone);
    }
    if (input.description) {
      params.append("description", input.description);
    }
    if (input.metadata) {
      try {
        const metadataObj = JSON.parse(input.metadata) as Record<
          string,
          string
        >;
        for (const [key, value] of Object.entries(metadataObj)) {
          params.append(`metadata[${key}]`, String(value));
        }
      } catch {
        return {
          success: false,
          error: "Invalid metadata JSON format",
        };
      }
    }

    const response = await fetch(`${STRIPE_API_URL}/customers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as StripeErrorResponse;
      return {
        success: false,
        error:
          errorData.error?.message ||
          `HTTP ${response.status}: Failed to create customer`,
      };
    }

    const data = (await response.json()) as StripeCustomerResponse;
    return { success: true, id: data.id, email: data.email };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to create customer: ${message}`,
    };
  }
}

export async function createCustomerStep(
  input: CreateCustomerInput
): Promise<CreateCustomerResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
createCustomerStep.maxRetries = 0;

export const _integrationType = "stripe";

