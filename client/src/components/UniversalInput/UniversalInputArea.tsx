/**
 * UniversalInputArea — Área de entrada universal de transcrição
 * 
 * Suporta:
 * - Colar texto (Ctrl+V / segurar e colar no mobile)
 * - Arrastar e soltar arquivos
 * - Selecionar arquivos: TXT, PDF, SRT, VTT, RTF, MD, DOCX, MP3, WAV, WEBM, M4A
 * - Digitar texto diretamente
 * - Extração de PDF via backend
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
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const isAudioFile = (file: File) =>
    file.type.startsWith('audio/') || /\.(mp3|wav|webm|m4a|ogg|aac)$/i.test(file.name);

  const isTextFile = (file: File) =>
    /\.(txt|srt|vtt|md|csv|rtf|text)$/i.test(file.name) || file.type.startsWith('text/');

  const isPdfFile = (file: File) =>
    file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';

  const isDocxFile = (file: File) =>
    file.name.toLowerCase().endsWith('.docx');

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

  const handlePaste = async (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    if (text && text.trim().length > 0) {
      e.preventDefault();
      onTextReady(text, 'Texto colado');
      setMode('typing');
      return;
    }
    const files = e.clipboardData.files;
    if (files.length > 0) {
      e.preventDefault();
      await processFile(files[0]);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onTextReady(text, 'Texto digitado');
    setMode(text.length > 0 ? 'typing' : 'idle');
  };

  const handleClear = () => {
    onClear();
    setMode('idle');
    setError('');
  };

  // Estado: tem conteúdo
  const hasContent = currentValue.length > 0 || (mode === 'audio' && currentFileName);

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
            <div style={{
              fontSize: '12px', color: '#666', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}>
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
          <button
            onClick={handleClear}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Área principal de drop/paste */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
        style={{
          border: `2px dashed ${isDragging ? '#9B59B6' : '#F4A582'}`,
          borderRadius: '10px',
          background: isDragging ? '#F9F0FF' : '#FFF8F5',
          transition: 'all 0.2s',
          overflow: 'hidden'
        }}
      >
        {isProcessing ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>{processingMsg}</p>
          </div>
        ) : (
          <>
            {/* Área de texto com paste */}
            <textarea
              ref={textAreaRef}
              placeholder="Cole aqui a transcrição (Ctrl+V ou segurar → Colar no mobile)&#10;&#10;Ou arraste um arquivo abaixo..."
              value={currentValue}
              onChange={handleTextChange}
              onPaste={handlePaste}
              style={{
                width: '100%', minHeight: '100px', padding: '14px',
                border: 'none', outline: 'none', resize: 'vertical',
                fontSize: '14px', color: '#2C3E50', background: 'transparent',
                fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: '1.5',
                boxSizing: 'border-box'
              }}
            />

            {/* Separador */}
            <div style={{
              borderTop: '1px dashed #F4A582', padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'
            }}>
              <span style={{ fontSize: '12px', color: '#AAA', marginRight: '4px' }}>ou selecione um arquivo:</span>

              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '5px 10px', background: '#FFF', border: '1px solid #F4A582',
                  borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#E67E22', fontWeight: '600'
                }}
              >
                <FileText size={13} /> TXT / PDF / SRT
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '5px 10px', background: '#FFF', border: '1px solid #9B59B6',
                  borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#9B59B6', fontWeight: '600'
                }}
              >
                <Mic size={13} /> MP3 / WAV / WEBM
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '5px 10px', background: '#FFF', border: '1px solid #5B9BD5',
                  borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#5B9BD5', fontWeight: '600'
                }}
              >
                <Upload size={13} /> DOCX
              </button>
            </div>
          </>
        )}
      </div>

      {/* Dica de uso */}
      <div style={{
        marginTop: '6px', padding: '6px 10px',
        background: '#F0F4FF', borderRadius: '6px',
        display: 'flex', alignItems: 'center', gap: '6px'
      }}>
        <Clipboard size={12} color="#5B9BD5" />
        <span style={{ fontSize: '11px', color: '#5B9BD5' }}>
          <strong>Dica:</strong> No app de transcrição, toque em "Copiar" e depois cole aqui com toque longo → Colar
        </span>
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

      {/* Input de arquivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.pdf,.srt,.vtt,.md,.csv,.rtf,.docx,.mp3,.wav,.webm,.m4a,.ogg,.aac"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
}
