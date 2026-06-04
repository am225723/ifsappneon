/* global process */

const OPENROUTER_CHAT_COMPLETIONS_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_OPENROUTER_MODEL = 'openrouter/free';

function safeProviderError(message, statusCode = 500, code = 'openrouter_request_failed') {
  return Object.assign(new Error(message), { statusCode, code });
}

export async function callOpenRouterChat({
  messages,
  temperature = 0.4,
  maxTokens = 800,
  model = process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL
} = {}) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw safeProviderError('OpenRouter messages are required.', 400, 'openrouter_messages_required');
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw safeProviderError('OpenRouter API key missing. Configure OPENROUTER_API_KEY on the server.', 500, 'openrouter_api_key_missing');
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  if (process.env.OPENROUTER_SITE_URL) headers['HTTP-Referer'] = process.env.OPENROUTER_SITE_URL;
  if (process.env.OPENROUTER_APP_TITLE) headers['X-Title'] = process.env.OPENROUTER_APP_TITLE;

  let response;
  try {
    response = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens
      })
    });
  } catch {
    throw safeProviderError('OpenRouter request failed. Please try again later.', 502, 'openrouter_network_error');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerMessage = payload?.error?.message;
    const message = providerMessage
      ? `OpenRouter request failed: ${providerMessage}`
      : `OpenRouter request failed with status ${response.status}.`;
    throw safeProviderError(message, response.status >= 500 ? 502 : 500, 'openrouter_request_failed');
  }

  const text = payload?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw safeProviderError('OpenRouter returned an empty response.', 502, 'openrouter_empty_response');
  }

  return {
    text,
    model: payload?.model || model,
    provider: 'openrouter',
    rawUsage: payload?.usage || null
  };
}

export const OPENROUTER_PROVIDER = {
  provider: 'openrouter',
  endpoint: OPENROUTER_CHAT_COMPLETIONS_URL,
  defaultModel: DEFAULT_OPENROUTER_MODEL
};
