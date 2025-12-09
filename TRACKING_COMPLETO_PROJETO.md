# 📋 TRACKING COMPLETO - APP ROUNDER

**Projeto:** App Rounder - Gerador Inteligente de Rounds Médicos  
**Repositório:** https://github.com/rodrigorochalima/app-rounder  
**Deploy:** https://app-rounder.vercel.app  
**Última atualização:** 03/12/2025 12:20 GMT-3

---

## 📊 VISÃO GERAL DO PROJETO

### Objetivo
Aplicativo web para médicos gerarem rounds médicos (evoluções clínicas) de forma inteligente usando IA, com:
- 40 regras médicas personalizáveis
- Múltiplas APIs de IA (Gemini, Qwen, Cerebras, etc.)
- Leitura de documentos (Google Docs, OneDrive, Dropbox)
- Layout minimalista e responsivo (iPhone)
- Sistema multi-usuário com isolamento de dados

### Stack Tecnológica
- **Frontend:** React + TypeScript + Vite + TailwindCSS
- **Backend:** Node.js + Express
- **Banco de Dados:** Supabase (PostgreSQL)
- **Autenticação:** Supabase Auth
- **Deploy:** Vercel (sempre online)
- **Controle de Versão:** GitHub

---

## 🗂️ ESTRUTURA DO PROJETO

```
app-rounder/
├── client/                    # Frontend React
│   ├── src/
│   │   ├── components/
│   │   │   ├── APIConfig/    # Configuração de APIs (antigo)
│   │   │   ├── APIManager/   # Dashboard de gestão de APIs (novo)
│   │   │   ├── Header/       # Cabeçalho com menu
│   │   │   ├── RulesPanel/   # Painel de regras médicas
│   │   │   └── UserProfile/  # Perfil do usuário
│   │   ├── pages/
│   │   │   ├── RoundCerebrasGemini.tsx  # Página principal
│   │   │   ├── Login.tsx
│   │   │   └── ResetPassword.tsx
│   │   ├── services/
│   │   │   ├── auth.ts       # Serviço de autenticação
│   │   │   ├── user-api-manager.service.ts  # Gestão de APIs
│   │   │   └── api-keys/     # Serviços de API keys
│   │   └── lib/
│   │       └── supabase.ts   # Cliente Supabase
│   └── index.html
├── server/                    # Backend Node.js
│   └── index.ts
├── supabase/                  # Schemas SQL
│   └── migrations/
├── package.json
├── vite.config.ts
└── ecosystem.config.cjs       # Configuração PM2
```

---

## 📝 HISTÓRICO DE DESENVOLVIMENTO

### Fase 1: Projeto Inicial (Nov 2025)
**Objetivo:** Criar MVP básico

✅ **Implementado:**
- Estrutura base React + Vite
- Integração com Supabase
- Autenticação de usuários
- Página de login/registro
- Geração básica de rounds com IA

**Commits principais:**
- Initial commit
- Setup Supabase integration
- Add authentication

---

### Fase 2: Sistema de Regras (Nov-Dez 2025)
**Objetivo:** Implementar 40 regras médicas personalizáveis

✅ **Implementado:**
- Painel de regras (RulesPanel)
- CRUD de regras no Supabase
- Categorização de regras
- Ativação/desativação individual
- Persistência por usuário

**Arquivos criados:**
- `client/src/components/RulesPanel/RulesPanel.tsx`
- `client/src/components/RulesPanel/RulesPanel.css`

**Tabelas Supabase:**
```sql
CREATE TABLE user_rules (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  rule_text TEXT,
  category TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMP
);
```

**Commits:**
- feat: Add rules panel with 40 medical rules
- fix: Rules persistence in Supabase

---

### Fase 3: Múltiplas APIs de IA (Dez 2025)
**Objetivo:** Suportar múltiplos providers de IA

✅ **Implementado:**
- Integração com 8 providers:
  - Alibaba Qwen (grátis)
  - Google Gemini (grátis)
  - Cerebras (grátis)
  - DeepSeek (grátis)
  - Groq (grátis)
  - OpenAI (pago)
  - Cohere (pago)
  - Mistral AI (pago)

