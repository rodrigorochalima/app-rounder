import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Upload, Loader2 } from "lucide-react";
import { useState } from "react";

interface DocxUploaderGeminiProps {
  onFilesSelect: (documentoAnterior: File, transcricao: File, apiKey: string) => Promise<void>;
  isProcessing: boolean;
}

export default function DocxUploaderGemini({ onFilesSelect, isProcessing }: DocxUploaderGeminiProps) {
  const [documentoAnterior, setDocumentoAnterior] = useState<File | null>(null);
  const [transcricao, setTranscricao] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState<string>("");

  const handleSubmit = async () => {
    if (!documentoAnterior || !transcricao || !apiKey) {
      alert("Por favor, selecione ambos os arquivos e insira sua API Key do Gemini");
      return;
    }

    await onFilesSelect(documentoAnterior, transcricao, apiKey);
  };

  const canProcess = documentoAnterior && transcricao && apiKey && !isProcessing;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Processar Documentos Word
        </CardTitle>
        <CardDescription>
          Faça upload do documento anterior e da transcrição de hoje para gerar o novo round
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* API Key do Gemini */}
        <div className="space-y-2">
          <Label htmlFor="apiKey">API Key do Google Gemini (Gratuita)</Label>
          <Input
            id="apiKey"
            type="password"
            placeholder="Cole sua API Key aqui"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={isProcessing}
          />
          <p className="text-xs text-muted-foreground">
            Obtenha gratuitamente em:{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              aistudio.google.com/apikey
            </a>
          </p>
        </div>

        {/* Documento Anterior */}
        <div className="space-y-2">
          <Label htmlFor="docAnterior">Documento do Round Anterior</Label>
          <div className="flex items-center gap-2">
            <Input
              id="docAnterior"
              type="file"
              accept=".docx"
              onChange={(e) => setDocumentoAnterior(e.target.files?.[0] || null)}
              disabled={isProcessing}
              className="flex-1"
            />
            {documentoAnterior && (
              <span className="text-sm text-green-600 dark:text-green-400">✓</span>
            )}
          </div>
          {documentoAnterior && (
            <p className="text-xs text-muted-foreground">
              Arquivo: {documentoAnterior.name}
            </p>
          )}
        </div>

        {/* Transcrição */}
        <div className="space-y-2">
          <Label htmlFor="transcricao">Transcrição de Hoje</Label>
          <div className="flex items-center gap-2">
            <Input
              id="transcricao"
              type="file"
              accept=".docx,.txt"
              onChange={(e) => setTranscricao(e.target.files?.[0] || null)}
              disabled={isProcessing}
              className="flex-1"
            />
            {transcricao && (
              <span className="text-sm text-green-600 dark:text-green-400">✓</span>
            )}
          </div>
          {transcricao && (
            <p className="text-xs text-muted-foreground">
              Arquivo: {transcricao.name}
            </p>
          )}
        </div>

        {/* Botão de Processar */}
        <Button
          onClick={handleSubmit}
          disabled={!canProcess}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando com Gemini...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Gerar Round de Hoje
            </>
          )}
        </Button>

        {/* Informações */}
        <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
          <p className="font-semibold">ℹ️ Como funciona:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>100% gratuito usando Gemini API</li>
            <li>Processamento em segundos</li>
            <li>Aplica cores e contadores automaticamente</li>
            <li>Preserva layout original</li>
            <li>Histórico salvo localmente</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
