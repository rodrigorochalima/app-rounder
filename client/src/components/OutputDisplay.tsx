import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIResponse } from "@/types";
import { Download, FileText, Save } from "lucide-react";
import FeedbackButtons from "./FeedbackButtons";
import { useState } from "react";
import MarkdownRenderer from "./MarkdownRenderer";

interface OutputDisplayProps {
  result: AIResponse | null;
  currentFeedback?: "positive" | "negative" | null;
  onSave: () => void;
  onExportPDF: () => void;
  onFeedback: (feedback: "positive" | "negative") => void;
}

export default function OutputDisplay({ result, currentFeedback, onSave, onExportPDF, onFeedback }: OutputDisplayProps) {
  const [activeTab, setActiveTab] = useState<"markdown" | "json">("markdown");

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Resultado
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Visualize e exporte o prontuário gerado
            </p>
          </div>
          {result && (
            <div className="flex gap-3">
              <FeedbackButtons
                feedback={currentFeedback}
                onFeedback={onFeedback}
              />
              <div className="flex gap-2">
                <Button onClick={onSave} variant="outline" size="sm">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
                <Button onClick={onExportPDF} variant="default" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar PDF
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {!result ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <FileText className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum resultado ainda</h3>
            <p className="text-muted-foreground max-w-md">
              Importe uma conversa do WhatsApp e clique em "Gerar Prontuário" para ver os
              resultados aqui
            </p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "markdown" | "json")} className="h-full flex flex-col">
            <div className="px-4 pt-4">
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="markdown">Visualização</TabsTrigger>
                <TabsTrigger value="json">Dados (JSON)</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="markdown" className="flex-1 mt-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <Card>
                    <CardContent className="p-6" id="markdown-content">
                      <MarkdownRenderer content={result.markdown} />
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="json" className="flex-1 mt-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <Card>
                    <CardContent className="p-6">
                      <pre className="text-xs overflow-x-auto">
                        <code>{JSON.stringify(result.json, null, 2)}</code>
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
