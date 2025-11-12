import FeedbackButtons from "@/components/FeedbackButtons";
import HistoryPanel from "@/components/HistoryPanel";
import InputForm from "@/components/InputForm";
import OutputDisplay from "@/components/OutputDisplay";
import SettingsDialog from "@/components/SettingsDialog";
import { Button } from "@/components/ui/button";
import { APP_TITLE } from "@/const";
import { useTheme } from "@/contexts/ThemeContext";
import { generateClinicalReport } from "@/services/geminiService";
import {
  generateCustomInstructions,
  learnFromFeedback,
  loadPreferences,
  savePreferences,
  selectBestContext,
} from "@/services/learningService";
import { parseWhatsAppZip } from "@/services/whatsappParser";
import { AIResponse, PeriodFilter, SavedReport, TimelineMessage, UserPreferences } from "@/types";
import { Moon, Settings, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

type MobileTab = "history" | "input" | "output";

export default function Home() {
  const { theme, toggleTheme } = useTheme();

  // Estado da aplicação
  const [fullTimeline, setFullTimeline] = useState<TimelineMessage[]>([]);
  const [filteredTimeline, setFilteredTimeline] = useState<TimelineMessage[]>([]);
  const [currentFilter, setCurrentFilter] = useState<PeriodFilter>("today");
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [currentResult, setCurrentResult] = useState<AIResponse | null>(null);
  const [currentResultId, setCurrentResultId] = useState<string | null>(null);
  const [isProcessingZip, setIsProcessingZip] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [mobileTab, setMobileTab] = useState<MobileTab>("input");
  const [preferences, setPreferences] = useState<UserPreferences>(loadPreferences());
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Carregar histórico do localStorage
  useEffect(() => {
    const stored = localStorage.getItem("clinicalReports");
    if (stored) {
      try {
        setSavedReports(JSON.parse(stored));
      } catch (e) {
        console.error("Erro ao carregar histórico:", e);
      }
    }
  }, []);

  // Salvar histórico no localStorage
  const saveToLocalStorage = (reports: SavedReport[]) => {
    localStorage.setItem("clinicalReports", JSON.stringify(reports));
  };

  // Processar arquivo ZIP
  const handleFileSelect = async (file: File) => {
    setIsProcessingZip(true);
    try {
      toast.info("Processando arquivo ZIP...");
      const timeline = await parseWhatsAppZip(file);

      if (timeline.length === 0) {
        toast.warning("Nenhuma mensagem encontrada no arquivo");
        return;
      }

      setFullTimeline(timeline);
      toast.success(`Conversa importada com sucesso! ${timeline.length} mensagens encontradas.`);

      // Auto-selecionar melhor contexto se aprendizado estiver ativo
      if (preferences.autoLearn && savedReports.length > 0) {
        const today = new Date().toISOString().split("T")[0];
        const bestContext = selectBestContext(savedReports, today);
        if (bestContext) {
          setSelectedContextId(bestContext.id);
          toast.info("Contexto do dia anterior selecionado automaticamente");
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao processar arquivo ZIP");
      console.error(error);
    } finally {
      setIsProcessingZip(false);
    }
  };

  // Aplicar filtro de período
  useEffect(() => {
    if (fullTimeline.length === 0) return;

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    let filtered: TimelineMessage[];
    switch (currentFilter) {
      case "today":
        filtered = fullTimeline.filter((msg) => msg.fullDate === today);
        break;
      case "todayAndYesterday":
        filtered = fullTimeline.filter(
          (msg) => msg.fullDate === today || msg.fullDate === yesterday
        );
        break;
      case "all":
        filtered = fullTimeline;
        break;
      default:
        filtered = fullTimeline;
    }

    setFilteredTimeline(filtered);
  }, [currentFilter, fullTimeline]);

  // Gerar prontuário
  const handleGenerate = async () => {
    if (!preferences.apiKey) {
      toast.error("Configure sua API Key do Gemini nas configurações");
      setSettingsOpen(true);
      return;
    }

    setIsGenerating(true);
    try {
      toast.info("Gerando prontuário com IA...");

      // Obter contexto anterior se selecionado
      let previousContext: string | undefined;
      if (selectedContextId) {
        const contextReport = savedReports.find((r) => r.id === selectedContextId);
        if (contextReport) {
          previousContext = contextReport.report.markdown;
        }
      }

      // Gerar instruções personalizadas baseadas em aprendizado
      const customInstructions = generateCustomInstructions(preferences);

      // Chamar API do Gemini
      const result = await generateClinicalReport(
        preferences.apiKey,
        filteredTimeline,
        previousContext,
        additionalInstructions,
        customInstructions
      );

      setCurrentResult(result);
      setCurrentResultId(Date.now().toString());
      setMobileTab("output");
      toast.success("Prontuário gerado com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao gerar prontuário");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Dar feedback sobre o resultado atual
  const handleFeedback = (feedback: "positive" | "negative") => {
    if (!currentResult || !currentResultId) return;

    // Se já está salvo, atualizar o feedback
    const existingIndex = savedReports.findIndex((r) => r.id === currentResultId);
    if (existingIndex >= 0) {
      const updated = [...savedReports];
      updated[existingIndex].feedback = feedback;
      setSavedReports(updated);
      saveToLocalStorage(updated);

      // Aprender com o feedback
      if (preferences.autoLearn) {
        const newPreferences = learnFromFeedback(updated, preferences);
        setPreferences(newPreferences);
        savePreferences(newPreferences);
        toast.success(
          feedback === "positive"
            ? "Obrigado! A IA aprendeu com este prontuário ✓"
            : "Obrigado pelo feedback. A IA evitará este estilo."
        );
      } else {
        toast.success("Feedback registrado!");
      }
    } else {
      // Salvar automaticamente com o feedback
      const newReport: SavedReport = {
        id: currentResultId,
        timestamp: new Date().toISOString(),
        dateReference: currentResult.json.data_referencia,
        report: currentResult,
        filterUsed: currentFilter,
        feedback,
      };

      const updated = [newReport, ...savedReports];
      setSavedReports(updated);
      saveToLocalStorage(updated);

      // Aprender com o feedback
      if (preferences.autoLearn) {
        const newPreferences = learnFromFeedback(updated, preferences);
        setPreferences(newPreferences);
        savePreferences(newPreferences);
        toast.success(
          feedback === "positive"
            ? "Salvo e aprendido! A IA usará este estilo ✓"
            : "Salvo com feedback negativo. A IA evitará este estilo."
        );
      } else {
        toast.success("Prontuário salvo com feedback!");
      }
    }
  };

  // Obter feedback do resultado atual
  const getCurrentFeedback = (): "positive" | "negative" | null | undefined => {
    if (!currentResultId) return undefined;
    const report = savedReports.find((r) => r.id === currentResultId);
    return report?.feedback;
  };

  // Salvar prontuário no histórico
  const handleSave = () => {
    if (!currentResult) return;

    const id = currentResultId || Date.now().toString();

    // Verificar se já está salvo
    const existingIndex = savedReports.findIndex((r) => r.id === id);
    if (existingIndex >= 0) {
      toast.info("Este prontuário já está salvo no histórico");
      return;
    }

    const newReport: SavedReport = {
      id,
      timestamp: new Date().toISOString(),
      dateReference: currentResult.json.data_referencia,
      report: currentResult,
      filterUsed: currentFilter,
    };

    const updated = [newReport, ...savedReports];
    setSavedReports(updated);
    saveToLocalStorage(updated);
    setCurrentResultId(id);
    toast.success("Prontuário salvo no histórico!");
  };

  // Deletar prontuário do histórico
  const handleDeleteReport = (id: string) => {
    const updated = savedReports.filter((r) => r.id !== id);
    setSavedReports(updated);
    saveToLocalStorage(updated);
    if (selectedContextId === id) {
      setSelectedContextId(null);
    }
    if (currentResultId === id) {
      setCurrentResultId(null);
    }
    toast.success("Prontuário removido do histórico");
  };

  // Exportar para PDF
  const handleExportPDF = async () => {
    if (!currentResult) return;

    try {
      toast.info("Gerando PDF...");

      const element = document.getElementById("markdown-content");
      if (!element) {
        throw new Error("Elemento de conteúdo não encontrado");
      }

      // Capturar o elemento como imagem
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      // Criar PDF
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `Prontuario_${currentResult.json.data_referencia}.pdf`;
      pdf.save(fileName);
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      toast.error("Erro ao exportar PDF");
      console.error(error);
    }
  };

  // Salvar preferências
  const handleSavePreferences = (newPreferences: UserPreferences) => {
    setPreferences(newPreferences);
    savePreferences(newPreferences);
    toast.success("Configurações salvas!");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{APP_TITLE}</h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
              <Settings className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Layout Desktop: 3 colunas */}
      <div className="hidden md:grid md:grid-cols-3 flex-1 overflow-hidden">
        <div className="border-r border-border bg-card">
          <HistoryPanel
            savedReports={savedReports}
            selectedContextId={selectedContextId}
            onSelectContext={setSelectedContextId}
            onDeleteReport={handleDeleteReport}
          />
        </div>
        <div className="border-r border-border bg-card">
          <InputForm
            currentFilter={currentFilter}
            onFilterChange={setCurrentFilter}
            additionalInstructions={additionalInstructions}
            onInstructionsChange={setAdditionalInstructions}
            onFileSelect={handleFileSelect}
            onGenerate={handleGenerate}
            isProcessingZip={isProcessingZip}
            isGenerating={isGenerating}
            hasTimeline={fullTimeline.length > 0}
            filteredTimeline={filteredTimeline}
          />
        </div>
        <div className="bg-background">
          <OutputDisplay
            result={currentResult}
            currentFeedback={getCurrentFeedback()}
            onSave={handleSave}
            onExportPDF={handleExportPDF}
            onFeedback={handleFeedback}
          />
        </div>
      </div>

      {/* Layout Mobile: Abas */}
      <div className="md:hidden flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden">
          {mobileTab === "history" && (
            <HistoryPanel
              savedReports={savedReports}
              selectedContextId={selectedContextId}
              onSelectContext={setSelectedContextId}
              onDeleteReport={handleDeleteReport}
            />
          )}
          {mobileTab === "input" && (
            <InputForm
              currentFilter={currentFilter}
              onFilterChange={setCurrentFilter}
              additionalInstructions={additionalInstructions}
              onInstructionsChange={setAdditionalInstructions}
              onFileSelect={handleFileSelect}
              onGenerate={handleGenerate}
              isProcessingZip={isProcessingZip}
              isGenerating={isGenerating}
              hasTimeline={fullTimeline.length > 0}
              filteredTimeline={filteredTimeline}
            />
          )}
          {mobileTab === "output" && (
            <OutputDisplay
              result={currentResult}
              currentFeedback={getCurrentFeedback()}
              onSave={handleSave}
              onExportPDF={handleExportPDF}
              onFeedback={handleFeedback}
            />
          )}
        </div>

        {/* Barra de navegação inferior */}
        <nav className="border-t border-border bg-card">
          <div className="grid grid-cols-3">
            <button
              onClick={() => setMobileTab("history")}
              className={`py-4 flex flex-col items-center gap-1 transition-colors ${
                mobileTab === "history"
                  ? "text-primary bg-accent"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <span className="text-xs">Histórico</span>
            </button>
            <button
              onClick={() => setMobileTab("input")}
              className={`py-4 flex flex-col items-center gap-1 transition-colors ${
                mobileTab === "input"
                  ? "text-primary bg-accent"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              <span className="text-xs">Entrada</span>
            </button>
            <button
              onClick={() => setMobileTab("output")}
              className={`py-4 flex flex-col items-center gap-1 transition-colors ${
                mobileTab === "output"
                  ? "text-primary bg-accent"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="text-xs">Resultado</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Dialog de Configurações */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        preferences={preferences}
        onSave={handleSavePreferences}
      />
    </div>
  );
}
