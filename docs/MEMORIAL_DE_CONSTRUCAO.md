# Memorial de Construção — App Rounder

> **Status:** documento operacional da auditoria completa iniciada em 17 de agosto de 2026. Deve ser lido e atualizado antes de qualquer alteração funcional, visual, de segurança ou de deploy.

## Objetivo do produto

O App Rounder é uma aplicação pessoal para o médico Rodrigo Rocha Lima, voltada à organização e geração de rounds assistenciais de UTI. A aplicação recebe transcrições e documentos clínicos, utiliza regras e memória clínica para organizar o round e gera documentos de apoio.

## Decisões consolidadas

| Tema | Decisão que deve ser preservada |
|---|---|
| Identidade de conta | Autenticação própria com JWT; nunca redirecionar o usuário para autenticação da plataforma Manus/O-Alt ou Supabase. |
| Dados | PostgreSQL no Neon, com armazenamento persistente de regras, histórico, RAG, perfil e instituições. |
| Hospedagem | Vercel, com frontend React/TypeScript e APIs Express serverless. |
| Custo | Preferir soluções gratuitas ou de baixo custo, sem comprometer segurança e confiabilidade. |
| Público | Uso clínico pessoal, com tratamento de dados potencialmente sensíveis. Aplicar minimização, transparência, segurança e controles de conta. |
| Design | Preservar a identidade visual existente e integrar melhorias sem remover funcionalidades, dados ou fluxos já entregues. |
| Mobile | Fluxos devem ser mobile-first e utilizáveis em iOS/Android. Para PDF em iOS, o caminho suportado pela plataforma é seleção de arquivo e/ou Share Sheet do PWA instalado; não prometer colagem de arquivo em textarea quando o navegador não a suporta. |

## Requisitos acumulados

1. Receber transcrições e arquivos TXT, PDF, DOCX, SRT e áudio, com extração e preenchimento confiáveis.
2. Manter RAG clínico entre rounds, com janela de 60 dias, histórico e pendências por paciente/leito.
3. Suportar múltiplas instituições, logomarca, dados GPS e instituição padrão.
4. Manter perfil médico para cabeçalho, rodapé, CRM e assinatura do documento.
5. Fornecer API Manager com chaves, consumo e orientação de configuração.
6. Manter painel SISOP, versões, backup/exportação e funcionalidades administrativas conforme permissões.
7. Exibir dados e notícias coerentes com filtros, hierarquia e atualidade; conteúdo temporal não pode permanecer desatualizado após período sem acesso.
8. Ter login persistente e seguro, painel de conta/perfil, recuperação de senha robusta, encerramento de sessão e proteção contra acesso indevido.
9. Incluir Termos de Uso, Política de Privacidade, transparência de dados, mecanismos de aceite e documentos de suporte para distribuição em lojas.
10. Validar fluxos de ponta a ponta em browser; não considerar a entrega concluída apenas com build ou leitura de código.

## Histórico recente e hipótese de risco

| Item | Estado conhecido | Ação obrigatória na auditoria |
|---|---|---|
| Share Target de PDF | Implementado em tentativa anterior, mas não comprovado em iOS real. | Verificar manifest, service worker, ciclo de vida do PWA, recepção, autenticação e extração; reportar limite de plataforma com precisão. |
| "Colar PDF" em textarea no iOS | Usuário precisa desse comportamento; Safari pode limitar clipboard de arquivos. | Não alegar suporte sem comprovação. Criar o fluxo mais próximo possível, com instrução objetiva e fallback real. |
| Notícias | Usuário reportou itens antigos após período sem acesso. | Auditar fonte, atualização, cache, filtros e ordenação temporal. |
| Hierarquia/filtros | Usuário reportou desrespeito à delimitação solicitada. | Mapear regras e dados; criar testes por casos concretos. |
| Conta e segurança | Solicitação ampliada para padrão profissional. | Auditar tokens, sessões, recuperação de senha, e-mail, rate limits, headers, logs, dados sensíveis e revogação. |

## Protocolo de trabalho

1. Inventariar a implementação e registrar evidências antes de corrigir.
2. Criar uma matriz requisito → implementação → teste real → resultado.
3. Priorizar bloqueios clínicos, segurança, dados e navegação antes de melhorias cosméticas.
4. Alterar módulos de modo cirúrgico e preservar banco, histórico e design existente.
5. Fazer build, testes de API e testes no browser após cada conjunto de mudanças.
6. Fazer deploy somente após critérios objetivos de aceite atendidos.
7. Atualizar este memorial sempre que uma decisão, risco ou resultado de teste mudar.

