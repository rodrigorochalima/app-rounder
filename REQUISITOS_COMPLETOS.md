# 📋 CHECKLIST COMPLETO DE REQUISITOS - APP ROUNDER

**Data:** 03/12/2025 12:30 GMT-3  
**Status:** EM ANÁLISE

---

## 🔐 1. SISTEMA DE LOGIN COMPLETO

### 1.1. Tela de Login
- [ ] **Campo de email** com validação
- [ ] **Campo de senha** com validação
- [ ] **Botão "Mostrar/Ocultar senha"** (ícone de olho)
- [ ] **Checkbox "Manter conectado"** (lembrar login)
- [ ] **Botão "Entrar"** (principal)
- [ ] **Link "Esqueci minha senha"** (recuperação)
- [ ] **Link "Criar conta"** (registro)
- [ ] **Mensagens de erro claras** (email inválido, senha incorreta)
- [ ] **Loading durante autenticação**

### 1.2. Recuperação de Senha
- [ ] **Página dedicada de recuperação**
- [ ] **Campo de email**
- [ ] **Botão "Enviar link de recuperação"**
- [ ] **Mensagem de confirmação** (email enviado)
- [ ] **Link de reset funcional** (enviado por email)
- [ ] **Página de redefinição de senha**
- [ ] **Campo "Nova senha"**
- [ ] **Campo "Confirmar nova senha"**
- [ ] **Validação de força da senha**
- [ ] **Botão "Redefinir senha"**
- [ ] **Redirecionamento para login após sucesso**

### 1.3. Registro de Usuário
- [ ] **Campo "Nome completo"**
- [ ] **Campo "Email"** com validação
- [ ] **Campo "Senha"** com validação de força
- [ ] **Campo "Confirmar senha"**
- [ ] **Checkbox "Aceito os termos"**
- [ ] **Botão "Criar conta"**
- [ ] **Verificação de email duplicado**
- [ ] **Email de confirmação** (opcional)

### 1.4. Manter Conectado
- [ ] **Persistência de sessão** (localStorage/cookie)
- [ ] **Auto-login ao reabrir app**
- [ ] **Expiração configurável** (7 dias, 30 dias)
- [ ] **Opção de logout em todos os dispositivos**

### 1.5. Segurança
- [ ] **Proteção contra brute force** (limite de tentativas)
- [ ] **Captcha após 3 tentativas falhas** (opcional)
- [ ] **Token JWT seguro**
- [ ] **HTTPS obrigatório**
- [ ] **Sanitização de inputs**

**Status atual:** ⚠️ PARCIAL
- ✅ Login básico existe
- ❌ Falta "Mostrar senha"
- ❌ Falta "Manter conectado"
- ❌ Recuperação de senha incompleta
- ❌ Registro incompleto

---

## 🎨 2. IDENTIDADE VISUAL E MARCA

### 2.1. Ícone da Marca
- [ ] **Ícone visível no header** (canto superior esquerdo)
- [ ] **Tamanho adequado** (40-60px)
- [ ] **Alta resolução** (SVG ou PNG @2x)
- [ ] **Link para home** (ao clicar no ícone)
- [ ] **Favicon atualizado** (ícone no navegador)
- [ ] **PWA icons** (para instalação mobile)

### 2.2. Logo Institucional
- [ ] **Campo para upload de logo** (perfil do usuário)
- [ ] **Suporte a PNG, JPG, SVG**
- [ ] **Preview do logo**
- [ ] **Redimensionamento automático**
- [ ] **Armazenamento no Supabase Storage**
- [ ] **URL pública do logo**

### 2.3. Branding Consistente
- [ ] **Paleta de cores definida**
- [ ] **Tipografia consistente**
- [ ] **Espaçamento padronizado**
- [ ] **Ícones do mesmo estilo**

**Status atual:** ❌ NÃO IMPLEMENTADO
- ❌ Ícone não está visível
- ❌ Logo institucional não existe
- ⚠️ Branding parcial

---

## 👤 3. PAINEL DE PERFIL COMPLETO

### 3.1. Estrutura do Painel
- [ ] **Modal/Página dedicada de perfil**
- [ ] **Abas organizadas:**
  - [ ] **Dados Pessoais**
  - [ ] **Segurança**
  - [ ] **APIs**
  - [ ] **Templates de Impressão**
  - [ ] **Configurações**

### 3.2. Aba "Dados Pessoais"
- [ ] **Foto de perfil** (upload)
- [ ] **Nome completo** (editável)
- [ ] **Email** (não editável)
- [ ] **Especialidade médica** (campo novo)
- [ ] **CRM** (campo novo)
- [ ] **Instituição** (campo novo)
- [ ] **Logo da instituição** (upload)
- [ ] **Telefone** (opcional)
- [ ] **Botão "Salvar alterações"**

