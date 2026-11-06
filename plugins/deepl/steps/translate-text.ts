import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { DeepLCredentials } from "../credentials";

function getBaseUrl(apiKey: string): string {
  // Free API keys end with ":fx"
  return apiKey.endsWith(":fx")
    ? "https://api-free.deepl.com"
    : "https://api.deepl.com";
}

type DeepLTranslation = {
  text: string;
  detected_source_language: string;
};

type DeepLResponse = {
  translations: DeepLTranslation[];
};

type TranslateTextResult =
  | {
      success: true;
      translatedText: string;
      detectedSourceLang: string;
    }
  | { success: false; error: string };

export type TranslateTextCoreInput = {
  text: string;
  targetLang: string;
  sourceLang?: string;
  formality?: string;
  modelType?: string;
};

export type TranslateTextInput = StepInput &
  TranslateTextCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: TranslateTextCoreInput,
  credentials: DeepLCredentials
): Promise<TranslateTextResult> {
  const apiKey = credentials.DEEPL_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:
        "DEEPL_API_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  if (!input.text) {
    return {
      success: false,
      error: "Text to translate is required",
    };
  }

  if (!input.targetLang) {
    return {
      success: false,
      error: "Target language is required",
    };
  }

  try {
    const baseUrl = getBaseUrl(apiKey);

    const body: Record<string, unknown> = {
      text: [input.text],
      target_lang: input.targetLang,
    };

    if (input.sourceLang && input.sourceLang !== "auto") {
      body.source_lang = input.sourceLang;
    }

    if (input.formality && input.formality !== "default") {
      body.formality = input.formality;
    }

    if (input.modelType && input.modelType !== "default") {
      body.model_type = input.modelType;
    }

    const response = await fetch(`${baseUrl}/v2/translate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `DeepL-Auth-Key ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}`,
      };
    }

    const result = (await response.json()) as DeepLResponse;

    if (!result.translations || result.translations.length === 0) {
      return {
        success: false,
        error: "No translation returned from DeepL",
      };
    }

    const translation = result.translations[0];

    return {
      success: true,
      translatedText: translation.text,
      // detected_source_language is always included in DeepL's response, but adding fallback for type safety
      detectedSourceLang:
        translation.detected_source_language || input.sourceLang || "unknown",
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to translate: ${getErrorMessage(error)}`,
    };
  }
}

export async function translateTextStep(
  input: TranslateTextInput
): Promise<TranslateTextResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
translateTextStep.maxRetries = 0;

export const _integrationType = "deepl";
