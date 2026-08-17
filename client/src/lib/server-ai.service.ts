import { getAccessToken } from './api';

export type SecureProvider = 'cerebras' | 'deepseek' | 'groq' | 'qwen' | 'openai';

async function readError(response: Response): Promise<string> {
  const payload = await response.json().catch(() => null);
  return payload?.error || 'Não foi possível concluir esta etapa com o provedor de IA.';
}

function authorizationHeaders(): HeadersInit {
  const token = getAccessToken();
  if (!token) throw new Error('Sua sessão expirou. Entre novamente para continuar.');
  return { Authorization: `Bearer ${token}` };
}

export async function secureChat(input: {
  provider: SecureProvider;
  model: string;
  system: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authorizationHeaders() },
    body: JSON.stringify({
      provider: input.provider,
      model: input.model,
      system: input.system,
      prompt: input.prompt,
      temperature: input.temperature ?? 0.3,
      max_tokens: input.maxTokens ?? 8000,
    }),
  });
  if (!response.ok) throw new Error(await readError(response));
  const payload = await response.json();
  return String(payload.content || '');
}

export async function secureTranscription(file: File): Promise<string> {
  const body = new FormData();
  body.append('file', file);
  const response = await fetch('/api/ai/transcribe', {
    method: 'POST',
    credentials: 'include',
    headers: authorizationHeaders(),
    body,
  });
  if (!response.ok) throw new Error(await readError(response));
  const payload = await response.json();
  return String(payload.text || '');
}
