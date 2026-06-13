/**
 * UniversalInputArea — Área de entrada universal de transcrição
 *
 * Estratégia iOS:
 * - Botão grande "📎 Importar PDF / Áudio" como primeiro elemento (mais fácil de tocar)
 * - Input de arquivo com accept="*" para aceitar qualquer arquivo no iOS
 * - Textarea nativo sem interceptação de eventos no pai (para o menu "Colar" funcionar)
 * - Botão "Colar" tenta clipboard.read() (arquivos) e clipboard.readText() (texto)
 * - Drag & drop no wrapper para desktop
 */
import { useState, useRef, useCallback } from 'react';
import { Upload, Clipboard, FileText, Mic, X, CheckCircle, AlertCircle, FolderOpen } from 'lucide-react';
import mammoth from 'mammoth';

interface UniversalInputAreaProps {
  onTextReady: (text: string, sourceName: string) => void;
  onFileReady: (file: File) => void;
  currentValue: string;
  currentFileName: string;
  onClear: () => void;
}

type InputMode = 'idle' | 'typing' | 'file' | 'audio';

export default function UniversalInputArea({
  onTextReady,
  onFileReady,
  currentValue,
  currentFileName,
  onClear
}: UniversalInputAreaProps) {
  const [mode, setMode] = useState<InputMode>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('');
  const [error, setError] = useState('');
  // Input único com accept="*/*" — no iOS abre o seletor nativo com todas as opções
  const anyFileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const isAudioFile = (file: File) =>
    file.type.startsWith('audio/') || /\.(mp3|wav|webm|m4a|ogg|aac)$/i.test(file.name);

  const isTextFile = (file: File) =>
    /\.(txt|srt|vtt|md|csv|rtf|text)$/i.test(file.name) || file.type.startsWith('text/');

  const isPdfFile = (file: File) =>
    file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';

  const isDocxFile = (file: File) =>
    /\.(docx|doc)$/i.test(file.name);

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError('');

    try {
      if (isAudioFile(file)) {
        setProcessingMsg(`🎵 Arquivo de áudio: ${file.name}`);
        onFileReady(file);
        setMode('audio');
        return;
      }

      if (isDocxFile(file)) {
        setProcessingMsg('📄 Extraindo texto do DOCX...');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        onTextReady(result.value, file.name);
        setMode('file');
        return;
      }

      if (isTextFile(file)) {
        setProcessingMsg('📝 Lendo arquivo de texto...');
        const text = await file.text();
        onTextReady(text, file.name);
        setMode('file');
        return;
      }

      if (isPdfFile(file)) {
        setProcessingMsg('📑 Extraindo texto do PDF...');
        const token = localStorage.getItem('access_token');
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/extract-text', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Erro ao processar PDF');
        }
        const data = await res.json();
        onTextReady(data.text, file.name);
        setMode('file');
        return;
      }

      throw new Error(`Formato não suportado: ${file.name.split('.').pop()}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
      setProcessingMsg('');
    }
  }, [onTextReady, onFileReady]);

  // Drag & Drop
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) await processFile(file);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
    e.target.value = '';
  };

  // Paste no textarea — comportamento nativo iOS
  const handleTextareaPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData?.getData('text/plain');
    if (text && text.trim().length > 0) {
      // Deixar o textarea receber o texto normalmente via onChange
      return;
    }
    // Verificar arquivos colados (funciona no desktop e alguns Android)
    const files = e.clipboardData?.files;
    if (files && files.length > 0) {
      e.preventDefault();
      await processFile(files[0]);
    }
  };

  // Botão "Colar" — tenta clipboard.read() para arquivos, depois clipboard.readText() para texto
  const handlePasteButton = async () => {
    setError('');
    try {
      // Tentar ler arquivos da área de transferência (iOS 17+, Chrome Android)
      if (navigator.clipboard && 'read' in navigator.clipboard) {
        try {
          const clipboardItems = await (navigator.clipboard as any).read();
          for (const item of clipboardItems) {
            // Verificar se tem PDF
            if (item.types.includes('application/pdf')) {
              const blob = await item.getType('application/pdf');
              const file = new File([blob], 'documento_colado.pdf', { type: 'application/pdf' });
              await processFile(file);
              return;
            }
            // Verificar outros tipos de arquivo
            for (const type of item.types) {
              if (type.startsWith('image/') || type === 'text/html') continue;
              if (type !== 'text/plain') {
                try {
                  const blob = await item.getType(type);
                  const ext = type.split('/')[1] || 'bin';
                  const file = new File([blob], `arquivo_colado.${ext}`, { type });
                  await processFile(file);
                  return;
                } catch {}
              }
            }
            // Tentar texto
            if (item.types.includes('text/plain')) {
              const blob = await item.getType('text/plain');
              const text = await blob.text();
              if (text.trim().length > 0) {
                onTextReady(text, 'Texto colado');
                setMode('typing');
                return;
              }
            }
          }
          setError('Área de transferência vazia. Copie o conteúdo primeiro.');
          setTimeout(() => setError(''), 4000);
          return;
        } catch (readErr: any) {
          // Permissão negada — tentar readText como fallback
        }
      }

      // Fallback: readText
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().length > 0) {
          onTextReady(text, 'Texto colado');
          setMode('typing');
          return;
        }
      }

      // Último recurso: focar textarea para colar manualmente
      textAreaRef.current?.focus();
      setError('Toque no campo de texto abaixo e segure o dedo para ver a opção "Colar".');
      setTimeout(() => setError(''), 5000);
    } catch (err: any) {
      textAreaRef.current?.focus();
      setError('Toque no campo abaixo e segure para colar.');
      setTimeout(() => setError(''), 4000);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onTextReady(text, 'Texto colado/digitado');
    setMode(text.length > 0 ? 'typing' : 'idle');
  };

  const handleClear = () => {
    onClear();
    setMode('idle');
    setError('');
  };

  const hasContent = currentValue.length > 0 || (mode === 'audio' && currentFileName);

  // Estado com conteúdo
  if (hasContent) {
    return (
      <div style={{
        border: `2px solid ${mode === 'audio' ? '#9B59B6' : '#27AE60'}`,
        borderRadius: '10px', padding: '14px',
        background: mode === 'audio' ? '#F9F0FF' : '#F0FFF4'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <CheckCircle size={18} color={mode === 'audio' ? '#9B59B6' : '#27AE60'} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: '600', fontSize: '13px', color: mode === 'audio' ? '#6C3483' : '#27AE60', marginBottom: '4px' }}>
              {mode === 'audio' ? '🎵 Arquivo de áudio pronto' : '📝 Transcrição pronta'}
            </div>
            <div style={{ fontSize: '12px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentFileName || 'Texto colado/digitado'}
            </div>
            {currentValue.length > 0 && (
              <div style={{
                marginTop: '8px', fontSize: '12px', color: '#888',
                background: 'rgba(0,0,0,0.04)', borderRadius: '6px', padding: '6px 8px',
                maxHeight: '60px', overflow: 'hidden', lineHeight: '1.4'
              }}>
                {currentValue.slice(0, 150)}{currentValue.length > 150 ? '...' : ''}
              </div>
            )}
            <div style={{ marginTop: '6px', fontSize: '11px', color: '#999' }}>
              {mode === 'audio' ? '🎙️ Será transcrito automaticamente' : `${currentValue.length.toLocaleString()} caracteres`}
            </div>
          </div>
          <button onClick={handleClear} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ===== BOTÃO PRINCIPAL — Importar arquivo (PDF, áudio, texto) ===== */}
      {/* Este é o fluxo mais confiável no iOS: abre o seletor de arquivos nativo */}
      <button
        onClick={() => anyFileInputRef.current?.click()}
        style={{
          width: '100%',
          padding: '16px',
          background: 'linear-gradient(135deg, #E67E22 0%, #F39C12 100%)',
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          marginBottom: '10px',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          boxShadow: '0 3px 10px rgba(230,126,34,0.3)',
        } as React.CSSProperties}
      >
        <FolderOpen size={22} color="white" />
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>
            📎 Importar PDF, Áudio ou Texto
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', marginTop: '1px' }}>
            Toque para selecionar arquivo do iPhone / iCloud
          </div>
        </div>
      </button>

      {/* Separador */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <div style={{ flex: 1, height: '1px', background: '#E8E8E8' }} />
        <span style={{ fontSize: '11px', color: '#BBB', whiteSpace: 'nowrap' }}>ou cole texto abaixo</span>
        <div style={{ flex: 1, height: '1px', background: '#E8E8E8' }} />
      </div>

      {/* Wrapper para drag & drop */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${isDragging ? '#9B59B6' : '#F4A582'}`,
          borderRadius: '10px',
          background: isDragging ? '#F9F0FF' : '#FFF8F5',
          transition: 'border-color 0.2s, background 0.2s',
          overflow: 'hidden'
        }}
      >
        {isProcessing ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏳</div>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>{processingMsg}</p>
          </div>
        ) : (
          <>
            {/* TEXTAREA NATIVO — sem onPaste no pai para não bloquear iOS */}
            <textarea
              ref={textAreaRef}
              value={currentValue}
              onChange={handleTextChange}
              onPaste={handleTextareaPaste}
              placeholder={"Toque aqui, segure e escolha \"Colar\" para colar texto\n\nOu use o botão laranja acima para importar PDF/áudio"}
              rows={4}
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '14px',
                border: 'none',
                outline: 'none',
                resize: 'vertical',
                fontSize: '15px',
                lineHeight: '1.6',
                color: '#2C3E50',
                background: 'transparent',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                boxSizing: 'border-box',
                WebkitUserSelect: 'text',
                userSelect: 'text',
                WebkitAppearance: 'none',
                touchAction: 'manipulation',
              } as React.CSSProperties}
              autoCorrect="off"
              autoCapitalize="sentences"
              spellCheck={false}
              inputMode="text"
            />

            {/* Barra inferior com botão Colar e áudio */}
            <div style={{
              borderTop: '1px dashed #F4A582',
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
              background: 'rgba(244,165,130,0.05)'
            }}>
              {/* Botão Colar — tenta clipboard.read() para arquivos */}
              <button
                onClick={handlePasteButton}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '7px 14px', background: '#FFF8E1',
                  border: '1.5px solid #F39C12', borderRadius: '6px',
                  cursor: 'pointer', fontSize: '13px', color: '#E67E22', fontWeight: '700',
                  touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent'
                } as React.CSSProperties}
              >
                <Clipboard size={14} /> Colar
              </button>

              <button
                onClick={() => audioInputRef.current?.click()}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '7px 14px', background: '#FFF',
                  border: '1px solid #9B59B6', borderRadius: '6px',
                  cursor: 'pointer', fontSize: '13px', color: '#9B59B6', fontWeight: '600',
                  touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent'
                } as React.CSSProperties}
              >
                <Mic size={14} /> Áudio
              </button>
            </div>
          </>
        )}
      </div>

      {/* Erro */}
      {error && (
        <div style={{
          marginTop: '6px', padding: '8px 12px', background: '#FFF0F0',
          border: '1px solid #FFCDD2', borderRadius: '6px',
          display: 'flex', alignItems: 'center', gap: '6px'
        }}>
          <AlertCircle size={14} color="#E53935" />
          <span style={{ fontSize: '12px', color: '#E53935' }}>{error}</span>
        </div>
      )}

      {/* Inputs de arquivo ocultos */}
      {/* Input universal — aceita PDF, áudio e texto */}
      <input
        ref={anyFileInputRef}
        type="file"
        accept=".txt,.pdf,.srt,.vtt,.md,.csv,.rtf,.docx,.doc,.mp3,.wav,.webm,.m4a,.ogg,.aac"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept=".mp3,.wav,.webm,.m4a,.ogg,.aac"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
}
