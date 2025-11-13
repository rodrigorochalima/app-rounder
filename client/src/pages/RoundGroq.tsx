import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_TITLE } from "@/const";
import { useTheme } from "@/contexts/ThemeContext";
import { processarRoundComGroq } from "@/services/groqRoundProcessor";
import { FileText, Download, Moon, Sun, History, Upload, Loader2, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface DocumentoHistorico {
  id: string;
  filename: string;
  data: string;
  criadoEm: number;
}

export default function RoundGroq() {
  const { theme, toggleTheme } = useTheme();
  const [isProcessing, setIsProcessing] = useState(false);
  const [docResult, setDocResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [historico, setHistorico] = useState<DocumentoHistorico[]>([]);
  
  // Form state
  const [apiKey, setApiKey] = useState<string>("");
  const [documentoAnterior, setDocumentoAnterior] = useState<File | null>(null);
  const [transcricao, setTranscricao] = useState<File | null>(null);

  // Carregar API Key e histórico do localStorage
  useEffect(() => {
    const storedKey = localStorage.getItem("groq_api_key");
    if (storedKey) setApiKey(storedKey);

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

  // Salvar API Key no localStorage
  const salvarApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem("groq_api_key", key);
  };

  // Salvar no histórico
  const salvarNoHistorico = (filename: string) => {
    const dataFormatada = new Date().toLocaleDateString('pt-BR');
    const novoItem: DocumentoHistorico = {
      id: Date.now().toString(),
      filename,
      data: dataFormatada,
      criadoEm: Date.now(),
    };

    const novoHistorico = [novoItem, ...historico].slice(0, 50);
    setHistorico(novoHistorico);
    localStorage.setItem("round_historico", JSON.stringify(novoHistorico));
  };

  // Processar documentos
  const handleProcessar = async () => {
    if (!apiKey || !documentoAnterior || !transcricao) {
      toast.error("Preencha todos os campos");
      return;
    }

    setIsProcessing(true);
    try {
      toast.info("Processando com Groq AI...");

      const result = await processarRoundComGroq({
        documentoAnterior,
        transcricao,
        dataAtual: new Date(),
        apiKey,
      });

      if (result.success && result.blob && result.filename) {
        setDocResult({ blob: result.blob, filename: result.filename });
        salvarNoHistorico(result.filename);
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

  const canProcess = apiKey && documentoAnterior && transcricao && !isProcessing;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header Mobile-Friendly */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          <h1 className="text-sm md:text-lg font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 md:h-5 md:w-5" />
            <span className="hidden sm:inline">{APP_TITLE}</span>
            <span className="sm:hidden">Round UTI</span>
          </h1>
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container max-w-2xl mx-auto p-4 space-y-4">
          {/* Banner */}
          <Card className="border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Zap className="h-6 w-6 text-blue-500 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="font-semibold mb-1">Groq AI - Ultra Rápido & Gratuito</h2>
                  <p className="text-sm text-muted-foreground">
                    Processamento com IA avançada, análise contextual e resolução automática de conflitos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>Gerar Round de Hoje</CardTitle>
              <CardDescription>
                Faça upload dos arquivos e gere o documento atualizado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* API Key */}
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key do Groq (Gratuita)</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Cole sua API Key aqui"
                  value={apiKey}
                  onChange={(e) => salvarApiKey(e.target.value)}
                  disabled={isProcessing}
                />
                <p className="text-xs text-muted-foreground">
                  Obtenha gratuitamente em:{" "}
                  <a
                    href="https://console.groq.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    console.groq.com
                  </a>
                </p>
              </div>

              {/* Documento Anterior */}
              <div className="space-y-2">
                <Label htmlFor="docAnterior">Documento do Round Anterior</Label>
                <Input
                  id="docAnterior"
                  type="file"
                  accept=".docx"
                  onChange={(e) => setDocumentoAnterior(e.target.files?.[0] || null)}
                  disabled={isProcessing}
                />
                {documentoAnterior && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    ✓ {documentoAnterior.name}
                  </p>
                )}
              </div>

              {/* Transcrição */}
              <div className="space-y-2">
                <Label htmlFor="transcricao">Transcrição de Hoje</Label>
                <Input
                  id="transcricao"
                  type="file"
                  accept=".docx,.txt"
                  onChange={(e) => setTranscricao(e.target.files?.[0] || null)}
                  disabled={isProcessing}
                />
                {transcricao && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    ✓ {transcricao.name}
                  </p>
                )}
              </div>

              {/* Botão Processar */}
              <Button
                onClick={handleProcessar}
                disabled={!canProcess}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando com Groq AI...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Gerar Round de Hoje
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Resultado */}
          {docResult && (
            <Card className="border-green-500/20 bg-green-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <FileText className="h-5 w-5" />
                  Documento Gerado!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm font-medium">{docResult.filename}</p>
                <Button
                  onClick={() => handleDownload(docResult.blob, docResult.filename)}
                  className="w-full"
                  size="lg"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Baixar Documento
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Histórico */}
          {historico.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-5 w-5" />
                  Histórico Recente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {historico.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.filename}</p>
                        <p className="text-xs text-muted-foreground">{item.data}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Informações */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Como Funciona</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>100% gratuito usando Groq API</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>IA avançada analisa contexto e resolve conflitos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Aplica cores automaticamente (Vermelho/Amarelo/Verde)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Incrementa contadores de antibióticos e exames</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Preserva layout original 100%</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Funciona perfeitamente no celular</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
