# 📋 ESPECIFICAÇÕES COMPLETAS DO SISTEMA APP ROUNDER

## 🎯 OBJETIVO PRINCIPAL
Sistema automatizado para gerar documentos de rounds médicos diários, preservando 100% da formatação original e aplicando regras de cores e contadores automaticamente.

---

## 📥 ENTRADA (INPUT)

### Arquivo 1: Documento do Round Anterior (.docx)
- Contém o round do dia anterior
- Serve como modelo visual e estrutural
- Contém informações dos pacientes que serão atualizadas

### Arquivo 2: Transcrição do Dia (.docx, .txt, .zip, áudio)
- Discussão clínica do dia atual
- Pode ser:
  - Documento Word (.docx)
  - Texto puro (.txt)
  - ZIP do WhatsApp (contém áudios e textos)
  - Áudio direto (.mp3, .wav, .m4a, .ogg)

### Arquivo 3: API Key do Groq (texto)
- Chave de API gratuita do Groq
- Salva automaticamente no localStorage
- Pergunta apenas uma vez

---

## 📤 SAÍDA (OUTPUT)

### Documento Gerado
- **Nome do arquivo**: `Round DDMMYY.docx` (ex: Round 131125.docx)
- **Formato**: .docx (Microsoft Word)
- **Conteúdo**: Round atualizado com todas as regras aplicadas

---

## 🎨 SISTEMA DE CORES (CRÍTICO)

### 🔴 VERMELHO (Novidades)
**Quando usar:**
- Exames solicitados HOJE (novos)
- Antibióticos iniciados HOJE (D0)
- Condutas novas implementadas HOJE
- Consultas solicitadas HOJE

**Exemplo:**
- "Solicitar TC de crânio" → VERMELHO
- "Iniciar Meropenem D0" → VERMELHO

### 🟡 AMARELO SUBLINHADO (Pendências)
**Quando usar:**
- Exames solicitados anteriormente SEM resultado
- Consultas solicitadas anteriormente SEM resposta
- Procedimentos pendentes

**Regra importante:**
- Incrementar contador de dias: "Exame pendente D1" → "Exame pendente D2"
- Manter sublinhado amarelo até resolução

**Exemplo:**
- "TC de crânio pendente D2" → AMARELO SUBLINHADO
- "Aguardando avaliação da neuro D3" → AMARELO SUBLINHADO

### 🟢 VERDE (Finalizações)
**Quando usar:**
- Exames com resultado recebido
- Consultas com resposta recebida
- Procedimentos realizados
- Antibióticos suspensos

**Exemplo:**
- "TC de crânio: sem sangramento" → VERDE
- "Neuro avaliou: manter conduta" → VERDE
- "Suspender Meropenem" → VERDE

### 🔵 AZUL (Títulos de Leitos)
**Quando usar:**
- Títulos dos leitos (LEITO 01, LEITO 02, etc.)
- Apenas títulos, não o conteúdo

**Exemplo:**
- "LEITO 01" → AZUL
- "EXTRA A" → AZUL

---

## 🔢 CONTADORES AUTOMÁTICOS

### Antibióticos
- **Início**: D0 (dia zero)
- **Incremento diário**: D0 → D1 → D2 → D3...
- **Até**: Suspensão (marcada em VERDE)

**Exemplo:**
- Dia 1: "Meropenem D0" (VERMELHO)
- Dia 2: "Meropenem D1" (texto normal)
- Dia 3: "Meropenem D2" (texto normal)
- Dia 4: "Suspender Meropenem" (VERDE)

### Exames Pendentes
- **Início**: D0 quando solicitado
- **Incremento**: D1, D2, D3... até resultado
- **Cor**: AMARELO SUBLINHADO até resultado

### Consultas Pendentes
- **Início**: D0 quando solicitada
- **Incremento**: D1, D2, D3... até resposta
- **Cor**: AMARELO SUBLINHADO até resposta

---

## 📅 ATUALIZAÇÃO DE DATA

### Formato Obrigatório
`DIA DA SEMANA, DD DE MÊS DE YYYY`

**Exemplos:**
- "Terça-feira, 13 de novembro de 2025"
- "Quarta-feira, 14 de novembro de 2025"

