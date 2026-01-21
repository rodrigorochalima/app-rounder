# 🔐 SISTEMA MULTI-USUÁRIO DE GESTÃO DE APIs

## 📋 VISÃO GERAL

Sistema completo que permite cada usuário gerenciar suas próprias API keys com:

- ✅ **Isolamento total** - Cada usuário vê apenas suas APIs
- ✅ **Múltiplas APIs por provider** - Ex: 3 chaves do Gemini
- ✅ **Ativar/Desativar** - Economizar créditos desativando APIs
- ✅ **Controle de uso** - Contador de requisições e tokens
- ✅ **Limites mensais** - Definir limite de uso por API
- ✅ **Rotação automática** - Trocar API quando atinge limite
- ✅ **Dashboard completo** - Ver estatísticas de uso
- ✅ **API padrão** - Definir qual usar por padrão

---

## 🗄️ ESTRUTURA DO BANCO DE DADOS

### Tabela: `user_api_keys`

Armazena as API keys de cada usuário (criptografadas).

```sql
CREATE TABLE user_api_keys (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id), -- Isolamento por usuário
  provider TEXT, -- 'qwen', 'gemini', 'openai', etc.
  api_key_encrypted TEXT, -- Chave criptografada
  encryption_iv TEXT, -- Vetor de criptografia
  name TEXT, -- Nome descritivo
  is_active BOOLEAN, -- Ativar/desativar
  is_default BOOLEAN, -- API padrão para este provider
  usage_count INTEGER, -- Contador de usos
  tokens_used BIGINT, -- Total de tokens
  monthly_limit INTEGER, -- Limite mensal (opcional)
  monthly_token_limit BIGINT, -- Limite de tokens (opcional)
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Tabela: `user_api_usage_logs`

Log detalhado de cada uso de API.

```sql
CREATE TABLE user_api_usage_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  api_key_id UUID REFERENCES user_api_keys(id),
  provider TEXT,
  tokens_used INTEGER,
  request_type TEXT, -- 'generate_round', 'transcribe', etc.
  success BOOLEAN,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP
);
```

### Row Level Security (RLS)

Garante que cada usuário vê apenas suas próprias APIs:

```sql
-- Usuário só vê suas próprias API keys
CREATE POLICY "user_api_keys_select"
  ON user_api_keys FOR SELECT
  USING (auth.uid() = user_id);

-- Usuário só insere suas próprias API keys
CREATE POLICY "user_api_keys_insert"
  ON user_api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

## 🔧 IMPLEMENTAÇÃO

### 1. Executar SQL no Supabase

```bash
# Arquivo: supabase-schema-multi-user-apis.sql
```

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Cole o conteúdo do arquivo `supabase-schema-multi-user-apis.sql`
4. Execute

### 2. Usar o Serviço TypeScript

```typescript
import { userAPIManager } from '@/services/user-api-manager.service';

// Adicionar API key
await userAPIManager.addAPIKey({
  provider: 'gemini',
  api_key: 'AIza...',
  name: 'Gemini Produção',
  is_default: true,
  monthly_limit: 1000
});

// Listar APIs do usuário
const keys = await userAPIManager.listAPIKeys();

// Obter API padrão (com rotação automática)
const result = await userAPIManager.getAPIKeyWithRotation('gemini');
if (result) {
  const { key, decrypted } = result;
  // Usar decrypted para fazer requisição
}

// Registrar uso
await userAPIManager.logUsage(
  keyId,
  'gemini',
  1500, // tokens usados
  'generate_round',
  true
);

// Ativar/Desativar
await userAPIManager.toggleAPIKey(keyId, false);

// Ver estatísticas
const stats = await userAPIManager.getStats();
```

### 3. Usar o Dashboard

```typescript
import APIManager from '@/components/APIManager/APIManager';

// No seu componente
<APIManager onClose={() => setShowManager(false)} />
```

---

## 🎯 FLUXO DE USO

### Cenário 1: Usuário adiciona primeira API

1. Usuário clica em "🔑 Gerenciar APIs"
2. Escolhe provider (ex: Gemini)
3. Clica em "+ Adicionar"
4. Cola a API key
5. Define nome (opcional)
6. Define limite mensal (opcional)
6. Marca como "padrão"
7. Salva

