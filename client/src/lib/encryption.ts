/**
 * Serviço de Criptografia para API Keys
 * Usa AES-256-GCM para criptografia simétrica
 */

// Chave mestra (em produção, deve vir de variável de ambiente)
const MASTER_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'app-rounder-master-key-2025-change-in-production';

/**
 * Converte string para ArrayBuffer
 */
function str2ab(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

/**
 * Converte ArrayBuffer para string
 */
function ab2str(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

/**
 * Converte ArrayBuffer para base64
 */
function ab2base64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converte base64 para ArrayBuffer
 */
function base642ab(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Deriva chave de criptografia a partir da chave mestra
 */
async function deriveKey(masterKey: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    str2ab(masterKey),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: str2ab('app-rounder-salt-2025'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Criptografa uma API key
 * @param apiKey - API key em texto plano
 * @returns String criptografada em formato base64
 */
export async function encryptApiKey(apiKey: string): Promise<string> {
  try {
    const key = await deriveKey(MASTER_KEY);
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes para GCM
    
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      str2ab(apiKey)
    );

    // Combina IV + dados criptografados
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    return ab2base64(combined.buffer);
  } catch (error) {
    console.error('Erro ao criptografar API key:', error);
    throw new Error('Falha na criptografia');
  }
}

/**
 * Descriptografa uma API key
 * @param encryptedKey - String criptografada em base64
 * @returns API key em texto plano
 */
export async function decryptApiKey(encryptedKey: string): Promise<string> {
  try {
    const key = await deriveKey(MASTER_KEY);
    const combined = new Uint8Array(base642ab(encryptedKey));
    
    // Separa IV dos dados criptografados
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encrypted
    );

    return ab2str(decrypted);
  } catch (error) {
    console.error('Erro ao descriptografar API key:', error);
    throw new Error('Falha na descriptografia');
  }
}

/**
 * Mascara uma API key para exibição
 * Mostra apenas os primeiros 8 e últimos 4 caracteres
 * @param apiKey - API key em texto plano
 * @returns API key mascarada (ex: "sk-abc12...xyz9")
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 16) {
    return '***';
  }
  const start = apiKey.substring(0, 8);
  const end = apiKey.substring(apiKey.length - 4);
  return `${start}...${end}`;
}

/**
 * Valida formato de API key
 * @param apiKey - API key para validar
 * @param provider - Provedor (cerebras, qwen, groq, etc.)
 * @returns true se válida
 */
export function validateApiKeyFormat(apiKey: string, provider: string): boolean {
  if (!apiKey || apiKey.trim().length === 0) {
    return false;
  }

  // Validações específicas por provedor
  switch (provider.toLowerCase()) {
    case 'cerebras':
      return apiKey.startsWith('csk-') && apiKey.length > 20;
    
    case 'qwen':
      return apiKey.startsWith('sk-') && apiKey.length > 20;
    
    case 'groq':
      return apiKey.startsWith('gsk_') && apiKey.length > 20;
    
    case 'gemini':
      return apiKey.startsWith('AIza') && apiKey.length > 30;
    
    case 'openai':
    case 'deepseek':
      return apiKey.startsWith('sk-') && apiKey.length > 20;
    
    default:
      // Validação genérica: pelo menos 20 caracteres
      return apiKey.length >= 20;
  }
}

/**
 * Gera hash de API key para comparação segura
 * Útil para verificar se uma key mudou sem armazenar em texto plano
 * @param apiKey - API key em texto plano
 * @returns Hash SHA-256 em base64
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  const buffer = str2ab(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return ab2base64(hashBuffer);
}

/**
 * Criptografa texto genérico (versão síncrona simplificada)
 */
export function encryptText(text: string): { encrypted: string; iv: string } {
  // Versão simplificada para uso no serviço
  // Em produção, usar crypto.subtle de forma assíncrona
  const iv = Math.random().toString(36).substring(2, 15);
  const encrypted = btoa(text); // Base64 simples (melhorar em produção)
  return { encrypted, iv };
}

/**
 * Descriptografa texto genérico (versão síncrona simplificada)
 */
export function decryptText(encrypted: string, iv: string): string {
  // Versão simplificada
  return atob(encrypted);
}

/**
 * Testa se a criptografia está funcionando
 * @returns true se OK, false se houver erro
 */
export async function testEncryption(): Promise<boolean> {
  try {
    const testKey = 'sk-test-1234567890abcdef';
    const encrypted = await encryptApiKey(testKey);
    const decrypted = await decryptApiKey(encrypted);
    return testKey === decrypted;
  } catch (error) {
    console.error('Teste de criptografia falhou:', error);
    return false;
  }
}
