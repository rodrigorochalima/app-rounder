/**
 * Agente 3: Validador Médico
 * Valida terminologia médica usando Groq LLaMA 3.1 8B
 */

import { MEDICAMENTOS_SUS, SIGLAS_UTI, PROCEDIMENTOS_UTI, CORRECOES_COMUNS } from './dicionario-uti-sus';
import { secureChat } from './server-ai.service';

export interface ResultadoValidacao {
  documentoCorrigido: string;
  correcoes: Correcao[];
  tempoSegundos: number;
}

export interface Correcao {
  tipo: 'medicamento' | 'sigla' | 'procedimento' | 'alucinacao' | 'outro';
  original: string;
  corrigido: string;
  linha?: number;
}

/**
 * Valida e corrige terminologia médica no documento
 */
export async function validarTerminologiaMedica(documento: string): Promise<ResultadoValidacao> {
  const inicio = Date.now();

  try {
    // Montar prompt para o Groq
    const prompt = montarPromptValidacao(documento);

    // A chave Groq permanece no servidor; o navegador recebe somente o texto final.
    const documentoCorrigido = (await secureChat({
      provider: 'groq',
      model: 'llama-3.1-8b-instant',
      system: SYSTEM_PROMPT_VALIDADOR,
      prompt,
      temperature: 0.1,
      maxTokens: 8000,
    })).trim();

    // Detectar correções feitas
    const correcoes = detectarCorrecoes(documento, documentoCorrigido);

    const tempoSegundos = (Date.now() - inicio) / 1000;

    return {
      documentoCorrigido,
      correcoes,
      tempoSegundos
    };
  } catch (error: any) {
    console.error('Erro ao validar terminologia médica:', error);
    
    // Em caso de erro, retornar documento original
    return {
      documentoCorrigido: documento,
      correcoes: [],
      tempoSegundos: (Date.now() - inicio) / 1000
    };
  }
}

/**
 * System prompt para o validador médico
 */
const SYSTEM_PROMPT_VALIDADOR = `Você é um VALIDADOR MÉDICO especializado em UTI/SUS.

TAREFA: Revisar documento de round médico e corrigir QUALQUER erro de terminologia médica.

REGRAS CRÍTICAS:

1. MEDICAMENTOS:
   - Verificar grafia correta de TODOS os medicamentos
   - Corrigir nomes comerciais para genéricos (ex: Tramal → Tramadol)
   - Verificar vias de administração (IV, VO, SC, IM)
   - Verificar doses e unidades (mg, g, UI, mcg)

2. SIGLAS:
   - Verificar se todas as siglas são válidas em UTI
   - Corrigir siglas erradas ou inventadas
   - Manter siglas comuns: VM, DVA, IOT, SNE, SVD, PEEP, FiO2, PAM, FC, FR, etc

3. PROCEDIMENTOS:
   - Verificar nomenclatura correta
   - Corrigir termos leigos ou informais

4. ALUCINAÇÕES:
   - DELETAR palavras inventadas ou sem sentido
   - DELETAR neologismos médicos inexistentes
   - DELETAR termos fora do contexto de UTI

5. CONTEXTO SUS:
   - Priorizar medicamentos disponíveis no SUS
   - Usar terminologia comum em UTIs públicas
   - Evitar termos muito técnicos ou raros

IMPORTANTE:
- NÃO altere cores ([VERMELHO], [AMARELO], [VERDE], [AZUL])
- NÃO altere contadores (D0, D1, D2...)
- NÃO altere estrutura do documento
- NÃO altere nomes de pacientes
- NÃO altere números de leitos
- APENAS corrija terminologia médica

Retorne APENAS o documento corrigido, sem explicações ou comentários adicionais.`;

/**
 * Monta prompt de validação com contexto
 */
function montarPromptValidacao(documento: string): string {
  // Extrair exemplos do dicionário
  const exemplosMedicamentos = MEDICAMENTOS_SUS.slice(0, 50).join(', ');
  const exemplosSiglas = Object.keys(SIGLAS_UTI).slice(0, 30).join(', ');
  const exemplosProcedimentos = PROCEDIMENTOS_UTI.slice(0, 20).join(', ');

  return `DOCUMENTO PARA VALIDAÇÃO:

${documento}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REFERÊNCIAS (Termos Válidos):

MEDICAMENTOS COMUNS NO SUS:
${exemplosMedicamentos}

SIGLAS COMUNS EM UTI:
${exemplosSiglas}

PROCEDIMENTOS COMUNS:
${exemplosProcedimentos}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CORREÇÕES AUTOMÁTICAS:
- Meropenen → Meropenem
- Noradrenalina → Norepinefrina
- Tramal → Tramadol
- Plasil → Metoclopramida
- Novalgina → Dipirona

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Revise o documento acima e corrija APENAS erros de terminologia médica.
Retorne o documento corrigido completo.`;
}