- Configuração de API keys
- Seleção de provider ativo
- Fallback automático

**Arquivos criados:**
- `client/src/components/APIConfig/APIConfig.tsx`
- `client/src/components/APIConfig/APIConfig.css`

**Commits:**
- feat: Add multi-provider AI support
- feat: API key configuration panel

---

### Fase 4: Correções de UX e Responsividade (Dez 2025)
**Objetivo:** Corrigir bugs de UX e melhorar mobile

❌ **Problemas identificados:**
1. API keys não salvavam (localStorage)
2. Responsividade quebrada no iPhone 14
3. App adormecia rapidamente

✅ **Soluções implementadas:**
1. **Salvamento no Supabase:**
   - Substituído localStorage por Supabase
   - Dados persistem entre dispositivos
   - Isolamento por usuário (RLS)

2. **Responsividade mobile:**
   - CSS refatorado para iPhone 11-15
   - Modais fullscreen em mobile
   - Touch targets 44px
   - Word-wrap em textos longos

3. **PM2 para manter online:**
   - Configurado ecosystem.config.cjs
   - Cluster mode
   - Auto-restart
   - Keep-alive

**Arquivos modificados:**
- `client/src/components/APIConfig/APIConfig.tsx`
- `client/src/components/APIConfig/APIConfig.css`
- `ecosystem.config.cjs`

**Commits:**
- fix: API keys now save to Supabase
- fix: Mobile responsiveness for iPhone 14
- feat: PM2 configuration for always-on

**Documentos criados:**
- `CORRECOES_BUGS.md`
- `DEPLOY_RAPIDO.md`

---

### Fase 5: Sistema Multi-Usuário de APIs (Dez 2025)
**Objetivo:** Gestão completa de APIs por usuário

✅ **Implementado:**

#### 5.1. Schema SQL Multi-Usuário
**Tabelas criadas:**

```sql
-- API keys de cada usuário (criptografadas)
CREATE TABLE user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  encryption_iv TEXT NOT NULL,
  name TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  tokens_used BIGINT DEFAULT 0,
  last_used_at TIMESTAMP,
  monthly_limit INTEGER,
  monthly_token_limit BIGINT,
  cost_per_million_tokens DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Log de uso de APIs
CREATE TABLE user_api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES user_api_keys(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  request_type TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Row Level Security (RLS):**
```sql
-- Usuário vê apenas suas APIs
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_api_keys_select"
  ON user_api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_api_keys_insert"
  ON user_api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**Funções SQL:**
- `increment_api_key_usage()` - Incrementa contador
- `get_user_api_stats()` - Estatísticas de uso
- `get_next_active_api_key()` - Rotação automática

**Arquivo criado:**
- `supabase-schema-multi-user-apis.sql`

#### 5.2. Serviço TypeScript
**Classe:** `UserAPIManager`

**Métodos principais:**
```typescript
// Adicionar API
addAPIKey(data: CreateAPIKeyData): Promise<UserAPIKey>

// Listar APIs
listAPIKeys(provider?: AIProvider): Promise<UserAPIKey[]>

// Obter API com rotação automática
getAPIKeyWithRotation(provider: AIProvider): Promise<{key, decrypted} | null>

// Ativar/Desativar
toggleAPIKey(id: string, is_active: boolean): Promise<UserAPIKey>

// Deletar
deleteAPIKey(id: string): Promise<void>

// Estatísticas
getStats(): Promise<APIKeyStats[]>

// Registrar uso
logUsage(apiKeyId, provider, tokens, type, success): Promise<void>

// Rotacionar para próxima
rotateToNextKey(provider, currentKeyId): Promise<{key, decrypted} | null>

// Verificar limite
hasReachedLimit(id: string): Promise<{reached, type}>
```

**Arquivo criado:**
- `client/src/services/user-api-manager.service.ts`

#### 5.3. Dashboard de Gestão (APIManager)
**Componente:** `APIManager.tsx`

