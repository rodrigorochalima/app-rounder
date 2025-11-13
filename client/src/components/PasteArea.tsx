import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { X, FileText, Image as ImageIcon, Music, File } from "lucide-react";

interface PasteAreaProps {
  label: string;
  onContentPaste: (content: PastedContent) => void;
  accept?: string;
  placeholder?: string;
}

export interface PastedContent {
  type: 'text' | 'image' | 'audio' | 'file';
  data: string | File;
  preview?: string;
}

export default function PasteArea({ label, onContentPaste, placeholder }: PasteAreaProps) {
  const [content, setContent] = useState<PastedContent | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detectar paste
  const handlePaste = async (e: React.ClipboardEvent) => {
    e.preventDefault();
    const items = e.clipboardData.items;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Imagem
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        if (blob) {
          const preview = URL.createObjectURL(blob);
          const pastedContent: PastedContent = {
            type: 'image',
            data: blob,
            preview,
          };
          setContent(pastedContent);
          onContentPaste(pastedContent);
          return;
        }
      }

      // Áudio
      if (item.type.indexOf('audio') !== -1) {
        const blob = item.getAsFile();
        if (blob) {
          const pastedContent: PastedContent = {
            type: 'audio',
            data: blob,
            preview: `Áudio: ${blob.name || 'arquivo.mp3'}`,
          };
          setContent(pastedContent);
          onContentPaste(pastedContent);
          return;
        }
      }

      // Arquivo genérico
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          const pastedContent: PastedContent = {
            type: 'file',
            data: file,
            preview: `${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
          };
          setContent(pastedContent);
          onContentPaste(pastedContent);
          return;
        }
      }

      // Texto
      if (item.type === 'text/plain') {
        item.getAsString((text) => {
          const pastedContent: PastedContent = {
            type: 'text',
            data: text,
            preview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          };
          setContent(pastedContent);
          onContentPaste(pastedContent);
        });
        return;
      }
    }
  };

  // Drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      let type: 'text' | 'image' | 'audio' | 'file' = 'file';

      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('audio/')) type = 'audio';
      else if (file.type.includes('text') || file.name.endsWith('.txt')) type = 'text';

      const preview = type === 'image' ? URL.createObjectURL(file) : 
                      `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

      const pastedContent: PastedContent = {
        type,
        data: file,
        preview,
      };

      setContent(pastedContent);
      onContentPaste(pastedContent);
    }
  };

  // Upload via botão
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      let type: 'text' | 'image' | 'audio' | 'file' = 'file';

      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('audio/')) type = 'audio';
      else if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.docx')) type = 'text';

      const preview = type === 'image' ? URL.createObjectURL(file) : 
                      `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

      const pastedContent: PastedContent = {
        type,
        data: file,
        preview,
      };

      setContent(pastedContent);
      onContentPaste(pastedContent);
    }
  };

  // Limpar
  const handleClear = () => {
    setContent(null);
    if (textareaRef.current) textareaRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Ícone baseado no tipo
  const getIcon = () => {
    if (!content) return <FileText className="h-8 w-8 text-muted-foreground" />;
    switch (content.type) {
      case 'image': return <ImageIcon className="h-8 w-8 text-blue-500" />;
      case 'audio': return <Music className="h-8 w-8 text-purple-500" />;
      case 'text': return <FileText className="h-8 w-8 text-green-500" />;
      default: return <File className="h-8 w-8 text-orange-500" />;
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      
      {!content ? (
        <Card
          className={`relative border-2 border-dashed transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="p-6 text-center space-y-3">
            {getIcon()}
            
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Cole aqui (long press → paste)
              </p>
              <p className="text-xs text-muted-foreground">
                {placeholder || 'Texto, imagem, áudio ou arquivo'}
              </p>
            </div>

            {/* Textarea invisível para capturar paste */}
            <textarea
              ref={textareaRef}
              onPaste={handlePaste}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              placeholder="Cole aqui..."
            />

            {/* Botão de upload alternativo */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-primary hover:underline"
              >
                ou selecione um arquivo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept="*/*"
              />
            </div>
          </div>
        </Card>
      ) : (
        <Card className="relative border-green-500/50 bg-green-500/5">
          <div className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {getIcon()}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {content.type === 'text' ? 'Texto colado' : 
                     content.type === 'image' ? 'Imagem colada' :
                     content.type === 'audio' ? 'Áudio colado' :
                     'Arquivo anexado'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {content.preview}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Preview de imagem */}
            {content.type === 'image' && content.preview && (
              <img
                src={content.preview}
                alt="Preview"
                className="w-full h-32 object-cover rounded"
              />
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