/**
 * Detecta correções feitas comparando original e corrigido
 */
function detectarCorrecoes(original: string, corrigido: string): Correcao[] {
  const correcoes: Correcao[] = [];

  // Dividir em linhas
  const linhasOriginais = original.split('\n');
  const linhasCorrigidas = corrigido.split('\n');

  // Comparar linha por linha
  for (let i = 0; i < Math.min(linhasOriginais.length, linhasCorrigidas.length); i++) {
    const linhaOriginal = linhasOriginais[i];
    const linhaCorrigida = linhasCorrigidas[i];

    if (linhaOriginal !== linhaCorrigida) {
      // Detectar palavras diferentes
      const palavrasOriginais = linhaOriginal.split(/\s+/);
      const palavrasCorrigidas = linhaCorrigida.split(/\s+/);

      for (let j = 0; j < Math.min(palavrasOriginais.length, palavrasCorrigidas.length); j++) {
        const palavraOriginal = palavrasOriginais[j].replace(/[.,;:!?()[\]{}]/g, '');
        const palavraCorrigida = palavrasCorrigidas[j].replace(/[.,;:!?()[\]{}]/g, '');

        if (palavraOriginal !== palavraCorrigida && palavraOriginal.length > 2) {
          // Classificar tipo de correção
          let tipo: Correcao['tipo'] = 'outro';

          if (MEDICAMENTOS_SUS.includes(palavraCorrigida)) {
            tipo = 'medicamento';
          } else if (palavraCorrigida in SIGLAS_UTI) {
            tipo = 'sigla';
          } else if (PROCEDIMENTOS_UTI.includes(palavraCorrigida)) {
            tipo = 'procedimento';
          } else if (!palavraCorrigida || palavraCorrigida === '') {
            tipo = 'alucinacao';
          }

          correcoes.push({
            tipo,
            original: palavraOriginal,
            corrigido: palavraCorrigida,
            linha: i + 1
          });
        }
      }
    }
  }

  return correcoes;
}

/**
 * Formata relatório de correções
 */
export function formatarRelatorioCorrecoes(correcoes: Correcao[]): string {
  if (correcoes.length === 0) {
    return '✅ Nenhuma correção necessária. Documento validado com sucesso!';
  }

  let relatorio = `📋 Correções realizadas (${correcoes.length}):\n\n`;

  const porTipo = correcoes.reduce((acc, corr) => {
    if (!acc[corr.tipo]) acc[corr.tipo] = [];
    acc[corr.tipo].push(corr);
    return acc;
  }, {} as Record<string, Correcao[]>);

  for (const [tipo, lista] of Object.entries(porTipo)) {
    relatorio += `\n${getTipoEmoji(tipo)} ${getTipoNome(tipo)} (${lista.length}):\n`;
    
    for (const corr of lista.slice(0, 5)) { // Mostrar apenas 5 por tipo
      relatorio += `  • "${corr.original}" → "${corr.corrigido}"`;
      if (corr.linha) relatorio += ` (linha ${corr.linha})`;
      relatorio += '\n';
    }

    if (lista.length > 5) {
      relatorio += `  ... e mais ${lista.length - 5} correções\n`;
    }
  }

  return relatorio;
}

function getTipoEmoji(tipo: string): string {
  switch (tipo) {
    case 'medicamento': return '💊';
    case 'sigla': return '🔤';
    case 'procedimento': return '🏥';
    case 'alucinacao': return '❌';
    default: return '📝';
  }
}

function getTipoNome(tipo: string): string {
  switch (tipo) {
    case 'medicamento': return 'Medicamentos';
    case 'sigla': return 'Siglas';
    case 'procedimento': return 'Procedimentos';
    case 'alucinacao': return 'Alucinações removidas';
    default: return 'Outros';
  }
}