### 3.3. Aba "Segurança"
- [ ] **Seção "Mudar Senha":**
  - [ ] Campo "Senha atual"
  - [ ] Campo "Nova senha"
  - [ ] Campo "Confirmar nova senha"
  - [ ] Validação de força
  - [ ] Botão "Atualizar senha"
- [ ] **Seção "Sessões Ativas":**
  - [ ] Lista de dispositivos conectados
  - [ ] Data do último acesso
  - [ ] Botão "Desconectar todos"
- [ ] **Seção "Autenticação em 2 Fatores"** (futuro)

### 3.4. Aba "APIs"
- [ ] **Mover dashboard de APIs para cá**
- [ ] **Estatísticas de uso**
- [ ] **Adicionar/Editar/Deletar APIs**
- [ ] **Ativar/Desativar**
- [ ] **Definir padrão**
- [ ] **Limites e alertas**

### 3.5. Aba "Templates de Impressão"
- [ ] **Lista de templates disponíveis:**
  - [ ] Template Padrão
  - [ ] Template Minimalista
  - [ ] Template Institucional
  - [ ] Template Completo
- [ ] **Preview de cada template**
- [ ] **Botão "Selecionar como padrão"**
- [ ] **Botão "Personalizar"** (editor)
- [ ] **Campos personalizáveis:**
  - [ ] Cabeçalho (logo + nome instituição)
  - [ ] Rodapé (contato, CRM)
  - [ ] Fonte e tamanho
  - [ ] Cores
  - [ ] Espaçamento
- [ ] **Botão "Criar novo template"**
- [ ] **Botão "Importar template"** (JSON)
- [ ] **Botão "Exportar template"** (JSON)

### 3.6. Aba "Configurações"
- [ ] **Idioma** (PT-BR, EN)
- [ ] **Tema** (Claro, Escuro, Auto)
- [ ] **Notificações** (Email, Push)
- [ ] **Formato de data** (DD/MM/YYYY, MM/DD/YYYY)
- [ ] **Fuso horário**
- [ ] **Privacidade:**
  - [ ] Compartilhar dados de uso
  - [ ] Permitir analytics
- [ ] **Botão "Deletar conta"** (com confirmação)

**Status atual:** ❌ NÃO IMPLEMENTADO
- ❌ Painel de perfil não existe
- ❌ APIs estão no header (local errado)
- ❌ Sem opção de mudar senha
- ❌ Sem templates de impressão

---

## 📄 4. SISTEMA DE TEMPLATES DE IMPRESSÃO

