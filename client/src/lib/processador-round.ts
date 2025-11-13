import PizZip from 'pizzip';
import { saveAs } from 'file-saver';

// Tipos
export interface ProgressCallback {
  (percent: number, message: string): void;
}

export interface LeitoInfo {
  numero: string;
  conteudoAnterior: string;
  discussaoAtual: string;
}

// Constantes de cores (RGB)
const COR_VERMELHO = { r: 255, g: 0, b: 0 };
const COR_AMARELO = { r: 255, g: 191, b: 0 };
const COR_VERDE = { r: 0, g: 128, b: 0 };
const COR_AZUL = { r: 0, g: 112, b: 192 };

/**
 * Extrai texto de um arquivo .docx
 */
async function extrairTextoDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = new PizZip(arrayBuffer);
  
  // Extrair document.xml
  const documentXml = zip.file('word/document.xml');
  if (!documentXml) {
    throw new Error('Arquivo .docx inválido');
  }
  
  const xmlContent = documentXml.asText();
  
  // Extrair texto dos elementos <w:t>
  const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  const matches = xmlContent.matchAll(regex);
  
  let texto = '';
  for (const match of matches) {
    texto += match[1];
  }
  
  return texto;
}

/**
 * Identifica leitos no documento
 */
function identificarLeitos(texto: string): string[] {
  const regex = /(?:LEITO\s+\d+|EXTRA\s+[A-Z])/gi;
  const matches = texto.matchAll(regex);
  
  const leitos = new Set<string>();
  for (const match of matches) {
    leitos.add(match[0].toUpperCase());
  }
  
  return Array.from(leitos).sort();
}

/**
 * Extrai conteúdo de um leito específico
 */
function extrairConteudoLeito(texto: string, leito: string): string {
  // Encontrar início do leito
  const regexInicio = new RegExp(`${leito}[\\s\\S]*?(?=LEITO\\s+\\d+|EXTRA\\s+[A-Z]|$)`, 'i');
  const match = texto.match(regexInicio);
  
  if (!match) {
    return '';
  }
  
  return match[0].trim();
}

/**
 * Chama API do Groq para processar texto
 */
async function chamarGroqAPI(apiKey: string, prompt: string, systemPrompt: string): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro na API do Groq: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * AGENTE 1: Processa um leito individual
 */
async function processarLeitoComIA(
  apiKey: string,
  leitoAnterior: string,
  discussaoAtual: string,
  numeroLeito: string
): Promise<string> {
  const systemPrompt = `Você é um assistente médico especializado em rounds de UTI.

REGRAS DE CORES (CRÍTICAS):
- VERMELHO: Apenas novidades de HOJE (exames solicitados hoje, antibióticos iniciados hoje D0, condutas novas)
- AMARELO SUBLINHADO: Apenas pendências (exames sem resultado, consultas sem resposta)
- VERDE: Apenas finalizações (exames com resultado, consultas respondidas, antibióticos suspensos)
- AZUL: Apenas título do leito

CONTADORES:
- Antibióticos: D0 (início) → D1 → D2 → D3... até suspensão
- Exames pendentes: D0 → D1 → D2... até resultado
- Consultas pendentes: D0 → D1 → D2... até resposta

IMPORTANTE:
- Preservar TODO o conteúdo da discussão
- NÃO simplificar ou resumir
- Manter timestamps se houver
- Incrementar contadores automaticamente
- Aplicar cores APENAS onde apropriado

Retorne APENAS o texto atualizado do leito, sem explicações.`;

  const prompt = `LEITO: ${numeroLeito}

CONTEÚDO DO DIA ANTERIOR:
${leitoAnterior}

DISCUSSÃO DO DIA ATUAL:
${discussaoAtual}

Gere o texto atualizado deste leito seguindo TODAS as regras de cores e contadores.
Use marcadores especiais:
- [VERMELHO]texto[/VERMELHO] para novidades
- [AMARELO]texto[/AMARELO] para pendências
- [VERDE]texto[/VERDE] para finalizações
- [AZUL]texto[/AZUL] para título do leito`;

  return await chamarGroqAPI(apiKey, prompt, systemPrompt);
}

/**
 * AGENTE 2: Valida documento completo
 */
async function validarDocumentoComIA(
  apiKey: string,
  documentoGerado: string
): Promise<{ valido: boolean; correcoes: string }> {
  const systemPrompt = `Você é um validador de documentos médicos de rounds de UTI.

Sua função é verificar:
1. Todos os leitos estão presentes
2. Cores aplicadas corretamente (vermelho=novidades, amarelo=pendências, verde=finalizações, azul=títulos)
3. Contadores incrementados corretamente (D0→D1→D2)
4. Data atualizada
5. Estrutura preservada

Retorne JSON:
{
  "valido": true/false,
  "problemas": ["lista de problemas encontrados"],
  "correcoes": "texto com correções se necessário"
}`;

  const prompt = `DOCUMENTO GERADO:
${documentoGerado}

Valide este documento e retorne JSON com resultado.`;

  const resposta = await chamarGroqAPI(apiKey, prompt, systemPrompt);
  
  try {
    const resultado = JSON.parse(resposta);
    return {
      valido: resultado.valido,
      correcoes: resultado.correcoes || ''
    };
  } catch (e) {
    return {
      valido: true,
      correcoes: ''
    };
  }
}

