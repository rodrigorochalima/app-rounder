# 🏥 Assistente de Evolução Clínica

Aplicação web inteligente que transforma conversas do WhatsApp em prontuários clínicos estruturados usando IA do Google Gemini, com **sistema de aprendizado automático** que se adapta ao seu estilo.

---

## ✨ Funcionalidades Principais

### 📱 Importação de Conversas
- Importa arquivos `.zip` exportados do WhatsApp
- Processa automaticamente textos, imagens e áudios
- Reconstrói linha do tempo completa com timestamps

### 🔍 Filtragem Inteligente
- **Hoje**: Apenas mensagens do dia atual
- **Hoje e Ontem**: Últimas 48 horas
- **Tudo**: Histórico completo

### 🤖 Geração de Prontuários com IA
- Análise multimodal (texto + imagens + áudios)
- Extração automática de:
  - Leitos e pacientes
  - Terapias medicamentosas (antibióticos, etc)
  - Exames pendentes
  - Plano de cuidados
  - Pontos de atenção
  - Checklist do plantão

### 🧠 Aprendizado Automático
- **Sistema de feedback** 👍/👎 após cada prontuário
- **Aprende automaticamente** seu estilo preferido
- **Ajusta formato**: detalhado, moderado ou objetivo
- **Identifica padrões**: seções preferidas, frases a evitar
- **Seleção automática** de contexto do dia anterior

### 📊 Histórico e Contexto
- Salva prontuários no navegador (localStorage)
- Usa relatórios anteriores como contexto
- Permite evolução clínica inteligente

### 📄 Exportação
- Visualização em **Markdown** (formatado)
- Dados brutos em **JSON**
- Exportação para **PDF** profissional

---

## 🚀 Como Usar

### 1️⃣ Configuração Inicial

