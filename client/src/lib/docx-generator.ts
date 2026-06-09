/**
 * Gerador de Documentos .DOCX Formatados
 * Suporta cabeçalho dinâmico com logomarca da instituição e rodapé com dados do médico.
 */

import {
  Document, Paragraph, TextRun, AlignmentType, HeadingLevel,
  convertInchesToTwip, ImageRun, BorderStyle, Table, TableRow, TableCell, WidthType
} from 'docx';
import { saveAs } from 'file-saver';

export interface DocxOptions {
  titulo?: string;
  data?: string;
  // Instituição
  instituicao?: string;
  institutionLogoBase64?: string | null;
  institutionHeaderColor?: string;
  institutionHeaderTextColor?: string;
  institutionCity?: string;
  institutionState?: string;
  // Médico
  doctorName?: string;
  doctorCrm?: string;
  doctorCrmState?: string;
  doctorSpecialty?: string;
  doctorRqe?: string;
  doctorPhone?: string;
  doctorEmail?: string;
  doctorSignatureBase64?: string | null;
  doctorFooterText?: string;
  showDoctorCrm?: boolean;
  showDoctorSpecialty?: boolean;
  showDoctorPhone?: boolean;
  showDoctorEmail?: boolean;
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
      const paragrafos = await this.processarConteudo(conteudo, opcoes);

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