**Funcionalidades:**
- 📊 Estatísticas gerais (total, ativas, uso)
- 📋 Lista por provider
- ➕ Adicionar APIs (expansão inline)
- ✅ Ativar/desativar
- ⭐ Definir como padrão
- 📈 Barra de progresso de uso
- 🗑️ Deletar APIs
- 📝 Notas e limites personalizados

**UX Profissional:**
- ❌ **Antes:** Modal dentro de modal (confuso)
- ✅ **Agora:** Expansão inline (fluido)
- Animação slideDown suave
- Botão muda de estado (+ Adicionar → ✕ Cancelar)
- Salvamento direto no Supabase

**Arquivos criados:**
- `client/src/components/APIManager/APIManager.tsx`
- `client/src/components/APIManager/APIManager.css`

#### 5.4. Integração no Header
**Arquivo modificado:** `client/src/components/Header/Header.tsx`

**Mudança:**
```typescript
// Antes
<button onClick={() => setShowAPIConfig(true)}>
  🔑 APIs
</button>

// Agora
<button onClick={() => setShowAPIManager(true)}>
  🔑 Gerenciar APIs
</button>
```

**Commits:**
- feat: Sistema multi-usuário de gestão de APIs com UX profissional
- fix: Remove declaração duplicada de mostrarRegras

**Documentos criados:**
- `GUIA_MULTI_USUARIO_APIS.md`
- `SISTEMA_MULTI_USUARIO_PRONTO.md`
- `CORRECAO_UX_APIS.md`

---

### Fase 6: Deploy Permanente na Vercel (Dez 2025)
**Objetivo:** Site sempre online sem hibernar

✅ **Implementado:**
- Deploy automático via GitHub
- Build otimizado
- SSL/HTTPS automático
- CDN global
- Variáveis de ambiente

**Configuração:**
- Framework: Vite
- Build Command: `pnpm run build`
- Output Directory: `dist/public`
- Install Command: `pnpm install`

**Variáveis de ambiente (Vercel):**
```
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
```

**URL de produção:**
https://app-rounder.vercel.app

**Commits:**
- fix: Remove declaração duplicada para build Vercel
- chore: Add react-router-dom dependency

---

## 🎯 FUNCIONALIDADES ATUAIS

### 1. Autenticação
- ✅ Login com email/senha
- ✅ Registro de novos usuários
- ✅ Reset de senha
- ✅ Sessão persistente
- ✅ Logout

### 2. Gestão de APIs
- ✅ Adicionar múltiplas APIs por provider
- ✅ Ativar/desativar APIs
- ✅ Definir API padrão
- ✅ Limites mensais configuráveis
- ✅ Contador de uso e tokens
- ✅ Rotação automática quando atinge limite
- ✅ Dashboard visual com estatísticas
- ✅ Salvamento seguro no Supabase
- ✅ Isolamento por usuário (RLS)

### 3. Regras Médicas
- ✅ 40 regras pré-configuradas
- ✅ Categorização (Anamnese, Exame Físico, etc.)
- ✅ Ativação/desativação individual
- ✅ Edição de regras
- ✅ Adição de novas regras
- ✅ Persistência por usuário

### 4. Geração de Rounds
- ✅ Entrada de texto (round anterior)
- ✅ Gravação de áudio
- ✅ Upload de áudio (.mp3, .wav, .webm)
- ✅ Upload de documentos (.docx, .txt)
- ✅ Geração com IA (múltiplos providers)
- ✅ Histórico de rounds gerados
- ✅ Download de rounds

### 5. Interface
- ✅ Header com menu
- ✅ Perfil do usuário
- ✅ Responsivo (desktop + mobile)
- ✅ Layout minimalista
- ✅ Animações suaves
- ✅ Feedback visual

---

## 🚧 FUNCIONALIDADES PENDENTES

### 1. Leitura de Links de Documentos
**Status:** ❌ NÃO IMPLEMENTADO

**Objetivo:**
- Ler documentos do Google Docs
- Ler documentos do OneDrive
- Ler documentos do Dropbox

**Implementação necessária:**
- Integração com Google Drive API
- Integração com Microsoft Graph API
- Integração com Dropbox API
- Parser de links
- Extração de texto

