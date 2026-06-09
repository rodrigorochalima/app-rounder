/**
 * UniversalInputArea — Área de entrada universal de transcrição
 * 
 * Solução iOS: textarea DIRETAMENTE visível e editável, sem div pai com onPaste.
 * O iOS Safari só mostra o menu "Colar" quando o elemento focado é um input/textarea
 * nativo sem interceptação de eventos nos elementos pai.
 * 
 * Suporta:
 * - Colar texto (Ctrl+V / segurar → Colar no iOS/Android)
 * - Arrastar e soltar arquivos (desktop)
 * - Selecionar arquivos: TXT, PDF, SRT, VTT, RTF, MD, DOCX, MP3, WAV, WEBM
 * - Digitar texto diretamente
 */
import { useState, useRef, useCallback } from 'react';
import { Upload, Clipboard, FileText, Mic, X, CheckCircle, AlertCircle } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const docxInputRef = useRef<HTMLInputElement>(null);
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

  // Drag & Drop — apenas na div wrapper, NÃO no textarea
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
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
  // NÃO usar e.preventDefault() para não bloquear o menu nativo
  const handleTextareaPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData?.getData('text/plain');
    if (text && text.trim().length > 0) {
      // Deixar o textarea receber o texto normalmente via onChange
      // Não chamar e.preventDefault() aqui — iOS precisa do comportamento padrão
      return;
    }
    // Verificar arquivos colados
    const files = e.clipboardData?.files;
    if (files && files.length > 0) {
      e.preventDefault();
      await processFile(files[0]);
    }
  };

  // onChange do textarea — captura texto digitado E colado
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
      {/* Wrapper para drag & drop — sem onPaste para não bloquear iOS */}
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
            {/*
              TEXTAREA NATIVO — chave para funcionar no iOS:
              - Sem onPaste no elemento pai (div wrapper)
              - onPaste apenas no próprio textarea
              - onChange captura o texto colado via comportamento nativo
              - -webkit-user-select: text garante seleção no iOS
            */}
            <textarea
              ref={textAreaRef}
              value={currentValue}
              onChange={handleTextChange}
              onPaste={handleTextareaPaste}
              placeholder={"Toque aqui, segure e escolha \"Colar\" ↓\n\nOu arraste um arquivo abaixo..."}
              rows={5}
              style={{
                width: '100%',
                minHeight: '120px',
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
                // iOS específico:
                WebkitUserSelect: 'text',
                userSelect: 'text',
                WebkitAppearance: 'none',
                touchAction: 'manipulation',
              } as React.CSSProperties}
              autoCorrect="off"
              autoCapitalize="sentences"
              spellCheck={false}
              // iOS: garantir que o teclado apareça e o menu de contexto funcione
              inputMode="text"
            />

            {/* Barra de botões de arquivo */}
            <div style={{
              borderTop: '1px dashed #F4A582',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
              background: 'rgba(244,165,130,0.05)'
            }}>
              <span style={{ fontSize: '12px', color: '#AAA' }}>ou selecione:</span>

              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '6px 12px', background: '#FFF',
                  border: '1px solid #F4A582', borderRadius: '6px',
                  cursor: 'pointer', fontSize: '12px', color: '#E67E22', fontWeight: '600',
                  touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent'
                } as React.CSSProperties}
              >
                <FileText size={13} /> TXT / PDF / SRT
              </button>

              <button
                onClick={() => audioInputRef.current?.click()}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '6px 12px', background: '#FFF',
                  border: '1px solid #9B59B6', borderRadius: '6px',
                  cursor: 'pointer', fontSize: '12px', color: '#9B59B6', fontWeight: '600',
                  touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent'
                } as React.CSSProperties}
              >
                <Mic size={13} /> MP3 / WAV
              </button>

              <button
                onClick={() => docxInputRef.current?.click()}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '6px 12px', background: '#FFF',
                  border: '1px solid #5B9BD5', borderRadius: '6px',
                  cursor: 'pointer', fontSize: '12px', color: '#5B9BD5', fontWeight: '600',
                  touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent'
                } as React.CSSProperties}
              >
                <Upload size={13} /> DOCX
              </button>

              {/* Botão Colar via Clipboard API — funciona no iOS 16.4+ e Android */}
              <button
                onClick={async () => {
                  try {
                    if (!navigator.clipboard?.readText) {
                      // Fallback: focar o textarea para o usuário colar manualmente
                      textAreaRef.current?.focus();
                      setError('Toque no campo de texto acima e segure para colar.');
                      setTimeout(() => setError(''), 4000);
                      return;
                    }
                    const text = await navigator.clipboard.readText();
                    if (text && text.trim().length > 0) {
                      onTextReady(text, 'Texto colado');
                      setMode('typing');
                    } else {
                      setError('Área de transferência vazia ou sem texto.');
                      setTimeout(() => setError(''), 3000);
                    }
                  } catch (err: any) {
                    // Permissão negada ou API indisponível — focar textarea
                    textAreaRef.current?.focus();
                    setError('Toque no campo acima e segure o dedo para colar.');
                    setTimeout(() => setError(''), 4000);
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '6px 12px', background: '#FFF8E1',
                  border: '1px solid #F39C12', borderRadius: '6px',
                  cursor: 'pointer', fontSize: '12px', color: '#E67E22', fontWeight: '700',
                  touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent'
                } as React.CSSProperties}
              >
                <Clipboard size={13} /> Colar
              </button>
            </div>
          </>
        )}
      </div>

      {/* Dica visual */}
      <div style={{
        marginTop: '8px', padding: '10px 12px',
        background: '#EBF5FB', borderRadius: '8px',
        display: 'flex', alignItems: 'flex-start', gap: '8px'
      }}>
        <Clipboard size={14} color="#2980B9" style={{ flexShrink: 0, marginTop: '1px' }} />
        <div style={{ fontSize: '12px', color: '#2980B9', lineHeight: '1.5' }}>
          <strong>Como colar no celular:</strong> Copie o texto no app de transcrição, depois toque em <strong>"Colar"</strong> acima — ou toque no campo de texto, segure e escolha <strong>"Colar"</strong> no menu.
        </div>
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

      {/* Inputs de arquivo ocultos separados por tipo */}
      <input ref={fileInputRef} type="file"
        accept=".txt,.pdf,.srt,.vtt,.md,.csv,.rtf"
        style={{ display: 'none' }} onChange={handleFileChange} />
      <input ref={audioInputRef} type="file"
        accept=".mp3,.wav,.webm,.m4a,.ogg,.aac"
        style={{ display: 'none' }} onChange={handleFileChange} />
      <input ref={docxInputRef} type="file"
        accept=".docx,.doc"
        style={{ display: 'none' }} onChange={handleFileChange} />
    </div>
  );
}