### Localização
- Geralmente no topo do documento
- Substituir data do dia anterior pela data atual

---

## 🏥 TRATAMENTO DE LEITOS

### Leito Vazio
- Se mencionado como vazio: reportar "LEITO XX: vazio"
- Não inventar paciente

### Paciente Transferido
- Se mencionado transferência: reportar "Paciente transferido para [destino]"
- Não omitir menção

### Dois Pacientes no Mesmo Leito (Erro de Alucinação)
- Considerar primeiro paciente correto
- Segundo paciente: mencionar transferência textual
- Não omitir nenhum paciente

---

## 📝 PRESERVAÇÃO DE CONTEÚDO

### O QUE PRESERVAR 100%
1. **Formatação visual**:
   - Logo do hospital
   - Tabelas e estrutura
   - Fontes e tamanhos
   - Espaçamento e margens
   - Cabeçalhos e rodapés

2. **Conteúdo clínico**:
   - Discussões completas
   - Timestamps da transcrição
   - Raciocínio clínico
   - Todos os pacientes mencionados

### O QUE NÃO FAZER
❌ Simplificar conteúdo
❌ Resumir discussões
❌ Remover timestamps
❌ Omitir pacientes
❌ Alterar estrutura visual
❌ Perder formatação

---

## 🤖 SISTEMA DE DUPLA CHECAGEM COM IA

### AGENTE 1: Análise por Leito
**Responsabilidade:**
- Processar cada leito individualmente
- Comparar com dia anterior
- Identificar mudanças
- Aplicar cores corretas
- Incrementar contadores

**Processo:**
1. Ler leito do dia anterior
2. Ler discussão do leito no dia atual
3. Identificar:
   - Novidades (VERMELHO)
   - Pendências (AMARELO)
   - Finalizações (VERDE)
4. Incrementar contadores (D0→D1→D2)
5. Gerar texto atualizado do leito

### AGENTE 2: Validação Visual Completa
**Responsabilidade:**
- Validar documento inteiro
- Verificar estrutura
- Confirmar cores
- Checar contadores
- Garantir formatação

**Processo:**
1. Ler documento gerado
2. Verificar:
   - Todos os leitos presentes
   - Cores aplicadas corretamente
   - Contadores incrementados
   - Data atualizada
   - Formatação preservada
3. Corrigir inconsistências
4. Aprovar ou reprocessar

---

## 🎯 REGRAS DE OURO (NUNCA VIOLAR)

### 1. PRESERVAÇÃO TOTAL
- **100% da formatação** deve ser mantida
- Logo, tabelas, cores, fontes: TUDO igual

### 2. CONTEÚDO COMPLETO
- **Nenhuma discussão** pode ser simplificada
- **Todos os pacientes** devem ser incluídos
- **Timestamps** devem ser mantidos

### 3. CORES RIGOROSAS
- **Vermelho**: APENAS novidades de HOJE
- **Amarelo**: APENAS pendências
- **Verde**: APENAS finalizações
- **Azul**: APENAS títulos de leitos

### 4. CONTADORES PRECISOS
- **Antibióticos**: D0, D1, D2... sem pular
- **Exames**: D0, D1, D2... até resultado
- **Consultas**: D0, D1, D2... até resposta

### 5. DATA CORRETA
- **Formato**: "Dia da semana, DD de mês de YYYY"
- **Idioma**: Português brasileiro
- **Atualização**: Sempre data atual

### 6. NOME DO ARQUIVO
- **Formato**: "Round DDMMYY.docx"
- **Exemplo**: "Round 131125.docx" para 13/11/2025

### 7. TAMANHO DO DOCUMENTO
- **Objetivo**: 9 páginas (como modelo)
- **Não**: 14 páginas (muito longo)
- **Manter**: Conteúdo completo mas conciso

### 8. TÍTULOS DE LEITOS
- **Sempre em AZUL**
- **Formato**: "LEITO XX" ou "EXTRA X"

### 9. ANÁLISE CONTEXTUAL
- **Não aplicar cores aleatoriamente**
- **Analisar contexto** de cada item
- **Comparar com dia anterior**