### 2. Layout Minimalista (1 tela, sem scroll)
**Status:** ⚠️ PARCIALMENTE IMPLEMENTADO

**Atual:**
- Layout tem scroll
- Múltiplas seções

**Objetivo:**
- Tudo em 1 tela
- Sem scroll vertical
- Design ultra-minimalista

**Implementação necessária:**
- Redesign completo da página principal
- Compactar seções
- Usar modais/overlays
- Otimizar espaço

### 3. Responsividade iPhone Completa
**Status:** ⚠️ PARCIALMENTE IMPLEMENTADO

**Atual:**
- Funciona em iPhone 14-15
- Alguns elementos cortados em iPhone 11-13

**Objetivo:**
- Funcionar perfeitamente em iPhone 11, 12, 13, 14, 15
- Touch targets adequados
- Sem elementos cortados

**Implementação necessária:**
- Testar em todos os modelos
- Ajustar CSS para telas menores
- Validar touch targets

### 4. App Nativo
**Status:** ❌ NÃO INICIADO

**Objetivo:**
- Transformar em app iOS/Android
- Disponível na App Store / Play Store

**Opções:**
- React Native (reescrever)
- Capacitor (wrapper PWA)
- Expo (framework React Native)

---

## 📦 DEPENDÊNCIAS PRINCIPAIS

### Frontend
```json
{
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "react-router-dom": "^7.10.1",
  "typescript": "^5.6.3",
  "vite": "^7.1.9",
  "tailwindcss": "^4.1.14",
  "@supabase/supabase-js": "^2.48.1",
  "mammoth": "^1.8.0",
  "lucide-react": "^0.469.0"
}
```

### Backend
```json
{
  "express": "^4.21.2",
  "cors": "^2.8.5",
  "dotenv": "^16.4.7"
}
```

### DevDependencies
```json
{
  "@vitejs/plugin-react": "^5.0.4",
  "esbuild": "^0.25.10",
  "autoprefixer": "^10.4.21",
  "postcss": "^8.5.6",
  "prettier": "^3.6.2"
}
```

---

## 🗄️ ESTRUTURA DO BANCO DE DADOS

### Tabelas Supabase

#### 1. `auth.users` (Supabase Auth)
Gerenciada automaticamente pelo Supabase Auth.

