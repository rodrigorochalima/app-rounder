import DocxUploader from "@/components/DocxUploader";
import HistoryPanel from "@/components/HistoryPanel";
import InputForm from "@/components/InputForm";
import OutputDisplay from "@/components/OutputDisplay";
import SettingsDialog from "@/components/SettingsDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { processarRoundDocx, salvarNoHistorico, getHistorico, baixarDoHistorico } from "@/services/docxRoundProcessor";
import { AIResponse, PeriodFilter, SavedReport, TimelineMessage, UserPreferences } from "@/types";
import { FileText, MessageSquare, Moon, Settings, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

type MobileTab = "history" | "input" | "output";
type InputMode = "whatsapp" | "docx";

export default function HomeRound() {
  const { theme, toggleTheme } = useTheme();

  // Estado da aplicação WhatsApp (mantido)
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

  // Novo estado para modo de entrada
  const [inputMode, setInputMode] = useState<InputMode>("whatsapp");
  
  // Estado para processamento de documentos Word
  const [isProcessingDocx, setIsProcessingDocx] = useState(false);
  const [docxResult, setDocxResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [docxHistory, setDocxHistory] = useState<any[]>([]);

  // Carregar histórico do localStorage (WhatsApp)
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

  // Carregar histórico de documentos Word
  useEffect(() => {
    const history = getHistorico();
    setDocxHistory(history.sort((a, b) => b.criadoEm - a.criadoEm));
  }, []);

  // Salvar histórico no localStorage
  const saveToLocalStorage = (reports: SavedReport[]) => {
    localStorage.setItem("clinicalReports", JSON.stringify(reports));
  };

  // Processar arquivo ZIP do WhatsApp (mantido)
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

  // NOVO: Processar documentos Word
  const handleDocxFilesSelect = async (documentoAnterior: File, transcricao: File) => {
    setIsProcessingDocx(true);
    try {
      toast.info("Processando documentos Word...");
      
      const result = await processarRoundDocx({
        documentoAnterior,
        transcricao,
        dataAtual: new Date()
      });

      if (result.success && result.blob && result.filename) {
        setDocxResult({ blob: result.blob, filename: result.filename });
        
        // Salvar no histórico
        const dataFormatada = new Date().toLocaleDateString('pt-BR');
        salvarNoHistorico(result.blob, result.filename, dataFormatada);
        
        // Atualizar lista de histórico
        const updatedHistory = getHistorico();
        setDocxHistory(updatedHistory.sort((a, b) => b.criadoEm - a.criadoEm));
        
        toast.success("Documento gerado com sucesso!");
        setMobileTab("output");
      } else {
        toast.error(result.error || "Erro ao processar documentos");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao processar documentos");
      console.error(error);
    } finally {
      setIsProcessingDocx(false);
    }
  };

  // Baixar documento Word gerado
  const handleDownloadDocx = () => {
    if (!docxResult) return;
    
    const url = URL.createObjectURL(docxResult.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = docxResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Download iniciado!");
  };

  // Aplicar filtro de período (WhatsApp)
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

  // Gerar prontuário com IA (WhatsApp - mantido)
  const handleGenerate = async () => {
    if (!preferences.apiKey) {
      toast.error("Configure sua API Key do Gemini nas configurações");
      setSettingsOpen(true);
      return;
    }

    setIsGenerating(true);
    try {
      toast.info("Gerando prontuário com IA...");

      let previousContext: string | undefined;
      if (selectedContextId) {
        const contextReport = savedReports.find((r) => r.id === selectedContextId);
        if (contextReport) {
          previousContext = contextReport.report.markdown;
        }
      }

      const customInstructions = generateCustomInstructions(preferences);

      const result = await generateClinicalReport(
        preferences.apiKey,
        filteredTimeline,
        previousContext,
        additionalInstructions,
        customInstructions
      );

      setCurrentResult(result);
      setCurrentResultId(null);
      toast.success("Prontuário gerado com sucesso!");
      setMobileTab("output");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao gerar prontuário");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          <h1 className="text-lg font-semibold">{APP_TITLE}</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full md:grid md:grid-cols-[300px_1fr_400px] md:gap-4 p-4">
          {/* Painel de Histórico */}
          <div className="hidden md:block h-full overflow-auto">
            <Tabs defaultValue="whatsapp" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
                <TabsTrigger value="docx">Documentos</TabsTrigger>
              </TabsList>
              <TabsContent value="whatsapp">
                <HistoryPanel
                  savedReports={savedReports}
                  selectedContextId={selectedContextId}
                  onSelectContext={setSelectedContextId}
                  onLoadReport={(report) => {
                    setCurrentResult(report.report);
                    setCurrentResultId(report.id);
                    setMobileTab("output");
                  }}
                />
              </TabsContent>
              <TabsContent value="docx">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Histórico de Rounds</h3>
                  {docxHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum documento gerado ainda</p>
                  ) : (
                    <div className="space-y-2">
                      {docxHistory.map((item) => (
                        <Button
                          key={item.id}
                          variant="outline"
                          className="w-full justify-start text-left"
                          onClick={() => baixarDoHistorico(item.id)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          <div className="flex-1 truncate">
                            <div className="font-medium">{item.filename}</div>
                            <div className="text-xs text-muted-foreground">{item.data}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Painel de Entrada */}
          <div className="hidden md:block h-full overflow-auto">
            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as InputMode)} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="whatsapp">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  WhatsApp
                </TabsTrigger>
                <TabsTrigger value="docx">
                  <FileText className="mr-2 h-4 w-4" />
                  Documentos
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="whatsapp">
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
              </TabsContent>
              
              <TabsContent value="docx">
                <DocxUploader
                  onFilesSelect={handleDocxFilesSelect}
                  isProcessing={isProcessingDocx}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Painel de Resultado */}
          <div className="hidden md:block h-full overflow-auto">
            {docxResult ? (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Documento Gerado</h3>
                  <p className="text-sm text-muted-foreground mb-4">{docxResult.filename}</p>
                  <Button onClick={handleDownloadDocx} className="w-full">
                    Baixar Documento
                  </Button>
                </div>
              </div>
            ) : (
              <OutputDisplay
                result={currentResult}
                onSave={() => {}}
                onFeedback={() => {}}
                onExportPDF={() => {}}
              />
            )}
          </div>
        </div>
      </main>

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        preferences={preferences}
        onSave={(newPreferences) => {
          setPreferences(newPreferences);
          savePreferences(newPreferences);
          toast.success("Configurações salvas!");
        }}
      />
    </div>
  );
}