### 4.1. Estrutura de Template
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Template Institucional",
  "is_default": true,
  "header": {
    "show_logo": true,
    "logo_url": "https://...",
    "logo_position": "left",
    "institution_name": "Hospital XYZ",
    "show_date": true,
    "show_doctor_name": true
  },
  "body": {
    "font_family": "Arial",
    "font_size": 12,
    "line_height": 1.5,
    "text_color": "#000000",
    "sections": [
      {
        "title": "Anamnese",
        "show_title": true,
        "content": "{{anamnese}}"
      },
      {
        "title": "Exame Físico",
        "show_title": true,
        "content": "{{exame_fisico}}"
      }
    ]
  },
  "footer": {
    "show_doctor_name": true,
    "show_crm": true,
    "show_contact": true,
    "contact_text": "Tel: (XX) XXXXX-XXXX | Email: contato@hospital.com",
    "show_page_number": true
  },
  "styles": {
    "page_size": "A4",
    "margins": {
      "top": 20,
      "right": 20,
      "bottom": 20,
      "left": 20
    },
    "primary_color": "#4A5568",
    "secondary_color": "#718096"
  }
}
```

### 4.2. Templates Pré-Configurados

#### Template 1: Padrão
- [ ] **Cabeçalho:** Logo + Nome instituição + Data
- [ ] **Corpo:** Texto simples, seções divididas
- [ ] **Rodapé:** Nome médico + CRM + Contato

#### Template 2: Minimalista
- [ ] **Cabeçalho:** Apenas data
- [ ] **Corpo:** Texto corrido, sem divisões
- [ ] **Rodapé:** Apenas nome médico

#### Template 3: Institucional
- [ ] **Cabeçalho:** Logo grande + Nome instituição + Endereço
- [ ] **Corpo:** Seções com títulos destacados
- [ ] **Rodapé:** Rodapé completo com todos os dados

#### Template 4: Completo
- [ ] **Cabeçalho:** Logo + Dados completos da instituição
- [ ] **Corpo:** Seções detalhadas com ícones
- [ ] **Rodapé:** Rodapé com QR code (opcional)

### 4.3. Editor de Templates
- [ ] **Interface visual** (arrastar e soltar)
- [ ] **Preview em tempo real**
- [ ] **Campos personalizáveis:**
  - [ ] Texto estático
  - [ ] Variáveis dinâmicas ({{nome_paciente}}, {{data}})
  - [ ] Imagens (logo, assinatura)
  - [ ] Linhas divisórias
  - [ ] Tabelas
- [ ] **Estilos CSS personalizados**
- [ ] **Exportar/Importar JSON**

### 4.4. Banco de Dados
```sql
CREATE TABLE user_templates (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  template_json JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_logos (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  file_name TEXT,
  file_url TEXT,
  file_size INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Status atual:** ❌ NÃO IMPLEMENTADO
- ❌ Sistema de templates não existe
- ❌ Sem upload de logo
- ❌ Sem geração de PDF formatado

---

## 📥 5. GERAÇÃO DE PDF FORMATADO

### 5.1. Fluxo de Geração
1. **Usuário clica em "Gerar Round"**
2. **IA processa e gera texto**
3. **Sistema pega template padrão do usuário**
4. **Substitui variáveis dinâmicas:**
   - `{{data}}` → Data atual
   - `{{nome_medico}}` → Nome do perfil
   - `{{crm}}` → CRM do perfil
   - `{{instituicao}}` → Nome da instituição
   - `{{logo_url}}` → URL do logo
   - `{{round_text}}` → Texto gerado pela IA
5. **Gera PDF usando biblioteca** (ex: jsPDF, pdfmake)
6. **Salva PDF no Supabase Storage**
7. **Retorna URL para download**
8. **Exibe preview do PDF**
9. **Botão "Baixar PDF"**
10. **Botão "Enviar por email"** (opcional)

### 5.2. Bibliotecas Necessárias
- [ ] **jsPDF** ou **pdfmake** (geração de PDF)
- [ ] **html2canvas** (converter HTML para imagem)
- [ ] **react-pdf** (preview de PDF)

### 5.3. Funcionalidades
- [ ] **Gerar PDF automaticamente ao gerar round**
- [ ] **Preview do PDF antes de baixar**
- [ ] **Botão "Baixar PDF"**
- [ ] **Botão "Imprimir"**
- [ ] **Botão "Enviar por email"** (futuro)
- [ ] **Histórico de PDFs gerados**
- [ ] **Armazenamento no Supabase Storage**

### 5.4. Formato do PDF
- [ ] **Tamanho:** A4 (210mm x 297mm)
- [ ] **Margens:** 20mm (todas)
- [ ] **Fonte:** Arial ou similar
- [ ] **Tamanho da fonte:** 12pt (corpo), 14pt (títulos)
- [ ] **Espaçamento:** 1.5
- [ ] **Cabeçalho:** Logo + Dados institucionais
- [ ] **Rodapé:** Nome médico + CRM + Página X de Y

**Status atual:** ❌ NÃO IMPLEMENTADO
- ❌ Não gera PDF
- ❌ Apenas mostra texto na tela
- ❌ Sem formatação profissional

---

## 📊 RESUMO DO STATUS ATUAL

### ✅ O que JÁ ESTÁ FUNCIONANDO:
1. ✅ Login básico (email + senha)
2. ✅ Registro básico
3. ✅ Geração de rounds com IA
4. ✅ Sistema de regras médicas
5. ✅ Dashboard de APIs (mas no local errado)
6. ✅ Histórico de rounds
7. ✅ Responsividade mobile (parcial)

### ❌ O que FALTA IMPLEMENTAR:
1. ❌ **Login completo:**
   - Mostrar/ocultar senha
   - Manter conectado
   - Recuperação de senha completa
2. ❌ **Ícone da marca visível**
3. ❌ **Logo institucional (upload)**
4. ❌ **Painel de perfil completo:**
   - Dados pessoais
   - Mudar senha
   - APIs (mover para cá)
   - Templates de impressão
   - Configurações
5. ❌ **Sistema de templates:**
   - Templates pré-configurados
   - Editor de templates
   - Personalização
6. ❌ **Geração de PDF formatado:**
   - Com template
   - Com logo institucional
   - Download automático

---

## 🎯 PRIORIZAÇÃO

### Prioridade 1 (CRÍTICO):
1. **Login completo** (mostrar senha, manter conectado, recuperação)
2. **Ícone da marca visível**
3. **Painel de perfil com mudar senha**

### Prioridade 2 (IMPORTANTE):
4. **Upload de logo institucional**
5. **Mover APIs para painel de perfil**
6. **Sistema de templates básico** (1-2 templates)

### Prioridade 3 (ESSENCIAL):
7. **Geração de PDF formatado**
8. **Editor de templates**
9. **Personalização completa**

### Prioridade 4 (FUTURO):
10. Leitura de links (Google Docs, etc.)
11. Layout minimalista (1 tela)
12. App nativo

---

## 📝 PRÓXIMOS PASSOS

1. **Confirmar requisitos** com você
2. **Implementar Prioridade 1** (login completo + ícone)
3. **Implementar Prioridade 2** (perfil + logo + templates)
4. **Implementar Prioridade 3** (geração de PDF)
5. **Testar tudo**
6. **Deploy**

---

**Aguardando sua confirmação para começar a implementação! 🚀**
