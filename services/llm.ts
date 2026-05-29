export type LlmType = 'api' | 'local';

// Everything needed to reach the LLM endpoint. Saved to browser.storage.local
// under the key 'llmConfig' and configured by the user via the Settings UI.
export interface LLMConfig {
  // 'api' = remote provider (e.g. OpenAI). 'local' = locally running model
  // (e.g. LM Studio). Determines the default base URL when none is provided.
  type: LlmType;
  // Root URL of the endpoint, without a trailing slash. The path
  // /chat/completions is appended automatically. Must be explicitly set by
  // the user — no default is applied at the service layer.
  baseUrl: string;
  // Bearer token sent in the Authorization header. Leave blank for local
  // endpoints that don't require authentication.
  apiKey: string;
  // Model identifier passed directly to the API (e.g. 'gpt-4o' or an LM Studio
  // model string). Leave blank to use the endpoint's default model.
  model: string;
}

// Parameters for a single LLM call. Only prompt is required — the rest have
// sensible defaults for JobBuddy's typical use case (structured extraction at
// temperature 0, no timeout).
interface CallLLMParams {
  // Instructions for the LLM. Sent as the system message, which the model
  // treats as trusted direction (e.g. "Extract the job title from the text below.").
  prompt: string;
  // Content for the LLM to act on. Sent as the user message, kept separate from
  // prompt to reduce prompt injection risk — untrusted page text never appears
  // inside the instruction. Omit when the prompt alone is sufficient.
  data?: string | null;
  // Maximum number of tokens in the response. Lower values cost less and respond
  // faster; useful when you know the answer will be short.
  max_tokens?: number;
  // 0 = deterministic and consistent (best for structured extraction).
  // Higher values introduce more variation (suited for creative generation).
  temperature?: number;
  // Cancellation handle. When the linked AbortController is aborted, the fetch
  // is cancelled immediately. The same signal can also cancel event listeners
  // and streams tied to the same logical request. Omit if no cancellation is needed.
  signal?: AbortSignal;
}

// Append URL path to access the API endpoint (i.e. "BASE_URL/chat/completions")
function resolveUrl(config: LLMConfig): string {
  if (!config.baseUrl) throw new Error('No base URL configured. Set one in JobBuddy Settings.');
  return `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;
}

// Call LLM with full access of the access config
export async function callLLMWithConfig(
  config: LLMConfig,
  { prompt, data = null, max_tokens = 8192, temperature = 0, signal }: CallLLMParams,
): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

  // prompt → system role (instructions), data → user role (content to analyze).
  // Keeping them in separate message roles reduces prompt injection risk.
  const messages = [
    { role: 'system', content: prompt },
    ...(data != null ? [{ role: 'user', content: data }] : []),
  ];

  const response = await fetch(resolveUrl(config), {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: config.model || undefined, messages, max_tokens, temperature }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  const result = await response.json();
  return result.choices[0].message.content as string;
}

// Call LLM (simplified version in context of using it outside of testing it in settings)
export async function callLLM(params: CallLLMParams): Promise<string> {
  const stored = await browser.storage.local.get('llmConfig');
  const config = stored.llmConfig as LLMConfig;
  return callLLMWithConfig(config, params);
}

export interface ChatLLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Multi-turn chat call. Prepends the system prompt then sends the full message history.
export async function callLLMChat({
  systemPrompt,
  messages,
  max_tokens = 8192,
  temperature = 0.7,
  signal,
}: {
  systemPrompt: string;
  messages: ChatLLMMessage[];
  max_tokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}): Promise<string> {
  const stored = await browser.storage.local.get('llmConfig');
  const config = stored.llmConfig as LLMConfig;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

  const allMessages = [{ role: 'system', content: systemPrompt }, ...messages];

  const response = await fetch(resolveUrl(config), {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: config.model || undefined, messages: allMessages, max_tokens, temperature }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  const result = await response.json();
  return result.choices[0].message.content as string;
}
