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
  description: string | null;
  metadata: Record<string, string>;
};

type StripeCustomerListResponse = {
  data: StripeCustomerResponse[];
};

type StripeErrorResponse = {
  error: {
    type: string;
    message: string;
    code?: string;
  };
};

type GetCustomerResult =
  | {
      success: true;
      id: string;
      email: string;
      name: string | null;
      created: number;
    }
  | { success: false; error: string };

export type GetCustomerCoreInput = {
  customerId?: string;
  email?: string;
};

export type GetCustomerInput = StepInput &
  GetCustomerCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: GetCustomerCoreInput,
  credentials: StripeCredentials
): Promise<GetCustomerResult> {
  const apiKey = credentials.STRIPE_SECRET_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:
        "STRIPE_SECRET_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  if (!input.customerId && !input.email) {
    return {
      success: false,
      error: "Either Customer ID or Email is required",
    };
  }

  try {
    let customer: StripeCustomerResponse | null = null;

    if (input.customerId) {
      // Direct lookup by ID
      const response = await fetch(
        `${STRIPE_API_URL}/customers/${input.customerId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = (await response.json()) as StripeErrorResponse;
        return {
          success: false,
          error:
            errorData.error?.message ||
            `HTTP ${response.status}: Failed to get customer`,
        };
      }

      customer = (await response.json()) as StripeCustomerResponse;
    } else if (input.email) {
      // Search by email
      const params = new URLSearchParams();
      params.append("email", input.email);
      params.append("limit", "1");

      const response = await fetch(
        `${STRIPE_API_URL}/customers?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = (await response.json()) as StripeErrorResponse;
        return {
          success: false,
          error:
            errorData.error?.message ||
            `HTTP ${response.status}: Failed to search customers`,
        };
      }

      const data = (await response.json()) as StripeCustomerListResponse;
      if (data.data.length === 0) {
        return {
          success: false,
          error: `No customer found with email: ${input.email}`,
        };
      }
      customer = data.data[0];
    }

    if (!customer) {
      return {
        success: false,
        error: "Customer not found",
      };
    }

    return {
      success: true,
      id: customer.id,
      email: customer.email,
      name: customer.name,
      created: customer.created,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to get customer: ${message}`,
    };
  }
}

export async function getCustomerStep(
  input: GetCustomerInput
): Promise<GetCustomerResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
getCustomerStep.maxRetries = 0;

export const _integrationType = "stripe";