## Proibição de entrega prematura

Nenhuma funcionalidade será declarada concluída apenas por compilar. O relatório final deve distinguir: **validado no browser**, **validado por API**, **requer validação em dispositivo iOS físico**, e **limitação comprovada da plataforma**.

## Dados de acesso de teste

As credenciais de teste e segredos ficam fora deste arquivo e não devem ser incluídos em commits ou logs. Usar apenas variáveis de ambiente e mecanismos já configurados para testes autorizados.

## Evidências confirmadas na auditoria em produção

| Teste | Resultado | Consequência |
|---|---|---|
| Login visual | O endpoint respondeu corretamente, mas o formulário permaneceu em “Processando...” no teste inicial. | Instrumentar e corrigir a transição de login antes de declarar persistência confiável. |
| PDF de transcrição | `POST /api/extract-text` retornou HTTP 500 com `DOMMatrix is not defined` para o PDF de exemplo. | A importação de PDF não está funcional em produção; a dependência/estratégia de extração deve ser substituída ou adaptada para serverless. |
| Share Target/PWA | Nenhum service worker estava registrado na página autenticada em produção. | O Share Target não pode funcionar na versão publicada enquanto o registro não for integrado à árvore ativa. |
| SISOP | Um usuário com papel `rotineiro` recebeu HTTP 200 em rota SISOP. | Implementar autorização de papel no backend e ocultar a entrada administrativa para perfis não autorizados. |
| Atualizações SISOP | A consulta manual devolveu `checked: 0` e manteve data de verificação de junho de 2026. | A lógica de atualização falha silenciosamente e a interface apresenta estado temporal obsoleto. |
| Painel de conta | A aba “Configurações” do perfil exibe “Em desenvolvimento”; não há controles de sessões, exclusão de conta ou privacidade. | Substituir placeholder por gestão de conta e dados, sem remover o design base. |
| Regras | A API de regras responde corretamente, mas a conta de teste não possui regras padrão e a página principal lê um campo de resposta inconsistente. | Padronizar contratos de API/UI, migrar dados existentes com segurança e testar ordenação/hierarquia. |
| Persistência | Uma sessão criada explicitamente em `localStorage` persistiu após recarregamento. | Criar política de sessão explícita: persistência opcional, expiração, rotação, encerramento global e revogação. |

## Correções implementadas — aguardando validação em produção

| Frente | Implementação concluída no código | Validação ainda exigida |
|---|---|---|
| Sessão e login | Refresh token em cookie `HttpOnly`, sessão rotativa/revogável, limite de tentativas, encerramento global, expiração curta de access token e redefinição de senha invalidando sessões. | Login, refresh, logout, alteração de senha e recuperação por e-mail em produção. |
| Segredos de IA | Chaves passam a ser cifradas no servidor e nunca são devolvidas ao navegador; geração, validação e transcrição usam proxy autenticado. | Cadastro de chaves, geração real e métricas por provedor. |
| PDF e PWA | Extração de PDF adaptada à API atual do `pdf-parse`; registro do service worker inserido na árvore ativa. | Importação real de PDF e Share Target em PWA instalado no iOS. |
| Regras e SISOP | Contrato de regras corrigido na tela principal; SISOP restrito por papel no backend e ocultado para usuários não autorizados; data de checagem é renovada mesmo sem release externa. | Contas com papéis distintos e checagem SISOP em produção. |
| Privacidade e conta | Termos, Política de Privacidade e aviso clínico públicos; aceite versionado; painel com sessões, logout global, exportação e exclusão confirmada; cadastro requer aceite informado. | Persistência de aceite, exportação e exclusão em conta de teste descartável. |
| Navegação | Rotas antigas, desconectadas e com dependência de Supabase foram removidas da release ativa; a experiência publicada concentra-se no fluxo principal protegido. | Navegação completa no browser após deploy. |
| Runtime Vercel | O primeiro deploy auditado respondeu `FUNCTION_INVOCATION_FAILED` no login: a importação estática de `pdf-parse` impedia a inicialização da função. A dependência foi deslocada para importação tardia, apenas na rota de PDF. | Deploy corretivo e login/PDF em produção. |

## Próxima atualização

A próxima etapa é a validação real em ambiente publicado. Não declarar nenhum item pronto antes de registrar evidência de browser e API no relatório final. A correção de importação tardia do PDF foi validada localmente contra o Neon: login HTTP 200 e extração do PDF de referência HTTP 200.