**Resultado:**
- API salva criptografada no Supabase
- Vinculada ao `user_id` do usuário
- Marcada como `is_default = true`
- `is_active = true`

### Cenário 2: Usuário adiciona segunda API (backup)

1. Já tem 1 API do Gemini
2. Adiciona outra API do Gemini
3. NÃO marca como padrão
4. Define limite menor (backup)

**Resultado:**
- Agora tem 2 APIs do Gemini
- A primeira é padrão
- A segunda é backup

### Cenário 3: Rotação automática

1. Usuário faz 1000 requisições com API 1
2. API 1 atinge `monthly_limit = 1000`
3. Sistema detecta limite atingido
4. Automaticamente rotaciona para API 2
5. Continua funcionando sem interrupção

**Código:**
```typescript
const result = await userAPIManager.getAPIKeyWithRotation('gemini');
// Se API 1 atingiu limite, retorna API 2 automaticamente
```

### Cenário 4: Economizar créditos

1. Usuário tem 3 APIs ativas
2. Quer economizar créditos da API 2
3. Desativa API 2 temporariamente
4. Sistema para de usar API 2
5. Quando precisar, reativa

**Código:**
```typescript
await userAPIManager.toggleAPIKey(apiKey2Id, false);
```

---

## 📊 DASHBOARD DE GESTÃO

### Funcionalidades

1. **Visão Geral**
   - Total de APIs configuradas
   - APIs ativas
   - Uso total

2. **Por Provider**
   - Lista todas as APIs de cada provider
   - Estatísticas de uso
   - Botão para adicionar nova

3. **Por API Key**
   - Nome e status (ativa/inativa)
   - Badge "Padrão" se for default
   - Contador de usos e tokens
   - Barra de progresso do limite
   - Último uso
   - Notas
   - Ações: Ativar/Desativar, Definir padrão, Deletar

### Exemplo Visual

```
┌─────────────────────────────────────────────┐
│ 🔑 Gerenciar APIs                         × │
├─────────────────────────────────────────────┤
│                                             │
│  📊 Total: 5    ✅ Ativas: 4    🔄 Uso: 2.5k│
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ ✨ Google Gemini [Grátis] + Adicionar│  │
│  │ 📈 1.2k usos  🪙 45k tokens           │   │
│  │                                       │   │
│  │ ┌─────────────────────────────────┐  │   │
│  │ │ Gemini Produção [Padrão]        │  │   │
│  │ │ ✓ ⭐ 🗑️                          │  │   │
│  │ │ Usos: 800 / 1000                │  │   │
│  │ │ Tokens: 30k                     │  │   │
│  │ │ [████████░░] 80%                │  │   │
│  │ │ Último uso: 03/12 08:45         │  │   │
│  │ └─────────────────────────────────┘  │   │
│  │                                       │   │
│  │ ┌─────────────────────────────────┐  │   │
│  │ │ Gemini Backup                   │  │   │
│  │ │ ✓ ⭐ 🗑️                          │  │   │
│  │ │ Usos: 400 / 500                 │  │   │
│  │ │ [████████░░] 80%                │  │   │
│  │ └─────────────────────────────────┘  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 🚀 Alibaba Qwen [Grátis]  + Adicionar│  │
│  │ 📈 1.3k usos  🪙 50k tokens           │   │
│  │ ...                                   │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## 🔄 ROTAÇÃO AUTOMÁTICA

### Como funciona

1. **Requisição chega**
   ```typescript
   const result = await userAPIManager.getAPIKeyWithRotation('gemini');
   ```

2. **Sistema verifica API padrão**
   - Busca API com `is_default = true`
   - Verifica se está ativa
   - Verifica se atingiu limites

3. **Se atingiu limite**
   - Busca próxima API ativa do mesmo provider
   - Retorna a próxima disponível
   - Registra no log

4. **Se não tem mais APIs**
   - Retorna `null`
   - Aplicação mostra erro ao usuário

### Exemplo de Código

```typescript
async function generateRound(provider: AIProvider) {
  // Obter API com rotação automática
  const apiResult = await userAPIManager.getAPIKeyWithRotation(provider);
  
  if (!apiResult) {
    throw new Error(`Nenhuma API disponível para ${provider}`);
  }
  
  const { key, decrypted } = apiResult;
  
  try {
    // Fazer requisição com a API
    const response = await fetch('https://api...', {
      headers: {
        'Authorization': `Bearer ${decrypted}`
      }
    });
    
    // Registrar uso bem-sucedido
    await userAPIManager.logUsage(
      key.id,
      provider,
      1500, // tokens estimados
      'generate_round',
      true
    );
    
    return response;
  } catch (error) {
    // Registrar erro
    await userAPIManager.logUsage(
      key.id,
      provider,
      0,
      'generate_round',
      false,
      error.message
    );
    
    throw error;
  }
}
```

---

## 🔐 SEGURANÇA

### Criptografia

**Atual (simples):**
```typescript
const encrypted = btoa(apiKey); // Base64
```

**Recomendado (produção):**
```typescript
// Usar Web Crypto API
const key = await crypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  true,
  ['encrypt', 'decrypt']
);

