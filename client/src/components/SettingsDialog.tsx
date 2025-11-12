import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { UserPreferences } from "@/types";
import { ExternalLink } from "lucide-react";
import { useState } from "react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: UserPreferences;
  onSave: (preferences: UserPreferences) => void;
}

export default function SettingsDialog({
  open,
  onOpenChange,
  preferences,
  onSave,
}: SettingsDialogProps) {
  const [localPreferences, setLocalPreferences] = useState<UserPreferences>(preferences);

  const handleSave = () => {
    onSave(localPreferences);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações</DialogTitle>
          <DialogDescription>
            Configure sua API Key do Gemini e personalize o comportamento da IA
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key do Google Gemini *</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Cole sua API Key aqui"
              value={localPreferences.apiKey}
              onChange={(e) =>
                setLocalPreferences({ ...localPreferences, apiKey: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Obtenha gratuitamente em:{" "}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Google AI Studio
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          {/* Aprendizado Automático */}
          <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="autoLearn" className="text-base">
                Aprendizado Automático
              </Label>
              <p className="text-sm text-muted-foreground">
                A IA aprende automaticamente com seus feedbacks (👍/👎) e ajusta o estilo dos
                prontuários
              </p>
            </div>
            <Switch
              id="autoLearn"
              checked={localPreferences.autoLearn}
              onCheckedChange={(checked) =>
                setLocalPreferences({ ...localPreferences, autoLearn: checked })
              }
            />
          </div>

          {/* Instruções Personalizadas */}
          <div className="space-y-2">
            <Label htmlFor="customInstructions">Instruções Personalizadas (Opcional)</Label>
            <Textarea
              id="customInstructions"
              placeholder="Ex: Sempre priorizar antibióticos, usar linguagem técnica, incluir scores de gravidade..."
              value={localPreferences.customInstructions}
              onChange={(e) =>
                setLocalPreferences({
                  ...localPreferences,
                  customInstructions: e.target.value,
                })
              }
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Estas instruções serão sempre incluídas na geração de prontuários. Deixe em branco
              para usar apenas o aprendizado automático.
            </p>
          </div>

          {/* Informações de Aprendizado */}
          {localPreferences.autoLearn && (
            <div className="p-4 bg-accent rounded-lg space-y-2">
              <h4 className="text-sm font-semibold">📊 Status do Aprendizado</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  • Seções preferidas: {localPreferences.stylePatterns.preferredSections.length || "Nenhuma ainda"}
                </p>
                <p>
                  • Formato preferido: {localPreferences.stylePatterns.preferredFormat}
                </p>
                <p className="mt-2 text-xs">
                  💡 <strong>Dica:</strong> Use os botões 👍/👎 após gerar prontuários para ensinar
                  a IA o seu estilo preferido!
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar Configurações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