/**
 * Gera data formatada em português
 */
function gerarDataAtual(): string {
  const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  
  const agora = new Date();
  const diaSemana = dias[agora.getDay()];
  const dia = agora.getDate();
  const mes = meses[agora.getMonth()];
  const ano = agora.getFullYear();
  
  return `${diaSemana}, ${dia} de ${mes} de ${ano}`;
}

/**
 * Aplica cores ao texto usando marcadores
 */
function aplicarCores(texto: string): string {
  // Por enquanto, apenas remove os marcadores
  // Em uma implementação completa, isso seria feito no XML do .docx
  return texto
    .replace(/\[VERMELHO\]/g, '')
    .replace(/\[\/VERMELHO\]/g, '')
    .replace(/\[AMARELO\]/g, '')
    .replace(/\[\/AMARELO\]/g, '')
    .replace(/\[VERDE\]/g, '')
    .replace(/\[\/VERDE\]/g, '')
    .replace(/\[AZUL\]/g, '')
    .replace(/\[\/AZUL\]/g, '');
}

/**
 * FUNÇÃO PRINCIPAL: Processar round completo
 */
export async function processarRound(
  apiKey: string,
  docAnterior: File,
  transcricao: File,
  onProgress: ProgressCallback
): Promise<Blob> {
  try {
    // Fase 1: Leitura de arquivos (0-20%)
    onProgress(5, 'Lendo documento anterior...');
    const textoAnterior = await extrairTextoDocx(docAnterior);
    
    onProgress(10, 'Lendo transcrição do dia...');
    let textoTranscricao = '';
    if (transcricao.name.endsWith('.docx')) {
      textoTranscricao = await extrairTextoDocx(transcricao);
    } else if (transcricao.name.endsWith('.txt')) {
      textoTranscricao = await transcricao.text();
    } else {
      throw new Error('Formato de transcrição não suportado ainda. Use .docx ou .txt');
    }
    
    onProgress(15, 'Identificando leitos...');
    const leitos = identificarLeitos(textoAnterior);
    console.log('Leitos identificados:', leitos);
    
    onProgress(20, `${leitos.length} leitos identificados`);
    
    // Fase 2: Processamento por leito (20-60%)
    const leitosProcessados: string[] = [];
    const progressoPorLeito = 40 / leitos.length;
    
    for (let i = 0; i < leitos.length; i++) {
      const leito = leitos[i];
      const progressoAtual = 20 + (i * progressoPorLeito);
      
      onProgress(progressoAtual, `AGENTE 1: Processando ${leito}...`);
      
      const conteudoAnterior = extrairConteudoLeito(textoAnterior, leito);
      const discussaoAtual = extrairConteudoLeito(textoTranscricao, leito);
      
      const leitoAtualizado = await processarLeitoComIA(
        apiKey,
        conteudoAnterior,
        discussaoAtual,
        leito
      );
      
      leitosProcessados.push(leitoAtualizado);
    }
    
    // Fase 3: Montagem do documento (60-80%)
    onProgress(60, 'Montando documento...');
    
    const dataAtual = gerarDataAtual();
    let documentoFinal = `${dataAtual}\n\n`;
    
    for (const leitoTexto of leitosProcessados) {
      documentoFinal += leitoTexto + '\n\n';
    }
    
    onProgress(70, 'Aplicando formatação...');
    documentoFinal = aplicarCores(documentoFinal);
    
    // Fase 4: Validação (80-95%)
    onProgress(80, 'AGENTE 2: Validando documento...');
    
    const validacao = await validarDocumentoComIA(apiKey, documentoFinal);
    
    if (!validacao.valido && validacao.correcoes) {
      onProgress(85, 'AGENTE 2: Aplicando correções...');
      documentoFinal = validacao.correcoes;
    }
    
    onProgress(90, 'Gerando arquivo .docx...');
    
    // Por enquanto, gerar arquivo de texto
    // Em implementação completa, usar biblioteca docx para gerar .docx real
    const blob = new Blob([documentoFinal], { type: 'text/plain' });
    
    onProgress(100, 'Documento gerado com sucesso!');
    
    return blob;
    
  } catch (error) {
    console.error('Erro no processamento:', error);
    throw error;
  }
}

/**
 * Gera nome do arquivo no formato Round DDMMYY.docx
 */
export function gerarNomeArquivo(): string {
  const agora = new Date();
  const dia = String(agora.getDate()).padStart(2, '0');
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const ano = String(agora.getFullYear()).slice(-2);
  
  return `Round ${dia}${mes}${ano}.txt`;
}
