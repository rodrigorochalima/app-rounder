# Relatório Final de Auditoria, Correções e Validação

**Produto:** App Rounder — gerador de rounds assistenciais

**Ambiente publicado:** [https://app-rounder.vercel.app](https://app-rounder.vercel.app)

**Data da validação:** 17 de agosto de 2026

**Escopo:** revisão de requisitos, segurança de conta, privacidade, navegação, importação de documentos, integração de IA, organização de perfil e verificações reais de browser e API.

> Este relatório separa de forma explícita o que foi **validado em produção**, o que foi **validado por API**, e o que exige obrigatoriamente um teste no dispositivo físico. Nenhum item abaixo deve ser interpretado como certificação jurídica, regulatória ou aprovação automática em loja.

## 1. Resultado executivo

A auditoria encontrou falhas concretas que impediam a operação profissional do App Rounder: extração de PDF quebrada em produção, função serverless suscetível a falha de inicialização, sessão baseada somente em armazenamento local, ausência de gestão de sessão e dados pessoais, exposição inadequada de segredos de provedores de IA ao frontend, permissões administrativas incompletas e lacunas de documentos legais.

O pacote corretivo foi publicado no ambiente principal. A versão atual passou pelos testes reais listados neste relatório, incluindo login em browser, persistência de sessão após recarregamento, painel de conta, exportação de dados, exclusão com conta descartável, isolamento de rota administrativa, e importação do PDF de referência pelo endpoint de produção.

| Situação | Resultado |
|---|---|
| Ambiente de produção | Publicado e acessível em `app-rounder.vercel.app` |
| Login no browser | Validado com conta de teste |
| Persistência após recarregar | Validada no browser |
| Extração do PDF de referência em produção | Validada; HTTP 200 e conteúdo extraído |
| Gestão de privacidade e exportação | Validada no browser e API |
| Exclusão de conta | Validada de ponta a ponta com conta descartável |
| PWA / Share Target no iOS | Implementado, mas requer teste físico no iPhone instalado como PWA |
| Aprovação Apple/Google | Ainda depende de empacotamento nativo, cadastros de loja e revisão jurídica/regulatória |

## 2. Correções estruturais entregues

### 2.1 Autenticação, persistência e proteção de conta

O fluxo de autenticação foi remodelado para separar o token curto de acesso da sessão persistente. O access token tem duração reduzida; a sessão persistente usa refresh token rotativo em cookie `HttpOnly`, `Secure` e `SameSite=Lax`. O token persistente não é devolvido em JSON ao navegador. A rotação revoga o token anterior, e as rotas permitem listar sessões e encerrar todas as sessões. Alterações de senha invalidam sessões ativas.

O login também passou a ter proteção contra abuso por limitação de tentativas. A recuperação de senha foi preservada com link de redefinição e agora faz parte do fluxo de segurança de conta, em vez de depender somente de uma senha local.

| Controle | Implementação | Evidência de validação |
|---|---|---|
| Sessão persistente | Refresh token rotativo protegido por cookie | Login local retornou cookie com `HttpOnly`, `Secure`, `SameSite=Lax`; refresh retornou novo cookie |
| Persistência de login | Reidratação pela sessão protegida | Área autenticada permaneceu aberta após recarregamento em produção |
| Encerramento global | Rota e botão no painel de perfil | Endpoint e interface implementados; não foi executado na conta de navegador para preservar a sessão de auditoria |
| Recuperação de senha | Solicitação e confirmação por link | Fluxo revisado no código e integrado ao serviço de autenticação |
| Exclusão de conta | Confirmação por senha + frase explícita | Conta descartável criada, excluída e impossibilitada de relogar (HTTP 401) |

### 2.2 Dados, privacidade e gestão do perfil

O painel **Meu Perfil → Configurações** deixou de ser um placeholder. Ele reúne ações de segurança e direitos do usuário: sessões, encerramento global, exportação JSON, documentos legais, registro de aceite e exclusão irreversível de conta. A exportação inclui perfil, regras, históricos, instituições, contexto clínico e metadados de chaves de API; deliberadamente não inclui chaves secretas cifradas.

Foram criadas rotas para registrar aceites versionados de Termos, Privacidade e Aviso Clínico/IA, além de tabelas de suporte no PostgreSQL. A tela de cadastro agora exige aceite explícito e oferece os documentos antes da criação de conta.

A Apple exige que apps que permitem criar conta também ofereçam um meio de iniciar a exclusão dentro do aplicativo, com processo transparente e exclusão dos dados associados, salvo retenções legalmente necessárias.[1] A implementação atende tecnicamente a esse requisito com ação localizável no painel, confirmação de senha e frase explícita; a política informa a irreversibilidade e incentiva a exportação antes da ação.

### 2.3 Segredos e geração por IA

As chaves de provedores de IA não são mais devolvidas ao frontend após o cadastro. Elas são cifradas e utilizadas por um proxy autenticado no backend para geração e validação clínica. O navegador recebe apenas metadados de configuração e uso, evitando a exposição direta de `encrypted_key`, IV ou chave de provedor.

A geração continua dependente de provedores configurados pelo usuário. Essa é uma escolha intencional: a interface informa claramente quando não existem chaves ativas, evitando falsa indicação de que o round foi produzido sem um provedor funcional.

### 2.4 Hierarquia, autorização e atualidade operacional

As rotas SISOP foram protegidas no backend por papel autorizado, e o atalho administrativo deixou de ser exibido para perfis rotineiros. Em produção, a conta de teste não visualiza o botão SISOP. O comportamento anterior de apresentar data de checagem antiga quando não havia release externa foi ajustado: a verificação passa a registrar a data real da consulta, evitando a impressão de que a função parou de atualizar.

As regras do round também tiveram o contrato API/interface alinhado. O objetivo é preservar a ordenação configurada pelo usuário, sem a interface ler um campo diferente do contrato devolvido pela API.

### 2.5 PDF, arquivos e PWA

A importação de arquivos foi mantida com botão destacado para PDF, áudio e texto. O endpoint de extração PDF foi submetido a correção específica para o runtime serverless: a dependência foi substituída por um extrator compatível com Node/CommonJS e carregada no backend sem derrubar a função de login. O PDF fornecido para auditoria foi processado em produção com sucesso.

O service worker passou a ser registrado na árvore efetivamente publicada, e o manifest inclui Share Target. O recurso permite que um PWA instalado receba arquivos pelo menu de Compartilhar do sistema; contudo, o comportamento de recebimento depende do Safari/iOS físico, da instalação pela Tela de Início e das políticas do sistema operacional. O sandbox não possui iPhone para validar esse último passo.

## 3. Documentos legais e transparência clínica

Foram publicadas páginas estáveis e acessíveis sem login:

| Documento | URL |
|---|---|
| Termos de Uso | [https://app-rounder.vercel.app/legal/terms](https://app-rounder.vercel.app/legal/terms) |
| Política de Privacidade | [https://app-rounder.vercel.app/legal/privacy](https://app-rounder.vercel.app/legal/privacy) |
| Aviso de Segurança Clínica e IA | [https://app-rounder.vercel.app/legal/clinical-ai](https://app-rounder.vercel.app/legal/clinical-ai) |

Os textos explicam o caráter de apoio à redação, a necessidade de revisão humana, o tratamento de dados e a transferência necessária a provedores de IA escolhidos pelo usuário. A política registra a retenção operacional configurada do índice RAG de até 60 dias e os direitos de exportação/exclusão disponibilizados no app.

O Google Play exige, para apps de saúde, política de privacidade publicamente acessível dentro e fora do aplicativo, declaração de saúde no console e aviso/disclaimer apropriado quando a funcionalidade não constitui dispositivo médico.[2] O App Rounder agora oferece os documentos e o aviso clínico no produto, mas a publicação em loja continuará exigindo o preenchimento das declarações no Play Console, uma URL de política na ficha da loja e revisão jurídica do uso institucional de dados de saúde.

> **Limite jurídico importante:** os documentos publicados são uma base operacional de transparência, não substituem avaliação de advogado, DPO/encarregado, contratos de operador/controlador, política institucional ou parecer regulatório. Antes de distribuição comercial ou institucional, eles devem ser revisados e adaptados à realidade da organização, aos fornecedores de IA utilizados e à LGPD.

## 4. Evidências de testes executados

Todos os testes abaixo foram realizados no ambiente publicado ou contra o banco Neon efetivamente utilizado pela publicação. Credenciais e tokens foram mantidos fora do repositório e não estão neste relatório.

| Cenário | Camada | Resultado |
|---|---|---|
| Build TypeScript | CI local | `pnpm check` concluído sem erro |
| Build de produção | CI local | `pnpm build` concluído sem erro |
| Login | Browser e API de produção | HTTP 200; navegação para área protegida concluída |
| Persistência de sessão | Browser de produção | Recarregamento manteve a sessão autenticada |
| Cookie de sessão | API local conectada ao Neon | `HttpOnly`, `Secure`, `SameSite=Lax`, rotação validada |
| Rota sem token | API local | HTTP 401 confirmado |
| Rota SISOP com perfil rotineiro | API local | HTTP 403 confirmado |
| Lista de chaves | API local | Nenhum campo de segredo retornado |
| Proxy IA sem chave configurada | API local | HTTP 409 e mensagem segura, sem segredo |
| Aceite legal | API local | HTTP 201 e listagem HTTP 200 |
| Exportação de dados | API local e browser publicado | HTTP 200; download iniciado pela interface |
| Exclusão de conta | API local, conta descartável | Criação HTTP 201, exclusão HTTP 200, novo login HTTP 401 |
| PDF de referência | API de produção | Login HTTP 200; extração PDF HTTP 200; metadados de páginas e texto retornados |
| Perfil e privacidade | Browser de produção | Painel exibiu sessões, exportação, aceites e zona de exclusão |
| Documentos legais | Browser de produção | Política de Privacidade renderizada e acessível sem login |

## 5. Itens que requerem sua prova de fogo no iPhone

A produção está pronta para o teste final do fluxo pessoal. O que ainda não pode ser certificado pelo sandbox é a interação nativa de um iPhone: Safari, teclado, área de transferência de arquivo e Share Sheet são controlados pelo iOS.

O teste recomendado é o seguinte: abra o app no Safari, instale-o com **Compartilhar → Adicionar à Tela de Início**, abra pelo ícone, e então envie o PDF pelo botão laranja de importação ou pelo menu **Compartilhar → Rounder**. Após selecionar ou compartilhar o arquivo, a transcrição deve preencher o campo e o botão de geração deve reconhecer a entrada. O endpoint que faz a extração já foi testado em produção com o mesmo PDF fornecido para auditoria.

## 6. Pendências de produto que permanecem deliberadamente fora da declaração de “pronto para loja”

A aplicação web agora tem uma base técnica significativamente mais segura, mas não existe aprovação automática para Apple App Store ou Google Play. Para envio a lojas, ainda serão necessários: empacotamento nativo ou solução de wrapper com validação de permissões, ficha de loja, declaração de saúde no Play Console, política na URL exigida pela loja, ícones/splash, declaração de dados, testes em dispositivos iOS e Android físicos e revisão jurídica/regulatória do uso de informações de saúde. A Apple também pode exigir detalhes adicionais se o app for distribuído como serviço em setor altamente regulado.[1]

Além disso, o componente de IA deve permanecer estritamente como apoio documental. Nenhuma saída do sistema deve ser apresentada como diagnóstico, prescrição autônoma, dispositivo médico ou decisão clínica definitiva. A revisão por profissional habilitado é obrigatória.

## 7. Como validar agora

A versão disponível para sua prova de fogo é:

> **[https://app-rounder.vercel.app](https://app-rounder.vercel.app)**

Use a conta pessoal ou, se necessário, a conta de teste previamente criada. Para testar importação, selecione o mesmo PDF de referência pelo botão **“Importar PDF, Áudio ou Texto”**. Para testar os novos controles, abra **Meu Perfil → Configurações**.

## Referências

[1]: https://developer.apple.com/support/offering-account-deletion-in-your-app/ "Apple Developer — Offering account deletion in your app"

[2]: https://support.google.com/googleplay/android-developer/answer/16679511?hl=en "Google Play — Health Content and Services"
