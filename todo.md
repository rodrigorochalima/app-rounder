# TODO - Assistente de Evolução Clínica

## Configuração Inicial
- [x] Instalar dependências necessárias (jszip, @google/generative-ai, jspdf, html2canvas)
- [x] Configurar tema escuro como padrão
- [x] Criar tipos TypeScript para a aplicação

## Interface do Usuário
- [x] Criar layout responsivo de três painéis (desktop) e abas (mobile)
- [x] Implementar Header com alternador de tema claro/escuro
- [x] Criar painel de Histórico (HistoryPanel)
- [x] Criar painel de Entrada de Dados (InputForm)
- [x] Criar painel de Resultado (OutputDisplay)
- [x] Implementar navegação por abas para mobile
- [x] Adicionar componente Spinner para feedback de carregamento

## Processamento de Dados
- [x] Implementar importação de arquivo ZIP do WhatsApp
- [x] Criar parser para _chat.txt com regex especificado
- [x] Associar arquivos de mídia (imagens, áudios) às mensagens
- [x] Criar estrutura de linha do tempo completa
- [x] Implementar filtros de período (Hoje, Hoje e Ontem, Tudo)
- [x] Criar visualização da linha do tempo filtrada

## Integração com IA
- [x] Criar serviço de integração com Gemini API
- [x] Implementar envio multimodal (texto + imagens + áudios)
- [x] Criar prompt estruturado conforme especificação
- [x] Processar resposta da IA (JSON + Markdown)
- [x] Implementar uso de contexto de relatório anterior

## Funcionalidades Avançadas
- [x] Implementar campo de instruções adicionais
- [x] Criar sistema de persistência no localStorage
- [x] Implementar salvamento de prontuários no histórico
- [x] Criar seleção de prontuário anterior como contexto
- [x] Implementar visualização em abas (Markdown e JSON)
- [x] Criar componente de renderização de Markdown
- [x] Implementar exportação para PDF

## Testes e Finalização
- [x] Testar importação de ZIP
- [x] Testar filtragem de mensagens
- [x] Testar geração de prontuários
- [x] Testar persistência de dados
- [x] Testar exportação de PDF
- [x] Testar responsividade em diferentes dispositivos
- [x] Verificar acessibilidade e usabilidade

## Sistema de Aprendizado Automático
- [x] Criar campo para API Key do Gemini
- [x] Implementar sistema de feedback (👍/👎) para prontuários
- [x] Criar sistema de preferências que se auto-ajustam
- [x] Implementar memória de padrões aprovados
- [x] Adicionar análise automática de estilo dos prontuários aprovados
- [x] Criar sistema de templates baseados em aprovações


## Melhorias de UX
- [x] Implementar suporte a Ctrl+V para colar arquivos ZIP
- [x] Adicionar drag & drop para arrastar arquivos ZIP
- [x] Criar área visual de drop zone

## Ajustes de Tema
- [x] Alterar tema padrão de escuro para claro

## Correções Urgentes
- [x] Corrigir regex do parser para formato real do WhatsApp [DD/MM/YYYY, HH:MM:SS]
- [x] Ajustar detecção de anexos para formato <anexado: arquivo>
- [x] Filtrar mensagens do sistema (ligações, convites, etc)
- [x] Remover caracteres invisíveis (LEFT-TO-RIGHT MARK) do WhatsApp
