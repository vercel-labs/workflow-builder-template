import "server-only";

import { createGateway, embed, embedMany } from "ai";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessageAsync } from "@/lib/utils";
import type { AiGatewayCredentials } from "../credentials";

type GenerateEmbeddingsResult =
	| { success: true; embedding: number[]; }
	| {
		success: true;
		embeddings: number[][];
	}
	| { success: false; error: string };

export type GenerateEmbeddingsCoreInput = {
	embeddingMode: "single" | "batch";
	embeddingModel: string;
	embeddingValue?: string;
	embeddingValues?: string;
};

export type GenerateEmbeddingsInput = StepInput &
	GenerateEmbeddingsCoreInput & {
		integrationId?: string;
	};


/**
 * Parse batch embedding values from textarea input (one per line)
 */
function parseEmbeddingValues(valuesText?: string): string[] {
	if (!valuesText) {
		return [];
	}

	return valuesText
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

/**
 * Core logic - portable between app and export
 */
async function stepHandler(
	input: GenerateEmbeddingsCoreInput,
	credentials: AiGatewayCredentials,
): Promise<GenerateEmbeddingsResult> {
	const apiKey = credentials.AI_GATEWAY_API_KEY;

	if (!apiKey) {
		return {
			success: false,
			error:
				"AI_GATEWAY_API_KEY is not configured. Please add it in Project Integrations.",
		};
	}

	const mode = input.embeddingMode || "single";
	const modelId = input.embeddingModel || "openai/text-embedding-3-small";

	try {
		const gateway = createGateway({
			apiKey,
		});

		// Handle single embedding mode
		if (mode === "single") {
			const value = input.embeddingValue?.trim() || "";

			if (!value) {
				return {
					success: false,
					error: "Embedding value is required for single mode",
				};
			}

			const { embedding } = await embed({
				model: gateway.textEmbeddingModel(modelId),
				value,
			});

			return {
				success: true,
				embedding,
			};
		}

		// Handle batch embedding mode
		if (mode === "batch") {
			const valuesText = input.embeddingValues?.trim() || "";
			const values = parseEmbeddingValues(valuesText);

			if (values.length === 0) {
				return {
					success: false,
					error:
						"At least one embedding value is required for batch mode (one per line)",
				};
			}

			const { embeddings } = await embedMany({
				model: gateway.textEmbeddingModel(modelId),
				values,
			});

			return {
				success: true,
				embeddings,
			};
		}

		return {
			success: false,
			error: `Invalid embedding mode: ${mode}`,
		};
	} catch (error) {
		const message = await getErrorMessageAsync(error);
		return {
			success: false,
			error: `Embedding generation failed: ${message}`,
		};
	}
}

/**
 * App entry point - fetches credentials and wraps with logging
 */
export async function generateEmbeddingsStep(
	input: GenerateEmbeddingsInput,
): Promise<GenerateEmbeddingsResult> {
	"use step";

	const credentials = input.integrationId
		? await fetchCredentials(input.integrationId)
		: {};

	return withStepLogging(input, () => stepHandler(input, credentials));
}
generateEmbeddingsStep.maxRetries = 0;

export const _integrationType = "ai-gateway";