      const blob = await this.gerarBlob(doc);
      saveAs(blob, nomeArquivo);
    } catch (error: any) {
      throw new Error(`Erro ao gerar .docx: ${error.message}`);
    }
  }

  private static async gerarBlob(doc: Document): Promise<Blob> {
    // @ts-ignore
    const { Packer } = await import('docx');
    return await Packer.toBlob(doc);
  }

  /**
   * Converte base64 de imagem para Uint8Array para uso no docx
   */
  private static base64ToUint8Array(base64: string): Uint8Array {
    const b64 = base64.includes(',') ? base64.split(',')[1] : base64;
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  /**
   * Obtém dimensões de uma imagem base64 (retorna width/height em pixels)
   */
  private static async getImageDimensions(base64: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => resolve({ width: 200, height: 80 });
      img.src = base64;
    });
  }

  private static async processarConteudo(conteudo: string, opcoes: DocxOptions): Promise<Paragraph[]> {
    const paragrafos: Paragraph[] = [];

    // ── Cabeçalho da Instituição ──────────────────────────────────────────────
    if (opcoes.institutionLogoBase64) {
      try {
        const dims = await this.getImageDimensions(opcoes.institutionLogoBase64);
        // Redimensionar para no máximo 180x72 pts (mantendo proporção)
        const maxW = 180; const maxH = 72;
        let w = dims.width; let h = dims.height;
        if (w > maxW) { h = Math.round((h * maxW) / w); w = maxW; }
        if (h > maxH) { w = Math.round((w * maxH) / h); h = maxH; }

        const imgData = this.base64ToUint8Array(opcoes.institutionLogoBase64);
        const isJpeg = opcoes.institutionLogoBase64.includes('image/jpeg') ||
                       opcoes.institutionLogoBase64.includes('image/jpg');

        paragrafos.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new ImageRun({
                data: imgData,
                transformation: { width: w, height: h },
                type: isJpeg ? 'jpg' : 'png',
              } as any),
            ],
          })
        );
      } catch (_) {
        // Fallback: só texto
      }
    }

    if (opcoes.instituicao) {
      paragrafos.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: opcoes.instituicao,
              bold: true,
              size: 28,
              color: (opcoes.institutionHeaderColor || '#1e3a5f').replace('#', ''),
            }),
          ],
        })
      );
    }

    if (opcoes.institutionCity || opcoes.institutionState) {
      const local = [opcoes.institutionCity, opcoes.institutionState].filter(Boolean).join(' – ');
      paragrafos.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: local, size: 20, color: '666666' })],
        })
      );
    }

    // ── Título e Data ─────────────────────────────────────────────────────────
    if (opcoes.titulo) {
      paragrafos.push(
        new Paragraph({
          text: opcoes.titulo,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        })
      );
    }

    if (opcoes.data) {
      paragrafos.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: opcoes.data, italics: true, size: 20, color: '555555' })],
        })
      );
    }

    // Linha separadora
    if (opcoes.titulo || opcoes.instituicao) {
      paragrafos.push(
        new Paragraph({
          spacing: { after: 200 },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, color: (opcoes.institutionHeaderColor || '1e3a5f').replace('#', '') },
          },
          children: [],
        })
      );
    }

    // ── Conteúdo principal ────────────────────────────────────────────────────
    const linhas = conteudo.split('\n');
    for (const linha of linhas) {
      if (!linha.trim()) {
        paragrafos.push(new Paragraph({ text: '' }));
        continue;
      }
      if (linha.startsWith('# ')) {
        paragrafos.push(new Paragraph({ text: linha.replace('# ', ''), heading: HeadingLevel.HEADING_1 }));
        continue;
      }
      if (linha.startsWith('## ')) {
        paragrafos.push(new Paragraph({ text: linha.replace('## ', ''), heading: HeadingLevel.HEADING_2 }));
        continue;
      }
      if (linha.startsWith('### ')) {
        paragrafos.push(new Paragraph({ text: linha.replace('### ', ''), heading: HeadingLevel.HEADING_3 }));
        continue;
      }
      const textRuns = this.processarLinha(linha);
      paragrafos.push(new Paragraph({ children: textRuns }));
    }

    // ── Rodapé do Médico ──────────────────────────────────────────────────────
    const temDadosMedico = opcoes.doctorName || opcoes.doctorCrm;
    if (temDadosMedico) {
      // Linha separadora antes do rodapé
      paragrafos.push(
        new Paragraph({
          spacing: { before: 400, after: 200 },
          border: {
            top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
          },
          children: [],
        })
      );

      // Assinatura digital (imagem)
      if (opcoes.doctorSignatureBase64) {
        try {
          const dims = await this.getImageDimensions(opcoes.doctorSignatureBase64);
          const maxW = 200; const maxH = 80;
          let w = dims.width; let h = dims.height;
          if (w > maxW) { h = Math.round((h * maxW) / w); w = maxW; }
          if (h > maxH) { w = Math.round((w * maxH) / h); h = maxH; }
          const imgData = this.base64ToUint8Array(opcoes.doctorSignatureBase64);
          paragrafos.push(
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { after: 80 },
              children: [
                new ImageRun({
                  data: imgData,
                  transformation: { width: w, height: h },
                  type: 'png',
                } as any),
              ],
            })
          );
        } catch (_) {}
      }

      // Nome do médico
      if (opcoes.doctorName) {
        paragrafos.push(
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: `Dr(a). ${opcoes.doctorName}`, bold: true, size: 22 }),
            ],
          })
        );
      }

      // Linha com CRM, especialidade, RQE
      const infoLinha1: string[] = [];
      if (opcoes.showDoctorCrm !== false && opcoes.doctorCrm) {
        infoLinha1.push(`CRM-${opcoes.doctorCrmState || 'XX'} ${opcoes.doctorCrm}`);
      }
      if (opcoes.showDoctorSpecialty !== false && opcoes.doctorSpecialty) {
        infoLinha1.push(opcoes.doctorSpecialty);
      }
      if (opcoes.doctorRqe) {
        infoLinha1.push(`RQE ${opcoes.doctorRqe}`);
      }
      if (infoLinha1.length > 0) {
        paragrafos.push(
          new Paragraph({
            spacing: { after: 40 },
            children: [new TextRun({ text: infoLinha1.join(' | '), size: 18, color: '444444' })],
          })
        );
      }

      // Linha com telefone e e-mail
      const infoLinha2: string[] = [];
      if (opcoes.showDoctorPhone && opcoes.doctorPhone) infoLinha2.push(opcoes.doctorPhone);
      if (opcoes.showDoctorEmail && opcoes.doctorEmail) infoLinha2.push(opcoes.doctorEmail);
      if (infoLinha2.length > 0) {
        paragrafos.push(
          new Paragraph({
            spacing: { after: 40 },
            children: [new TextRun({ text: infoLinha2.join(' | '), size: 18, color: '444444' })],
          })
        );
      }

      // Texto adicional do rodapé
      if (opcoes.doctorFooterText) {
        paragrafos.push(
          new Paragraph({
            spacing: { after: 40 },
            children: [new TextRun({ text: opcoes.doctorFooterText, size: 18, italics: true, color: '666666' })],
          })
        );
      }
    }

    return paragrafos;
  }

  private static processarLinha(linha: string): TextRun[] {
    const textRuns: TextRun[] = [];
    const regex = /\[(VERMELHO|AMARELO|VERDE|AZUL|NEGRITO)\](.*?)\[\/\1\]/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(linha)) !== null) {
      if (match.index > lastIndex) {
        const textoAntes = linha.substring(lastIndex, match.index);
        if (textoAntes) textRuns.push(new TextRun({ text: textoAntes }));
      }
      const tipo = match[1];
      const texto = match[2];
      const opcoes: any = { text: texto };
      switch (tipo) {
        case 'VERMELHO': opcoes.color = 'FF0000'; opcoes.bold = true; break;
        case 'AMARELO':  opcoes.color = 'FFA500'; opcoes.bold = true; break;
        case 'VERDE':    opcoes.color = '008000'; opcoes.bold = true; break;
        case 'AZUL':     opcoes.color = '0000FF'; break;
        case 'NEGRITO':  opcoes.bold = true; break;
      }
      textRuns.push(new TextRun(opcoes));
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < linha.length) {
      const textoDepois = linha.substring(lastIndex);
      if (textoDepois) textRuns.push(new TextRun({ text: textoDepois }));
    }

    if (textRuns.length === 0) textRuns.push(new TextRun({ text: linha }));
    return textRuns;
  }

  static marcarCor(texto: string, cor: 'vermelho' | 'amarelo' | 'verde' | 'azul'): string {
    return `[${cor.toUpperCase()}]${texto}[/${cor.toUpperCase()}]`;
  }

  static marcarNegrito(texto: string): string {
    return `[NEGRITO]${texto}[/NEGRITO]`;
  }

  static gerarNomeArquivo(prefixo: string = 'Round'): string {
    const agora = new Date();
    const dia = String(agora.getDate()).padStart(2, '0');
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const ano = String(agora.getFullYear()).slice(-2);
    return `${prefixo}_${dia}${mes}${ano}.docx`;
  }
}
