/**
 * Gerador de Documentos .DOCX Formatados
 */

import { Document, Paragraph, TextRun, AlignmentType, HeadingLevel, convertInchesToTwip } from 'docx';
import { saveAs } from 'file-saver';

export interface DocxOptions {
  titulo?: string;
  data?: string;
  instituicao?: string;
}

export class DocxGenerator {
  /**
   * Gera documento .docx a partir de texto com marcações de cor
   * 
   * Formato esperado:
   * [VERMELHO]Texto em vermelho[/VERMELHO]
   * [AMARELO]Texto em amarelo[/AMARELO]
   * [VERDE]Texto em verde[/VERDE]
   * [AZUL]Texto em azul[/AZUL]
   * [NEGRITO]Texto em negrito[/NEGRITO]
   */
  static async gerar(
    conteudo: string,
    nomeArquivo: string,
    opcoes: DocxOptions = {}
  ): Promise<void> {
    try {
      const paragrafos = this.processarConteudo(conteudo, opcoes);

      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(1),
                right: convertInchesToTwip(1),
                bottom: convertInchesToTwip(1),
                left: convertInchesToTwip(1),
              },
            },
          },
          children: paragrafos,
        }],
      });

      // Gerar blob
      const blob = await this.gerarBlob(doc);

      // Download
      saveAs(blob, nomeArquivo);
    } catch (error: any) {
      throw new Error(`Erro ao gerar .docx: ${error.message}`);
    }
  }

  private static async gerarBlob(doc: Document): Promise<Blob> {
    // @ts-ignore
    const { Packer } = await import('docx');
    const buffer = await Packer.toBlob(doc);
    return buffer;
  }

  private static processarConteudo(conteudo: string, opcoes: DocxOptions): Paragraph[] {
    const paragrafos: Paragraph[] = [];

    // Adicionar cabeçalho se fornecido
    if (opcoes.titulo) {
      paragrafos.push(
        new Paragraph({
          text: opcoes.titulo,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        })
      );
    }

    if (opcoes.instituicao) {
      paragrafos.push(
        new Paragraph({
          text: opcoes.instituicao,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        })
      );
    }

    if (opcoes.data) {
      paragrafos.push(
        new Paragraph({
          text: opcoes.data,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        })
      );
    }

    // Processar conteúdo linha por linha
    const linhas = conteudo.split('\n');

    for (const linha of linhas) {
      if (!linha.trim()) {
        // Linha vazia
        paragrafos.push(new Paragraph({ text: '' }));
        continue;
      }

      // Verificar se é título (começa com #)
      if (linha.startsWith('# ')) {
        paragrafos.push(
          new Paragraph({
            text: linha.replace('# ', ''),
            heading: HeadingLevel.HEADING_1,
          })
        );
        continue;
      }

      if (linha.startsWith('## ')) {
        paragrafos.push(
          new Paragraph({
            text: linha.replace('## ', ''),
            heading: HeadingLevel.HEADING_2,
          })
        );
        continue;
      }

      if (linha.startsWith('### ')) {
        paragrafos.push(
          new Paragraph({
            text: linha.replace('### ', ''),
            heading: HeadingLevel.HEADING_3,
          })
        );
        continue;
      }

      // Processar linha com marcações de cor
      const textRuns = this.processarLinha(linha);
      paragrafos.push(new Paragraph({ children: textRuns }));
    }

    return paragrafos;
  }

  private static processarLinha(linha: string): TextRun[] {
    const textRuns: TextRun[] = [];
    
    // Regex para encontrar marcações
    const regex = /\[(VERMELHO|AMARELO|VERDE|AZUL|NEGRITO)\](.*?)\[\/\1\]/g;
    
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(linha)) !== null) {
      // Texto antes da marcação
      if (match.index > lastIndex) {
        const textoAntes = linha.substring(lastIndex, match.index);
        if (textoAntes) {
          textRuns.push(new TextRun({ text: textoAntes }));
        }
      }

      // Texto com marcação
      const tipo = match[1];
      const texto = match[2];

      const opcoes: any = { text: texto };

      switch (tipo) {
        case 'VERMELHO':
          opcoes.color = 'FF0000';
          opcoes.bold = true;
          break;
        case 'AMARELO':
          opcoes.color = 'FFA500';
          opcoes.bold = true;
          break;
        case 'VERDE':
          opcoes.color = '008000';
          opcoes.bold = true;
          break;
        case 'AZUL':
          opcoes.color = '0000FF';
          break;
        case 'NEGRITO':
          opcoes.bold = true;
          break;
      }

      textRuns.push(new TextRun(opcoes));

      lastIndex = regex.lastIndex;
    }

    // Texto após a última marcação
    if (lastIndex < linha.length) {
      const textoDepois = linha.substring(lastIndex);
      if (textoDepois) {
        textRuns.push(new TextRun({ text: textoDepois }));
      }
    }

    // Se não houver marcações, retornar texto normal
    if (textRuns.length === 0) {
      textRuns.push(new TextRun({ text: linha }));
    }

    return textRuns;
  }

  /**
   * Formata texto para incluir marcações de cor
   */
  static marcarCor(texto: string, cor: 'vermelho' | 'amarelo' | 'verde' | 'azul'): string {
    const corUpper = cor.toUpperCase();
    return `[${corUpper}]${texto}[/${corUpper}]`;
  }

  static marcarNegrito(texto: string): string {
    return `[NEGRITO]${texto}[/NEGRITO]`;
  }

  /**
   * Gera nome de arquivo com data
   */
  static gerarNomeArquivo(prefixo: string = 'Round'): string {
    const agora = new Date();
    const dia = String(agora.getDate()).padStart(2, '0');
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const ano = String(agora.getFullYear()).slice(-2);
    return `${prefixo}_${dia}${mes}${ano}.docx`;
  }
}

/**
 * Exemplo de uso:
 * 
 * const conteudo = `
 * # Round de Hoje
 * 
 * ## Leito 01
 * 
 * Paciente: João Silva
 * [VERMELHO]Novo antibiótico iniciado: Ceftriaxona D0[/VERMELHO]
 * [AMARELO]Aguardando resultado de cultura[/AMARELO]
 * [VERDE]Desmame de drogas vasoativas concluído[/VERDE]
 * [AZUL]Mantém dieta enteral[/AZUL]
 * 
 * ## Leito 02
 * ...
 * `;
 * 
 * await DocxGenerator.gerar(
 *   conteudo,
 *   DocxGenerator.gerarNomeArquivo('Round'),
 *   {
 *     titulo: 'Round de Hoje',
 *     instituicao: 'Hospital Sanador Caneto',
 *     data: new Date().toLocaleDateString('pt-BR', {
 *       weekday: 'long',
 *       year: 'numeric',
 *       month: 'long',
 *       day: 'numeric'
 *     })
 *   }
 * );
 */