#### 2. `user_profiles`
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. `user_rules`
```sql
CREATE TABLE user_rules (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  rule_text TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 4. `user_api_keys`
```sql
CREATE TABLE user_api_keys (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  provider TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  encryption_iv TEXT NOT NULL,
  name TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  tokens_used BIGINT DEFAULT 0,
  last_used_at TIMESTAMP,
  monthly_limit INTEGER,
  monthly_token_limit BIGINT,
  cost_per_million_tokens DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 5. `user_api_usage_logs`
```sql
CREATE TABLE user_api_usage_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  api_key_id UUID REFERENCES user_api_keys(id),
  provider TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  request_type TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 6. `rounds_history` (planejado)
```sql
CREATE TABLE rounds_history (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  round_text TEXT,
  provider TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔐 SEGURANÇA

### Row Level Security (RLS)
Todas as tabelas de usuário têm RLS ativo:

```sql
-- Exemplo: user_api_keys
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_api_keys_select"
  ON user_api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_api_keys_insert"
  ON user_api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_api_keys_update"
  ON user_api_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "user_api_keys_delete"
  ON user_api_keys FOR DELETE
  USING (auth.uid() = user_id);
```

### Criptografia de API Keys
**Atual:** Base64 (simples)
```typescript
const encrypted = btoa(apiKey);
```

**Recomendado (futuro):** AES-256-GCM
```typescript
const key = await crypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  true,
  ['encrypt', 'decrypt']
);
```

### Autenticação
- JWT tokens gerenciados pelo Supabase
- Refresh tokens automáticos
- Expiração configurável
- Logout limpa sessão

---

## 📈 MÉTRICAS E ANALYTICS

### Uso de APIs (por usuário)
- Total de requisições
- Total de tokens consumidos
- Custo estimado
- Provider mais usado
- Última utilização

### Regras Médicas
- Regras ativas por usuário
- Regras mais usadas
- Categorias mais populares

### Rounds Gerados
- Total de rounds por usuário
- Provider usado
- Tempo médio de geração
- Taxa de sucesso

---

## 🐛 BUGS CONHECIDOS

### 1. ❌ AuthPage.css não encontrado
**Erro:** `Could not resolve "./AuthPage.css" from "client/src/pages/ResetPassword.tsx"`

**Causa:** Arquivo CSS faltando

**Solução:** Criar arquivo ou remover import

**Status:** PENDENTE

### 2. ✅ Declaração duplicada de mostrarRegras
**Erro:** `The symbol "mostrarRegras" has already been declared`

**Causa:** useState duplicado

**Solução:** Removida linha 49

**Status:** CORRIGIDO (commit 2b2d1c8)

---

## 🚀 DEPLOY E CI/CD

### GitHub
**Repositório:** https://github.com/rodrigorochalima/app-rounder

**Branch principal:** `main`

**Workflow:**
1. Desenvolvimento local
2. Commit e push para `main`
3. Vercel detecta push
4. Build automático
5. Deploy em produção

### Vercel
**Projeto:** app-rounder

**URL:** https://app-rounder.vercel.app

**Configuração:**
- Auto-deploy: ✅ Ativo
- Production Branch: `main`
- Framework: Vite
- Node Version: 22.x
- Build Command: `pnpm run build`
- Output Directory: `dist/public`
- Install Command: `pnpm install`

**Variáveis de ambiente:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## 📚 DOCUMENTAÇÃO CRIADA

1. **DEPLOY_RAPIDO.md**
   - Guia rápido de deploy
   - Comandos PM2
   - URL de acesso

2. **CORRECOES_BUGS.md**
   - Bugs corrigidos
   - API keys no Supabase
   - Responsividade mobile
   - PM2 configurado

3. **GUIA_MULTI_USUARIO_APIS.md**
   - Documentação completa do sistema
   - Schema SQL
   - Serviço TypeScript
   - Exemplos de uso
   - Fluxos de rotação automática

4. **SISTEMA_MULTI_USUARIO_PRONTO.md**
   - Resumo executivo
   - Como usar
   - Funcionalidades
   - Próximos passos

5. **CORRECAO_UX_APIS.md**
   - Problema identificado (modal aninhado)
   - Solução implementada (expansão inline)
   - Comparação antes/depois
   - Checklist de correções

6. **TRACKING_COMPLETO_PROJETO.md** (este documento)
   - Histórico completo
   - Todas as fases
   - Commits importantes
   - Funcionalidades atuais e pendentes

---

## 🎯 ROADMAP FUTURO

### Curto Prazo (1-2 semanas)
- [ ] Corrigir bug AuthPage.css
- [ ] Implementar leitura de Google Docs
- [ ] Implementar leitura de OneDrive
- [ ] Implementar leitura de Dropbox
- [ ] Redesign para layout 1 tela

### Médio Prazo (1 mês)
- [ ] Melhorar criptografia (AES-256-GCM)
- [ ] Adicionar notificações (limite de API)
- [ ] Gráficos de uso ao longo do tempo
- [ ] Exportar relatórios CSV
- [ ] Temas claro/escuro

### Longo Prazo (3+ meses)
- [ ] App nativo iOS/Android
- [ ] Integração com prontuários eletrônicos
- [ ] IA para sugestão de regras
- [ ] Colaboração em equipe
- [ ] Assinatura premium

---

## 🤝 COLABORADORES

**Desenvolvedor Principal:** Manus AI  
**Cliente/Product Owner:** Rodrigo Rocha Lima Rodrigues  
**Repositório:** rodrigorochalima/app-rounder

---

## 📞 SUPORTE

**Issues GitHub:** https://github.com/rodrigorochalima/app-rounder/issues  
**Email:** (configurar)

---

## 📄 LICENÇA

(Definir licença)

---

**Última atualização:** 03/12/2025 12:20 GMT-3  
**Versão do documento:** 1.0  
**Autor:** Manus AI
