import DocxUploaderGemini from "@/components/DocxUploaderGemini";
import { Button } from "@/components/ui/button";
import { APP_TITLE } from "@/const";
import { useTheme } from "@/contexts/ThemeContext";
import { processarRoundComGemini } from "@/services/geminiRoundProcessor";
import { FileText, Download, Moon, Sun, History } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface DocumentoHistorico {
  id: string;
  filename: string;
  data: string;
  criadoEm: number;
  blob: Blob;
}

export default function RoundGemini() {
  const { theme, toggleTheme } = useTheme();
  const [isProcessing, setIsProcessing] = useState(false);
  const [docResult, setDocResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [historico, setHistorico] = useState<DocumentoHistorico[]>([]);

  // Carregar histórico do localStorage
  useEffect(() => {
    const stored = localStorage.getItem("round_historico");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setHistorico(parsed.sort((a: DocumentoHistorico, b: DocumentoHistorico) => b.criadoEm - a.criadoEm));
      } catch (e) {
        console.error("Erro ao carregar histórico:", e);
      }
    }
  }, []);

  // Salvar no histórico
  const salvarNoHistorico = (blob: Blob, filename: string) => {
    const dataFormatada = new Date().toLocaleDateString('pt-BR');
    const novoItem: DocumentoHistorico = {
      id: Date.now().toString(),
      filename,
      data: dataFormatada,
      criadoEm: Date.now(),
      blob,
    };

    const novoHistorico = [novoItem, ...historico].slice(0, 50); // Manter últimos 50
    setHistorico(novoHistorico);
    
    // Salvar no localStorage (sem o blob por limitação de tamanho)
    const historicoParaSalvar = novoHistorico.map(({ blob, ...rest }) => rest);
    localStorage.setItem("round_historico", JSON.stringify(historicoParaSalvar));
  };

  // Processar documentos
  const handleFilesSelect = async (documentoAnterior: File, transcricao: File, apiKey: string) => {
    setIsProcessing(true);
    try {
      toast.info("Processando com Gemini AI...");

      const result = await processarRoundComGemini({
        documentoAnterior,
        transcricao,
        dataAtual: new Date(),
        apiKey,
      });

      if (result.success && result.blob && result.filename) {
        setDocResult({ blob: result.blob, filename: result.filename });
        salvarNoHistorico(result.blob, result.filename);
        toast.success("Documento gerado com sucesso!");
      } else {
        toast.error(result.error || "Erro ao processar documentos");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao processar documentos");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Baixar documento
  const handleDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Download iniciado!");
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {APP_TITLE} - Gemini Edition
          </h1>
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container max-w-6xl mx-auto p-4 md:p-6 space-y-6">
          {/* Banner Informativo */}
          <div className="rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 p-4">
            <h2 className="text-lg font-semibold mb-2">🚀 Processamento 100% Gratuito com Gemini AI</h2>
            <p className="text-sm text-muted-foreground">
              Use sua API Key gratuita do Google Gemini para processar quantos rounds quiser, sem custos!
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Painel de Upload */}
            <div>
              <DocxUploaderGemini
                onFilesSelect={handleFilesSelect}
                isProcessing={isProcessing}
              />
            </div>

            {/* Painel de Resultado */}
            <div className="space-y-4">
              {docResult && (
                <div className="rounded-lg border bg-card p-6 space-y-4">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <FileText className="h-5 w-5" />
                    <h3 className="font-semibold">Documento Gerado!</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{docResult.filename}</p>
                  <Button
                    onClick={() => handleDownload(docResult.blob, docResult.filename)}
                    className="w-full"
                    size="lg"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Baixar Documento
                  </Button>
                </div>
              )}

              {/* Histórico */}
              {historico.length > 0 && (
                <div className="rounded-lg border bg-card p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    <h3 className="font-semibold">Histórico Recente</h3>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {historico.slice(0, 10).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.filename}</p>
                          <p className="text-xs text-muted-foreground">{item.data}</p>
                        </div>
                        {item.blob && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(item.blob, item.filename)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Instruções */}
          <div className="rounded-lg border bg-muted/50 p-6 space-y-4">
            <h3 className="font-semibold">📚 Como Usar</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Obtenha sua API Key gratuita do Gemini em: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">aistudio.google.com/apikey</a></li>
              <li>Cole a API Key no campo acima (ela fica salva apenas no seu navegador)</li>
              <li>Faça upload do documento do round anterior (.docx)</li>
              <li>Faça upload da transcrição de hoje (.docx ou .txt)</li>
              <li>Clique em "Gerar Round de Hoje"</li>
              <li>Aguarde alguns segundos e baixe o documento pronto!</li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
}
