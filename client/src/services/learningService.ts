import { SavedReport, UserPreferences } from "@/types";

/**
 * Serviço de aprendizado automático que analisa feedbacks e ajusta preferências
 */

const DEFAULT_PREFERENCES: UserPreferences = {
  apiKey: "",
  autoLearn: true,
  stylePatterns: {
    preferredSections: [],
    avoidedPhrases: [],
    preferredFormat: "detalhado",
  },
  customInstructions: "",
};

/**
 * Carrega preferências do localStorage
 */
export function loadPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem("userPreferences");
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_PREFERENCES, ...parsed };
    }
  } catch (error) {
    console.error("Erro ao carregar preferências:", error);
  }
  return DEFAULT_PREFERENCES;
}

/**
 * Salva preferências no localStorage
 */
export function savePreferences(preferences: UserPreferences): void {
  try {
    localStorage.setItem("userPreferences", JSON.stringify(preferences));
  } catch (error) {
    console.error("Erro ao salvar preferências:", error);
  }
}

/**
 * Analisa feedbacks e atualiza preferências automaticamente
 */
export function learnFromFeedback(
  reports: SavedReport[],
  currentPreferences: UserPreferences
): UserPreferences {
  if (!currentPreferences.autoLearn) {
    return currentPreferences;
  }

  // Filtrar apenas relatórios com feedback positivo
  const positiveReports = reports.filter((r) => r.feedback === "positive");
  const negativeReports = reports.filter((r) => r.feedback === "negative");

  if (positiveReports.length === 0) {
    return currentPreferences;
  }

  const newPreferences = { ...currentPreferences };

  // Analisar padrões dos relatórios aprovados
  const approvedMarkdowns = positiveReports.map((r) => r.report.markdown);
  const rejectedMarkdowns = negativeReports.map((r) => r.report.markdown);

  // Identificar seções comuns em relatórios aprovados
  const commonSections = extractCommonSections(approvedMarkdowns);
  newPreferences.stylePatterns.preferredSections = commonSections;

  // Identificar frases a evitar (presentes em relatórios rejeitados)
  const phrasesToAvoid = extractCommonPhrases(rejectedMarkdowns);
  newPreferences.stylePatterns.avoidedPhrases = phrasesToAvoid;

  // Determinar formato preferido baseado na densidade de informação
  const avgLength = approvedMarkdowns.reduce((sum, md) => sum + md.length, 0) / approvedMarkdowns.length;
  if (avgLength > 2000) {
    newPreferences.stylePatterns.preferredFormat = "detalhado";
  } else if (avgLength > 1000) {
    newPreferences.stylePatterns.preferredFormat = "moderado";
  } else {
    newPreferences.stylePatterns.preferredFormat = "objetivo";
  }

  return newPreferences;
}

/**
 * Extrai seções comuns de múltiplos markdowns
 */
function extractCommonSections(markdowns: string[]): string[] {
  if (markdowns.length === 0) return [];

  const sectionRegex = /^###?\s+(.+)$/gm;
  const sectionCounts = new Map<string, number>();

  markdowns.forEach((md) => {
    const sections = new Set<string>();
    let match;
    while ((match = sectionRegex.exec(md)) !== null) {
      const section = match[1].trim();
      sections.add(section);
    }
    sections.forEach((section) => {
      sectionCounts.set(section, (sectionCounts.get(section) || 0) + 1);
    });
  });

  // Retornar seções que aparecem em pelo menos 50% dos relatórios aprovados
  const threshold = markdowns.length * 0.5;
  return Array.from(sectionCounts.entries())
    .filter(([, count]) => count >= threshold)
    .map(([section]) => section)
    .slice(0, 10); // Limitar a 10 seções
}

/**
 * Extrai frases comuns de múltiplos markdowns
 */
function extractCommonPhrases(markdowns: string[]): string[] {
  if (markdowns.length === 0) return [];

  // Extrair frases curtas (3-6 palavras) que aparecem em múltiplos relatórios
  const phraseRegex = /\b(\w+(?:\s+\w+){2,5})\b/g;
  const phraseCounts = new Map<string, number>();

  markdowns.forEach((md) => {
    const phrases = new Set<string>();
    let match;
    while ((match = phraseRegex.exec(md)) !== null) {
      const phrase = match[1].toLowerCase().trim();
      if (phrase.length > 10) {
        // Ignorar frases muito curtas
        phrases.add(phrase);
      }
    }
    phrases.forEach((phrase) => {
      phraseCounts.set(phrase, (phraseCounts.get(phrase) || 0) + 1);
    });
  });

  // Retornar frases que aparecem em pelo menos 2 relatórios
  return Array.from(phraseCounts.entries())
    .filter(([, count]) => count >= 2)
    .map(([phrase]) => phrase)
    .slice(0, 20); // Limitar a 20 frases
}

/**
 * Gera instruções personalizadas baseadas nas preferências aprendidas
 */
export function generateCustomInstructions(preferences: UserPreferences): string {
  const parts: string[] = [];

  // Adicionar instruções customizadas do usuário
  if (preferences.customInstructions) {
    parts.push(preferences.customInstructions);
  }

  // Adicionar preferências de formato
  if (preferences.stylePatterns.preferredFormat === "detalhado") {
    parts.push(
      "Gere um prontuário DETALHADO com todas as informações disponíveis, incluindo contexto completo e raciocínio clínico."
    );
  } else if (preferences.stylePatterns.preferredFormat === "objetivo") {
    parts.push(
      "Gere um prontuário OBJETIVO e CONCISO, focando apenas nas informações essenciais e ações necessárias."
    );
  }

  // Adicionar seções preferidas
  if (preferences.stylePatterns.preferredSections.length > 0) {
    parts.push(
      `Certifique-se de incluir as seguintes seções: ${preferences.stylePatterns.preferredSections.join(", ")}.`
    );
  }

  // Adicionar frases a evitar
  if (preferences.stylePatterns.avoidedPhrases.length > 0) {
    parts.push(
      `Evite usar as seguintes expressões: ${preferences.stylePatterns.avoidedPhrases.slice(0, 5).join(", ")}.`
    );
  }

  return parts.join("\n\n");
}

/**
 * Seleciona automaticamente o melhor contexto baseado em aprendizado
 */
export function selectBestContext(
  reports: SavedReport[],
  currentDate: string
): SavedReport | null {
  if (reports.length === 0) return null;

  // Priorizar relatórios com feedback positivo
  const positiveReports = reports.filter((r) => r.feedback === "positive");
  const reportsToConsider = positiveReports.length > 0 ? positiveReports : reports;

  // Encontrar o relatório mais recente
  const sorted = [...reportsToConsider].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Se houver um relatório do dia anterior, usar como contexto
  const yesterday = new Date(currentDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const yesterdayReport = sorted.find((r) => r.dateReference === yesterdayStr);
  if (yesterdayReport) {
    return yesterdayReport;
  }

  // Caso contrário, usar o mais recente
  return sorted[0] || null;
}
