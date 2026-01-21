# 🚀 APP ROUNDER - DEPLOY PERMANENTE

## ✅ STATUS: ONLINE

**URL:** https://3000-ij7hkyoiey6ylavig25rq-0cd1ed6c.manusvm.computer

**PM2:** ✅ Rodando permanentemente (auto-restart ativado)

---

## 📋 OTIMIZAÇÃO IMPLEMENTADA

### ❌ ANTES (LENTO):
- Clonar repositório toda vez
- Instalar dependências
- Fazer build completo
- Múltiplas etapas desnecessárias
- **Tempo:** 5-10 minutos
- **Créditos:** Alto consumo

### ✅ AGORA (RÁPIDO):
- Usa projeto já existente em `/home/ubuntu/app-rounder`
- PM2 já instalado
- Build já pronto
- **Tempo:** 10-30 segundos
- **Créditos:** Mínimo

---

## 🔧 COMANDOS RÁPIDOS

### Reiniciar app:
```bash
cd /home/ubuntu/app-rounder && pm2 restart app-rounder
```

### Ver logs:
```bash
pm2 logs app-rounder --lines 50
```

### Status:
```bash
pm2 status
```

### Rebuild (se necessário):
```bash
cd /home/ubuntu/app-rounder && pnpm run build && pm2 restart app-rounder
```

---

## 📊 FUNCIONALIDADES PRONTAS

1. ✅ **Autenticação** (Supabase)
2. ✅ **7 APIs de IA** (Qwen, Gemini, OpenAI, Groq, Cerebras, Cohere, Mistral)
3. ✅ **40 Regras** customizáveis
4. ✅ **Upload de áudio** e transcrição
5. ✅ **Upload de documentos**
6. ✅ **Geração de rounds** médicos

---

## 🎯 PRÓXIMAS FASES

### Fase 1: TESTAR GERAÇÃO DE DOCUMENTOS ⬅️ **VOCÊ ESTÁ AQUI**
- Fazer login
- Configurar pelo menos 1 API key
- Testar upload de áudio/documento
- Gerar primeiro round
- Reportar problemas encontrados

### Fase 2: AJUSTES BASEADOS NO USO REAL
- Corrigir bugs encontrados
- Melhorar UX conforme feedback
- Otimizar geração de documentos

### Fase 3: LAYOUT MINIMALISTA
- Integrar RoundMinimal.tsx
- Campo unificado (texto/link/áudio/upload)
- Tudo em 1 tela sem scroll

### Fase 4: LEITURA DE LINKS
- Integrar cloud-document-extractor.ts
- Google Docs, OneDrive, Dropbox
- Auto-detecção de tipo

### Fase 5: RESPONSIVIDADE FINAL
- Testes em iPhone real
- Ajustes de touch targets
- Validação completa mobile

### Fase 6: PREPARAÇÃO PARA APP NATIVO
- Exportar para React Native
- Configurar builds iOS/Android
- Publicar nas lojas

---

## 💾 PERSISTÊNCIA DE DADOS

**Supabase (nuvem):**
- ✅ Usuários e autenticação
- ✅ API keys (criptografadas)
- ✅ Regras customizadas
- ✅ Histórico de rounds

**Sandbox (temporário):**
- ⚠️ Arquivos de áudio/documentos
- ⚠️ Build da aplicação
- ⚠️ PM2 (precisa reiniciar após reset)

---

## 🔐 SEGURANÇA

- ✅ API keys criptografadas no Supabase
- ✅ Autenticação obrigatória
- ✅ RLS (Row Level Security) ativo
- ✅ HTTPS em produção

---

## 📝 NOTAS IMPORTANTES

1. **Sandbox persiste entre sessões** - não precisa clonar novamente
2. **PM2 mantém app rodando** - mesmo após inatividade
3. **URL é permanente** - enquanto sandbox existir
4. **Supabase é externo** - dados persistem sempre

---

**Última atualização:** 03/12/2025 08:30 GMT-3
