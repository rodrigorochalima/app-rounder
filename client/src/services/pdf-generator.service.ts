import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { User } from '../types/auth.types';
import { TemplateData } from '../components/TemplateEditor/TemplateEditor';

export interface RoundData {
  date: string;
  content: string;
  previousRoundContent?: string;
}

export interface PDFGenerationOptions {
  template: TemplateData;
  roundData: RoundData;
  user: User;
  includeDoubleCheck?: boolean;
}

class PDFGeneratorService {
  /**
   * Gera PDF a partir de um template e dados do round
   */
  async generatePDF(options: PDFGenerationOptions): Promise<Blob> {
    const { template, roundData, user } = options;

    // Criar elemento HTML temporário
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '210mm'; // A4 width
    container.style.background = 'white';
    document.body.appendChild(container);

    try {
      // Aplicar template com dados
      const html = this.applyTemplateVariables(template.html, roundData, user);
      const css = template.css;

      // Injetar HTML e CSS
      container.innerHTML = `
        <style>${css}</style>
        ${html}
      `;

      // Aguardar renderização
      await new Promise(resolve => setTimeout(resolve, 500));

      // Converter HTML para canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Criar PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      // Adicionar metadados
      pdf.setProperties({
        title: `Round Médico - ${roundData.date}`,
        subject: 'Round Médico',
        author: user.fullName || 'App Rounder',
        keywords: 'round, médico, hospital',
        creator: 'App Rounder'
      });

      return pdf.output('blob');
    } finally {
      // Remover elemento temporário
      document.body.removeChild(container);
    }
  }

  /**
   * Gera PDF com dupla checagem de IA (conteúdo + visual)
   */
  async generatePDFWithDoubleCheck(options: PDFGenerationOptions): Promise<{
    pdf: Blob;
    contentCheck: CheckResult;
    visualCheck: CheckResult;
  }> {
    // Primeira checagem: Congruência de conteúdo
    const contentCheck = await this.checkContentCongruence(
      options.roundData.content,
      options.roundData.previousRoundContent
    );

    // Segunda checagem: Fidelidade visual
    const visualCheck = await this.checkVisualFidelity(options.template);

    // Gerar PDF
    const pdf = await this.generatePDF(options);

    return {
      pdf,
      contentCheck,
      visualCheck
    };
  }

  /**
   * Substitui variáveis do template com dados reais
   */
  private applyTemplateVariables(
    html: string,
    roundData: RoundData,
    user: User
  ): string {
    return html
      .replace(/\{\{logoUrl\}\}/g, user.logoUrl || '')
      .replace(/\{\{hospitalName\}\}/g, user.hospitalName || 'Hospital')
      .replace(/\{\{hospitalPhone\}\}/g, user.hospitalPhone || '')
      .replace(/\{\{fullName\}\}/g, user.fullName || '')
      .replace(/\{\{crm\}\}/g, user.crm || '')
      .replace(/\{\{crmState\}\}/g, user.crmState || '')
      .replace(/\{\{specialty\}\}/g, user.specialty || '')
      .replace(/\{\{position\}\}/g, user.position || '')
      .replace(/\{\{email\}\}/g, user.email || '')
      .replace(/\{\{personalPhone\}\}/g, user.personalPhone || '')
      .replace(/\{\{date\}\}/g, roundData.date)
      .replace(/\{\{roundContent\}\}/g, this.formatRoundContent(roundData.content));
  }

  /**
   * Formata conteúdo do round para HTML
   */
  private formatRoundContent(content: string): string {
    // Converter quebras de linha em parágrafos
    const paragraphs = content
      .split('\n\n')
      .filter(p => p.trim())
      .map(p => `<p>${p.trim()}</p>`)
      .join('');

    return paragraphs || '<p>Sem conteúdo</p>';
  }

  /**
   * Checagem de congruência de conteúdo (IA)
   * Compara round atual com anterior para detectar inconsistências
   */
  private async checkContentCongruence(
    currentContent: string,
    previousContent?: string
  ): Promise<CheckResult> {
    // TODO: Implementar chamada para IA
    // Por enquanto, retorna checagem básica
    
    if (!previousContent) {
      return {
        passed: true,
        score: 100,
        issues: [],
        suggestions: []
      };
    }

    // Checagens básicas
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Verificar se há conteúdo
    if (!currentContent || currentContent.trim().length < 50) {
      issues.push('Conteúdo muito curto ou vazio');
    }

    // Verificar mudanças drásticas de tamanho
    const sizeDiff = Math.abs(currentContent.length - previousContent.length);
    const sizeChangePercent = (sizeDiff / previousContent.length) * 100;

    if (sizeChangePercent > 80) {
      suggestions.push(`Mudança significativa no tamanho do conteúdo (${sizeChangePercent.toFixed(0)}%)`);
    }

    return {
      passed: issues.length === 0,
      score: issues.length === 0 ? 100 : 70,
      issues,
      suggestions
    };
  }

  /**
   * Checagem de fidelidade visual (IA)
   * Verifica se o documento está conforme o template
   */
  private async checkVisualFidelity(template: TemplateData): Promise<CheckResult> {
    // TODO: Implementar checagem visual com IA
    // Por enquanto, retorna checagem básica

    const issues: string[] = [];
    const suggestions: string[] = [];

    // Verificar se template tem CSS
    if (!template.css || template.css.trim().length < 100) {
      issues.push('Template sem estilização adequada');
    }

    // Verificar se template tem estrutura básica
    if (!template.html.includes('header') && !template.html.includes('footer')) {
      suggestions.push('Template sem cabeçalho ou rodapé definido');
    }

    return {
      passed: issues.length === 0,
      score: issues.length === 0 ? 100 : 80,
      issues,
      suggestions
    };
  }

  /**
   * Baixa PDF gerado
   */
  downloadPDF(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Gera nome de arquivo para o PDF
   */
  generateFilename(roundData: RoundData, user: User): string {
    const date = roundData.date.replace(/\//g, '-');
    const userName = user.fullName?.replace(/\s+/g, '_') || 'usuario';
    return `Round_${userName}_${date}.pdf`;
  }
}

export interface CheckResult {
  passed: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
}

export const pdfGeneratorService = new PDFGeneratorService();