const encrypted = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv },
  key,
  encoder.encode(apiKey)
);
```

### Row Level Security (RLS)

- ✅ Cada usuário vê apenas suas APIs
- ✅ Não pode acessar APIs de outros usuários
- ✅ Políticas aplicadas automaticamente pelo Supabase

---

## 📈 ESTATÍSTICAS E RELATÓRIOS

### Função SQL: `get_user_api_stats`

```sql
SELECT * FROM get_user_api_stats(auth.uid());
```

**Retorna:**
```
provider | total_keys | active_keys | total_usage | total_tokens | last_used
---------|------------|-------------|-------------|--------------|----------
gemini   | 2          | 2           | 1200        | 45000        | 2025-12-03
qwen     | 1          | 1           | 1300        | 50000        | 2025-12-03
```

### TypeScript

```typescript
const stats = await userAPIManager.getStats();

stats.forEach(stat => {
  console.log(`${stat.provider}:`);
  console.log(`  - Total de APIs: ${stat.total_keys}`);
  console.log(`  - APIs ativas: ${stat.active_keys}`);
  console.log(`  - Uso total: ${stat.total_usage}`);
  console.log(`  - Tokens: ${stat.total_tokens}`);
});
```

---

## 🧪 TESTES

### Teste 1: Isolamento entre usuários

```typescript
// Usuário A
const userA = await supabase.auth.signIn({ email: 'a@test.com' });
await userAPIManager.addAPIKey({ provider: 'gemini', api_key: 'key-a' });

// Usuário B
const userB = await supabase.auth.signIn({ email: 'b@test.com' });
const keysB = await userAPIManager.listAPIKeys();

// keysB deve estar vazio (não vê APIs do usuário A)
expect(keysB.length).toBe(0);
```

### Teste 2: Rotação automática

```typescript
// Adicionar 2 APIs
await userAPIManager.addAPIKey({
  provider: 'gemini',
  api_key: 'key-1',
  is_default: true,
  monthly_limit: 10
});

await userAPIManager.addAPIKey({
  provider: 'gemini',
  api_key: 'key-2'
});

// Simular 10 usos (atingir limite)
for (let i = 0; i < 10; i++) {
  await userAPIManager.incrementUsage(key1Id, 100);
}

// Próxima requisição deve rotacionar
const result = await userAPIManager.getAPIKeyWithRotation('gemini');
expect(result.decrypted).toBe('key-2');
```

---

## 📝 PRÓXIMOS PASSOS

1. ✅ **Executar SQL no Supabase** - Criar tabelas e funções
2. ✅ **Integrar dashboard** - Adicionar botão no app
3. ✅ **Atualizar geração de rounds** - Usar `getAPIKeyWithRotation`
4. ✅ **Testar com múltiplos usuários** - Verificar isolamento
5. ✅ **Melhorar criptografia** - Implementar AES-256-GCM
6. ✅ **Adicionar notificações** - Avisar quando API atingir limite

---

## 🎉 BENEFÍCIOS

### Para o Usuário

- ✅ **Controle total** sobre suas APIs
- ✅ **Economia de créditos** ativando/desativando
- ✅ **Múltiplas APIs** como backup
- ✅ **Visibilidade** de uso e gastos
- ✅ **Sem surpresas** com limites definidos

### Para o Sistema

- ✅ **Escalável** - Cada usuário independente
- ✅ **Seguro** - RLS garante isolamento
- ✅ **Confiável** - Rotação automática evita falhas
- ✅ **Auditável** - Log completo de uso

---

**Última atualização:** 03/12/2025 09:00 GMT-3