### 10. APRENDIZADO DEFINITIVO
- **Seguir TODAS as regras** toda vez
- **Não repetir erros** já corrigidos
- **Manter consistência** entre documentos

---

## 🚀 FLUXO DE PROCESSAMENTO

### Fase 1: Preparação (0-20%)
1. Ler arquivo do round anterior
2. Extrair estrutura e formatação
3. Ler transcrição do dia
4. Extrair discussões por leito

### Fase 2: Processamento por Leito (20-60%)
**Para cada leito:**
1. AGENTE 1 analisa leito anterior
2. AGENTE 1 analisa discussão atual
3. AGENTE 1 identifica mudanças
4. AGENTE 1 aplica cores
5. AGENTE 1 incrementa contadores
6. AGENTE 1 gera texto atualizado

### Fase 3: Montagem do Documento (60-80%)
1. Criar novo documento
2. Copiar estrutura e formatação
3. Inserir leitos atualizados
4. Atualizar data
5. Preservar logo e cabeçalhos

### Fase 4: Validação Final (80-100%)
1. AGENTE 2 valida estrutura
2. AGENTE 2 verifica cores
3. AGENTE 2 confirma contadores
4. AGENTE 2 checa formatação
5. AGENTE 2 aprova documento

---

## 💾 HISTÓRICO

### Armazenamento
- **Local**: localStorage do navegador
- **Quantidade**: Últimos 5 documentos
- **Informações**: Nome, data, hora, link de download

### Funcionalidade
- Mostrar cards com documentos anteriores
- Botão de download para cada um
- Ordenação cronológica (mais recente primeiro)

---

## 🔐 SEGURANÇA E PRIVACIDADE

### API Key
- Salva em localStorage (apenas no navegador do usuário)
- Nunca enviada para servidores externos
- Usada apenas para chamar API do Groq

### Dados dos Pacientes
- Processamento 100% no frontend (navegador)
- Dados não saem do dispositivo
- Privacidade total garantida

---

## 📱 COMPATIBILIDADE

### Dispositivos
- ✅ Desktop (Windows, Mac, Linux)
- ✅ iPhone (Safari)
- ✅ Android (Chrome)
- ✅ Tablet (iPad, Android)

### Navegadores
- ✅ Chrome
- ✅ Safari
- ✅ Firefox
- ✅ Edge

---

## 🎨 INTERFACE DO USUÁRIO

### Elementos Obrigatórios
1. Campo para API Key (com indicador "✓ Salva")
2. Campo para Documento Anterior (com suporte a paste/drag)
3. Campo para Transcrição (com suporte a paste/drag)
4. Linha de Debug (mostrando status de cada campo)
5. Barra de Progresso (com porcentagem real 0-100%)
6. Botão "Gerar Round de Hoje" (habilitado apenas quando tudo pronto)
7. Botão de Download (grande, visível, após processar)
8. Seção de Histórico (últimos 5 documentos)
9. Botão "Limpar Cache" (para forçar atualização)

### Feedback Visual
- ✅ Checkmarks verdes quando campos preenchidos
- 📊 Barra de progresso animada durante processamento
- ✅ Mensagem de sucesso ao concluir
- ⚠️ Mensagens de erro claras e úteis
- 📥 Botão de download destacado

---

## 🔄 ATUALIZAÇÕES E DEPLOY

### Plataforma
- **Vercel** (gratuito)
- Deploy automático via GitHub
- Zero cache (atualizações instantâneas)

### Processo
1. Commit no GitHub
2. Vercel detecta mudança
3. Build automático
4. Deploy instantâneo
5. URL atualizada: https://app-rounder.vercel.app

---

## 📞 SUPORTE E MANUTENÇÃO

### Logs e Debug
- Console do navegador mostra progresso
- Linha de debug visível na interface
- Mensagens de erro detalhadas

### Testes
- Testar com documentos reais
- Verificar cores aplicadas
- Confirmar contadores incrementados
- Validar formatação preservada

---

**ESTE DOCUMENTO É A FONTE ÚNICA DA VERDADE**
**TODAS AS IMPLEMENTAÇÕES DEVEM SEGUIR ESTAS ESPECIFICAÇÕES**
**NENHUMA REGRA PODE SER VIOLADA OU IGNORADA**
