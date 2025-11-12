import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SavedReport } from "@/types";
import { Calendar, FileText, Trash2 } from "lucide-react";

interface HistoryPanelProps {
  savedReports: SavedReport[];
  selectedContextId: string | null;
  onSelectContext: (id: string | null) => void;
  onDeleteReport: (id: string) => void;
}

export default function HistoryPanel({
  savedReports,
  selectedContextId,
  onSelectContext,
  onDeleteReport,
}: HistoryPanelProps) {
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Histórico de Prontuários
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Selecione um prontuário para usar como contexto
        </p>
      </div>

      <ScrollArea className="flex-1 p-4">
        {savedReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum prontuário salvo ainda</p>
            <p className="text-sm text-muted-foreground mt-1">
              Gere e salve prontuários para vê-los aqui
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedReports.map((report) => (
              <Card
                key={report.id}
                className={`cursor-pointer transition-all hover:border-primary ${
                  selectedContextId === report.id ? "border-primary bg-accent" : ""
                }`}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {report.dateReference}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteReport(report.id);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Salvo em: {formatDate(report.timestamp)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-3">
                  <Button
                    variant={selectedContextId === report.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (selectedContextId === report.id) {
                        onSelectContext(null);
                      } else {
                        onSelectContext(report.id);
                      }
                    }}
                    className="w-full"
                  >
                    {selectedContextId === report.id ? "Contexto Selecionado" : "Usar como Contexto"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
