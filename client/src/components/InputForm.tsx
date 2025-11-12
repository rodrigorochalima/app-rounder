import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { PeriodFilter, TimelineMessage } from "@/types";
import { FileArchive, Filter, Sparkles, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Spinner from "./Spinner";

interface InputFormProps {
  currentFilter: PeriodFilter;
  onFilterChange: (filter: PeriodFilter) => void;
  additionalInstructions: string;
  onInstructionsChange: (instructions: string) => void;
  onFileSelect: (file: File) => void;
  onGenerate: () => void;
  isProcessingZip: boolean;
  isGenerating: boolean;
  hasTimeline: boolean;
  filteredTimeline: TimelineMessage[];
}

export default function InputForm({
  currentFilter,
  onFilterChange,
  additionalInstructions,
  onInstructionsChange,
  onFileSelect,
  onGenerate,
  isProcessingZip,
  isGenerating,
  hasTimeline,
  filteredTimeline,
}: InputFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith(".zip")) {
      onFileSelect(file);
    } else {
      alert("Por favor, selecione um arquivo .zip válido");
    }
  };

  // Handler para Ctrl+V (colar arquivo)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file && file.name.endsWith(".zip")) {
            e.preventDefault();
            onFileSelect(file);
            return;
          }
        }
      }

      // Tentar obter arquivo do clipboard de outra forma
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.name.endsWith(".zip") || file.type === "application/zip" || file.type === "application/x-zip-compressed") {
          e.preventDefault();
          onFileSelect(file);
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [onFileSelect]);

  // Handlers para drag & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith(".zip") || file.type === "application/zip" || file.type === "application/x-zip-compressed") {
        onFileSelect(file);
      } else {
        alert("Por favor, selecione um arquivo .zip válido");
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Entrada de Dados
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Importe a conversa e configure os parâmetros
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Importação de arquivo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileArchive className="w-4 h-4" />
              Importar Conversa
            </CardTitle>
            <CardDescription>
              Selecione o arquivo .zip exportado do WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleFileChange}
              className="hidden"
            />
            
            {/* Área de drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 transition-all ${
                isDragging
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex flex-col items-center gap-3 text-center">
                <FileArchive className={`w-12 h-12 ${
                  isDragging ? "text-primary" : "text-muted-foreground"
                }`} />
                <div>
                  <p className="text-sm font-medium mb-1">
                    {isDragging ? "Solte o arquivo aqui" : "Arraste o arquivo .zip aqui"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ou pressione <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Ctrl+V</kbd> para colar
                  </p>
                </div>
                <Button
                  onClick={handleFileClick}
                  disabled={isProcessingZip}
                  size="sm"
                  variant="outline"
                >
                  {isProcessingZip ? (
                    <Spinner size={16} text="Processando..." />
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Ou clique para selecionar
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {hasTimeline && !isProcessingZip && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-3 flex items-center gap-1">
                ✓ Conversa carregada com sucesso
              </p>
            )}
          </CardContent>
        </Card>

        {/* Filtro de período */}
        {hasTimeline && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filtro de Período
              </CardTitle>
              <CardDescription>
                Selecione quais mensagens incluir na análise
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={currentFilter} onValueChange={(v) => onFilterChange(v as PeriodFilter)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="today" id="today" />
                  <Label htmlFor="today" className="cursor-pointer">
                    Apenas Hoje
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="todayAndYesterday" id="todayAndYesterday" />
                  <Label htmlFor="todayAndYesterday" className="cursor-pointer">
                    Hoje e Ontem
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="cursor-pointer">
                    Todas as Mensagens
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-sm text-muted-foreground mt-3">
                {filteredTimeline.length} mensagem(ns) selecionada(s)
              </p>
            </CardContent>
          </Card>
        )}

        {/* Instruções adicionais */}
        {hasTimeline && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Instruções Adicionais (Opcional)</CardTitle>
              <CardDescription>
                Forneça orientações específicas para a IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Ex: Focar em antibióticos, destacar exames pendentes, etc."
                value={additionalInstructions}
                onChange={(e) => onInstructionsChange(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </CardContent>
          </Card>
        )}

        {/* Botão de geração */}
        {hasTimeline && (
          <Button
            onClick={onGenerate}
            disabled={isGenerating || filteredTimeline.length === 0}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <Spinner size={16} text="Gerando prontuário..." />
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar Prontuário
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
