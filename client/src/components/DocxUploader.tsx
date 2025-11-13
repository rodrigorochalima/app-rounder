import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { FileText, Upload } from "lucide-react";
import { useRef, useState } from "react";

interface DocxUploaderProps {
  onFilesSelect: (documentoAnterior: File, transcricao: File) => void;
  isProcessing: boolean;
}

export default function DocxUploader({ onFilesSelect, isProcessing }: DocxUploaderProps) {
  const docAnteriorRef = useRef<HTMLInputElement>(null);
  const transcricaoRef = useRef<HTMLInputElement>(null);
  
  const [docAnterior, setDocAnterior] = useState<File | null>(null);
  const [transcricao, setTranscricao] = useState<File | null>(null);

  const handleDocAnteriorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith(".docx")) {
      setDocAnterior(file);
    } else {
      alert("Por favor, selecione um arquivo .docx válido");
    }
  };

  const handleTranscricaoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.name.endsWith(".docx") || file.name.endsWith(".txt"))) {
      setTranscricao(file);
    } else {
      alert("Por favor, selecione um arquivo .docx ou .txt válido");
    }
  };

  const handleProcess = () => {
    if (docAnterior && transcricao) {
      onFilesSelect(docAnterior, transcricao);
    }
  };

  const canProcess = docAnterior && transcricao && !isProcessing;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Processar Documentos Word
        </CardTitle>
        <CardDescription>
          Faça upload do documento anterior e da transcrição para gerar o novo round
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Documento Anterior */}
        <div className="space-y-2">
          <Label htmlFor="doc-anterior">Documento Anterior (.docx)</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={() => docAnteriorRef.current?.click()}
              disabled={isProcessing}
            >
              <Upload className="mr-2 h-4 w-4" />
              {docAnterior ? docAnterior.name : "Selecionar documento anterior"}
            </Button>
            <input
              ref={docAnteriorRef}
              id="doc-anterior"
              type="file"
              accept=".docx"
              onChange={handleDocAnteriorChange}
              className="hidden"
            />
          </div>
          {docAnterior && (
            <p className="text-xs text-muted-foreground">
              ✓ {docAnterior.name} ({(docAnterior.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        {/* Transcrição */}
        <div className="space-y-2">
          <Label htmlFor="transcricao">Transcrição (.docx ou .txt)</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={() => transcricaoRef.current?.click()}
              disabled={isProcessing}
            >
              <Upload className="mr-2 h-4 w-4" />
              {transcricao ? transcricao.name : "Selecionar transcrição"}
            </Button>
            <input
              ref={transcricaoRef}
              id="transcricao"
              type="file"
              accept=".docx,.txt"
              onChange={handleTranscricaoChange}
              className="hidden"
            />
          </div>
          {transcricao && (
            <p className="text-xs text-muted-foreground">
              ✓ {transcricao.name} ({(transcricao.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        {/* Botão Processar */}
        <Button
          onClick={handleProcess}
          disabled={!canProcess}
          className="w-full"
        >
          {isProcessing ? "Processando..." : "Processar e Gerar Round"}
        </Button>

        {/* Instruções */}
        <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
          <p className="font-medium">Como usar:</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Selecione o documento do round anterior (ex: Round 121125.docx)</li>
            <li>Selecione a transcrição do round de hoje</li>
            <li>Clique em "Processar e Gerar Round"</li>
            <li>O sistema aplicará automaticamente as regras de formatação</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
