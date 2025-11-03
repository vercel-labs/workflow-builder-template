import 'server-only';

export interface GenerateTextParams {
  prompt: string;
  model: string;
  apiKey: string;
  accountId: string;
  maxTokens?: number;
  temperature?: number;
}

export interface GenerateTextResult {
  status: 'success' | 'error';
  text?: string;
  model?: string;
  error?: string;
}

/**
 * Generate text using Cloudflare AI Gateway
 * Supports multiple AI providers through a unified gateway
 */
export async function generateText(params: GenerateTextParams): Promise<GenerateTextResult> {
  try {
    if (!params.apiKey || !params.accountId) {
      return {
        status: 'error',
        error: 'AI Gateway API key or Account ID not configured',
      };
    }

    if (!params.prompt) {
      return {
        status: 'error',
        error: 'Prompt is required',
      };
    }

    // Cloudflare AI Gateway endpoint
    const endpoint = `https://gateway.ai.cloudflare.com/v1/${params.accountId}/workflows/openai/chat/completions`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify({
        model: params.model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: params.prompt,
          },
        ],
        max_tokens: params.maxTokens || 1000,
        temperature: params.temperature || 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        status: 'error',
        error: errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      return {
        status: 'error',
        error: 'No response from AI model',
      };
    }

    return {
      status: 'success',
      text: data.choices[0].message.content,
      model: data.model,
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * List of available models through AI Gateway
 */
export const availableModels = [
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
  { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
  { value: 'gemini-pro', label: 'Gemini Pro' },
  { value: 'llama-3-70b', label: 'Llama 3 70B' },
  { value: 'mistral-large', label: 'Mistral Large' },
];