1. Clique no ícone de **engrenagem** (⚙️) no canto superior direito
2. Obtenha sua API Key gratuita do Gemini:
   - Acesse: [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Clique em "Create API Key"
   - Copie a chave gerada
3. Cole a chave no campo "API Key do Google Gemini"
4. Ative o **Aprendizado Automático**
5. (Opcional) Adicione instruções personalizadas
6. Salve as configurações

### 2️⃣ Exportar Conversa do WhatsApp

**No celular:**
1. Abra a conversa do plantão no WhatsApp
2. Toque nos 3 pontos (⋮) → **Mais** → **Exportar conversa**
3. Escolha **Incluir mídia**
4. Salve o arquivo `.zip`
5. Transfira para o computador (email, Google Drive, etc)

**No computador:**
1. Abra o WhatsApp Web
2. Clique nos 3 pontos da conversa → **Mais** → **Exportar conversa**
3. Escolha **Incluir mídia**
4. Baixe o arquivo `.zip`

### 3️⃣ Gerar Prontuário

1. Clique em **"Selecionar Arquivo .zip"** no painel central
2. Escolha o arquivo exportado do WhatsApp
3. Aguarde o processamento (alguns segundos)
4. Selecione o **filtro de período** (padrão: Hoje)
5. (Opcional) Selecione um **contexto anterior** no painel esquerdo
6. (Opcional) Adicione **instruções específicas** no campo de texto
7. Clique em **"Gerar Prontuário"**
8. Aguarde a análise da IA (10-30 segundos)

### 4️⃣ Avaliar e Aprender

1. Revise o prontuário gerado no painel direito
2. Clique em **👍 Bom** se aprovado
3. Clique em **👎 Ruim** se não atendeu suas expectativas
4. A IA aprende automaticamente e ajusta o próximo prontuário!

### 5️⃣ Salvar e Exportar

- **Salvar**: Clique em "Salvar" para adicionar ao histórico
- **Exportar PDF**: Clique em "Exportar PDF" para baixar
- **Usar como contexto**: No histórico, clique em "Usar como Contexto"

---

## 🎯 Como Funciona o Aprendizado

### Primeira Geração
A IA usa o prompt padrão e gera prontuários em estilo **detalhado**.

### Após Feedbacks Positivos (👍)
- Analisa seções que você aprova
- Identifica seu formato preferido (detalhado, moderado, objetivo)
- Memoriza estruturas que funcionam

### Após Feedbacks Negativos (👎)
- Identifica frases e padrões a evitar
- Ajusta o estilo na próxima geração

### Após 3-5 Feedbacks
A IA já conhece seu estilo e gera prontuários **personalizados automaticamente**!

---

## 🔒 Segurança e Privacidade

- ✅ **Tudo roda no seu navegador** (exceto chamada à API do Gemini)
- ✅ **Dados salvos localmente** (localStorage do navegador)
- ✅ **API Key armazenada apenas no seu dispositivo**
- ✅ **Nenhum dado enviado para servidores externos** (exceto Gemini)
- ⚠️ **Não compartilhe sua API Key** com ninguém
- ⚠️ **Revogue chaves expostas** imediatamente

---

## 📱 Responsividade

### Desktop (> 768px)
- Layout de **3 colunas fixas**
- Histórico | Entrada | Resultado

### Mobile (≤ 768px)
- Layout de **1 coluna** com abas na parte inferior
- Navegação por toque entre painéis

---

## 🛠️ Tecnologias Utilizadas

- **React 18** + TypeScript
- **TailwindCSS 4** para estilização
- **shadcn/ui** para componentes
- **Google Gemini 2.0 Flash** para IA multimodal
- **JSZip** para processamento de arquivos
- **jsPDF + html2canvas** para exportação PDF
- **Streamdown** para renderização Markdown

---

## 📝 Estrutura do Prontuário Gerado

### JSON
```json
{
  "data_referencia": "YYYY-MM-DD",
  "leitos": [
    {
      "leito": "UTI-01",
      "paciente": "Nome Completo",
      "resumo_clinico": "...",
      "antibioticos": [{"nome": "Droga", "status": "EM_USO", "dias": "D3"}],
      "terapias_nao_atb": ["..."],
      "exames_pendentes": [{"tipo": "Hemocultura", "data_pedido": "YYYY-MM-DD"}],
      "plano_cuidados": ["..."],
      "linha_do_tempo_eventos": ["..."],
      "pontos_de_atencao": ["..."]
    }
  ]
}
```

### Markdown
```markdown
# 🏥 Prontuário do Plantão — YYYY-MM-DD

## Leito: **UTI-01**
**Paciente:** Nome Completo

### 🩺 Resumo Clínico Atual
- ...

### 💊 Terapia Medicamentosa
- **Droga 1** - EM USO (D3/7)

### 🧪 Pendências e Exames
- Hemocultura (YYYY-MM-DD) — **PENDENTE**

### 📝 Plano e Cuidados
- ...

### 🚩 Pontos de Atenção
- 🔴 __**PONTO FORTE**__: ...

---

✅ Checklist do Plantão
- [ ] Tarefa 1
- [ ] Tarefa 2
```

---

## ❓ Perguntas Frequentes

### A API do Gemini é gratuita?
Sim! O Google oferece **1500 requisições por dia gratuitamente** no plano gratuito.

### Meus dados ficam salvos na nuvem?
Não. Tudo fica salvo **apenas no seu navegador** (localStorage). Se limpar o cache, os dados são perdidos.

### Posso usar em múltiplos dispositivos?
Não automaticamente. Cada dispositivo tem seu próprio histórico local. Para sincronizar, você precisaria exportar/importar manualmente.

### A IA lembra de conversas anteriores?
Não automaticamente. Mas você pode selecionar um prontuário anterior como "contexto" para dar continuidade.

### Como a IA aprende meu estilo?
Através dos feedbacks 👍/👎. Ela analisa padrões dos prontuários aprovados e ajusta automaticamente.

### Posso desativar o aprendizado automático?
Sim! Nas configurações, desative a opção "Aprendizado Automático".

---

## 🐛 Solução de Problemas

### "Chave da API do Gemini não fornecida"
→ Configure sua API Key nas configurações (⚙️)

### "Arquivo _chat.txt não encontrado no ZIP"
→ Certifique-se de exportar a conversa corretamente do WhatsApp

### "Nenhuma mensagem encontrada"
→ Verifique se o arquivo ZIP contém o _chat.txt com mensagens

### Erro ao gerar prontuário
→ Verifique sua API Key e conexão com a internet

### PDF não exporta corretamente
→ Aguarde o prontuário carregar completamente antes de exportar

---

## 📄 Licença

Este projeto foi desenvolvido para uso pessoal e educacional.

---

## 🤝 Suporte

Para dúvidas sobre a API do Gemini, consulte a [documentação oficial](https://ai.google.dev/docs).

---

**Desenvolvido com ❤️ para profissionais de saúde**
