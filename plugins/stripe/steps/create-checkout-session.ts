import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { StripeCredentials } from "../credentials";

const STRIPE_API_URL = "https://api.stripe.com/v1";

type StripeCheckoutSessionResponse = {
  id: string;
  url: string;
  status: string;
};

type StripeErrorResponse = {
  error: {
    type: string;
    message: string;
    code?: string;
  };
};

type CreateCheckoutSessionResult =
  | { success: true; id: string; url: string }
  | { success: false; error: string };

export type CreateCheckoutSessionCoreInput = {
  mode: "payment" | "subscription";
  priceId: string;
  quantity?: number;
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
  customerEmail?: string;
  allowPromotionCodes?: string;
  metadata?: string;
};

export type CreateCheckoutSessionInput = StepInput &
  CreateCheckoutSessionCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: CreateCheckoutSessionCoreInput,
  credentials: StripeCredentials
): Promise<CreateCheckoutSessionResult> {
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
    params.append("mode", input.mode);
    params.append("line_items[0][price]", input.priceId);
    params.append("line_items[0][quantity]", String(input.quantity || 1));
    params.append("success_url", input.successUrl);
    params.append("cancel_url", input.cancelUrl);

    if (input.customerId) {
      params.append("customer", input.customerId);
    }
    if (input.customerEmail && !input.customerId) {
      params.append("customer_email", input.customerEmail);
    }
    if (input.allowPromotionCodes === "true") {
      params.append("allow_promotion_codes", "true");
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

    const response = await fetch(`${STRIPE_API_URL}/checkout/sessions`, {
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
          `HTTP ${response.status}: Failed to create checkout session`,
      };
    }

    const data = (await response.json()) as StripeCheckoutSessionResponse;
    return { success: true, id: data.id, url: data.url };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to create checkout session: ${message}`,
    };
  }
}

export async function createCheckoutSessionStep(
  input: CreateCheckoutSessionInput
): Promise<CreateCheckoutSessionResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}

export const _integrationType = "stripe";

