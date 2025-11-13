import { useState, useEffect, useRef } from 'react';
import { Upload, Loader2, Download, Trash2, FileText, Clipboard, CheckCircle2, Clock } from 'lucide-react';
import { processarRound, gerarNomeArquivo } from '../lib/processador-round';

const API_KEY_STORAGE_KEY = 'groq_api_key';
const HISTORY_STORAGE_KEY = 'round_history';

interface HistoryItem {
  id: string;
  filename: string;
  date: string;
  time: string;
  url: string;
}

interface ProcessingStep {
  id: number;
  label: string;
  status: 'pending' | 'processing' | 'completed';
}

export default function RoundSimpleFinalV2() {
  const [apiKey, setApiKey] = useState('');
  const [docAnterior, setDocAnterior] = useState<File | null>(null);
  const [transcricao, setTranscricao] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([
    { id: 1, label: '📤 Enviando arquivos', status: 'pending' },
    { id: 2, label: '🤖 Processando com IA', status: 'pending' },
    { id: 3, label: '📝 Gerando documento', status: 'pending' },
    { id: 4, label: '✅ Finalizando', status: 'pending' },
  ]);
  
  const docAnteriorRef = useRef<HTMLInputElement>(null);
  const transcricaoRef = useRef<HTMLInputElement>(null);

  // Carregar API Key e histórico do localStorage
  useEffect(() => {
    const savedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
    
    const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Erro ao carregar histórico:', e);
      }
    }
  }, []);

  // Salvar API Key no localStorage
  useEffect(() => {
    if (apiKey && apiKey.length > 10) {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    }
  }, [apiKey]);

  const updateStep = (stepId: number, status: 'processing' | 'completed') => {
    setProcessingSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status } : step
    ));
  };

  const resetSteps = () => {
    setProcessingSteps([
      { id: 1, label: '📤 Enviando arquivos', status: 'pending' },
      { id: 2, label: '🤖 Processando com IA', status: 'pending' },
      { id: 3, label: '📝 Gerando documento', status: 'pending' },
      { id: 4, label: '✅ Finalizando', status: 'pending' },
    ]);
  };

  const addToHistory = (filename: string, url: string) => {
    const now = new Date();
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      filename,
      date: now.toLocaleDateString('pt-BR'),
      time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      url
    };
    
    const newHistory = [newItem, ...history].slice(0, 5); // Manter apenas os 5 mais recentes
    setHistory(newHistory);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
  };

  const limparCache = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });
    }

    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name);
        });
      });
    }

    const savedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    localStorage.clear();
    if (savedApiKey) {
      localStorage.setItem(API_KEY_STORAGE_KEY, savedApiKey);
    }
    if (savedHistory) {
      localStorage.setItem(HISTORY_STORAGE_KEY, savedHistory);
    }

    sessionStorage.clear();
    window.location.href = window.location.pathname + '?v=' + Date.now();
  };

  const handlePaste = async (e: React.ClipboardEvent, tipo: 'anterior' | 'transcricao') => {
    e.preventDefault();
    const items = e.clipboardData?.items;
    
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          console.log('Arquivo colado:', file.name, file.type);
          
          if (tipo === 'anterior') {
            setDocAnterior(file);
          } else {
            setTranscricao(file);
          }
          
          return;
        }
      }
    }
    
    alert('Não foi possível colar o arquivo. Tente usar o botão "Escolher Arquivo".');
  };

  const handleDrop = (e: React.DragEvent, tipo: 'anterior' | 'transcricao') => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      console.log('Arquivo arrastado:', file.name, file.type);
      
      if (tipo === 'anterior') {
        setDocAnterior(file);
      } else {
        setTranscricao(file);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const processarRoundHandler = async () => {
    if (!apiKey || !docAnterior || !transcricao) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    setProcessing(true);
    setError(null);
    setResult(null);
    setDownloadUrl(null);
    setDownloadFilename(null);
    resetSteps();

    try {
      // Callback de progresso real
      const onProgress = (percent: number, message: string) => {
        console.log(`Progresso: ${percent}% - ${message}`);
        
        // Atualizar steps baseado na porcentagem
        if (percent >= 0 && percent < 25) {
          updateStep(1, 'processing');
        } else if (percent >= 25 && percent < 50) {
          updateStep(1, 'completed');
          updateStep(2, 'processing');
        } else if (percent >= 50 && percent < 75) {
          updateStep(2, 'completed');
          updateStep(3, 'processing');
        } else if (percent >= 75 && percent < 100) {
          updateStep(3, 'completed');
          updateStep(4, 'processing');
        } else if (percent === 100) {
          updateStep(4, 'completed');
        }
      };
      
      // Processar documento com IA
      const blob = await processarRound(apiKey, docAnterior, transcricao, onProgress);
      
      // Criar URL para download
      const url = URL.createObjectURL(blob);
      const filename = gerarNomeArquivo();
      
      setDownloadUrl(url);
      setDownloadFilename(filename);
      setResult('Documento gerado com sucesso!');
      
      // Adicionar ao histórico
      addToHistory(filename, url);
      
    } catch (err) {
      console.error('Erro ao processar:', err);
      setError(err instanceof Error ? err.message : 'Erro ao processar documento');
      resetSteps();
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const podeProcessar = apiKey.length > 10 && docAnterior !== null && transcricao !== null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Round UTI</h1>
              <p className="text-gray-600 mt-2">
                Sistema Definitivo v2.0
              </p>
            </div>
            <button
              onClick={limparCache}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              title="Limpar cache e recarregar"
            >
              <Trash2 size={20} />
              Limpar Cache
            </button>
          </div>
        </div>

        {/* Card de Informações */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg shadow-lg p-6 mb-6 text-white">
          <h2 className="text-xl font-bold mb-3">⚡ Groq AI - Processamento Rápido e Gratuito</h2>
          <p className="mb-2">
            Selecione os arquivos necessários: documento anterior (.docx) e transcrição (.docx, .txt, .zip, áudio)
          </p>
          <p className="text-sm opacity-90">
            ✅ Preserva 100% da formatação original<br/>
            ✅ Aplica cores automaticamente (Vermelho/Amarelo/Verde)<br/>
            ✅ Incrementa contadores<br/>
            ✅ Processa ZIP do WhatsApp com transcrição automática<br/>
            ✅ API Key salva automaticamente (só precisa informar uma vez)<br/>
            ✅ <strong>Suporte a Colar (Ctrl+V ou Cmd+V)</strong>
          </p>
        </div>

        {/* Formulário */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Gerar Round de Hoje</h2>

          {/* API Key */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Key do Groq (Gratuita) {apiKey.length > 10 && <span className="text-green-600">✓ Salva</span>}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Cole sua API Key aqui (será salva automaticamente)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={processing}
            />
            <p className="text-sm text-gray-500 mt-2">
              Obtenha em:{' '}
              <a
                href="https://console.groq.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline"
              >
                console.groq.com
              </a>
              {' '}(só precisa informar uma vez, será salva no navegador)
            </p>
          </div>

          {/* Documento Anterior */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Documento do Round Anterior
            </label>
            <div 
              className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-indigo-500 transition-colors"
              onDrop={(e) => handleDrop(e, 'anterior')}
              onDragOver={handleDragOver}
              onPaste={(e) => handlePaste(e, 'anterior')}
              tabIndex={0}
            >
              <input
                ref={docAnteriorRef}
                type="file"
                accept=".docx"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  console.log('Arquivo selecionado (anterior):', file?.name);
                  setDocAnterior(file);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                disabled={processing}
              />
              {docAnterior && (
                <div className="mt-2 flex items-center gap-2 text-sm text-green-600 font-medium">
                  <FileText size={16} />
                  {docAnterior.name}
                </div>
              )}
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <Clipboard size={14} />
                <span>Você também pode colar (Ctrl+V) ou arrastar o arquivo aqui</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Aceita: .docx</p>
          </div>

          {/* Transcrição */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transcrição ou WhatsApp ZIP
            </label>
            <div 
              className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-indigo-500 transition-colors"
              onDrop={(e) => handleDrop(e, 'transcricao')}
              onDragOver={handleDragOver}
              onPaste={(e) => handlePaste(e, 'transcricao')}
              tabIndex={0}
            >
              <input
                ref={transcricaoRef}
                type="file"
                accept=".docx,.txt,.zip,.mp3,.wav,.m4a,.ogg"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  console.log('Arquivo selecionado (transcrição):', file?.name);
                  setTranscricao(file);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                disabled={processing}
              />
              {transcricao && (
                <div className="mt-2 flex items-center gap-2 text-sm text-green-600 font-medium">
                  <FileText size={16} />
                  {transcricao.name}
                </div>
              )}
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <Clipboard size={14} />
                <span>Você também pode colar (Ctrl+V) ou arrastar o arquivo aqui</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Aceita: Documentos, ZIP do WhatsApp, áudios
            </p>
          </div>

          {/* Barra de Progresso */}
          {processing && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Processando...</h3>
              <div className="space-y-3">
                {processingSteps.map((step) => (
                  <div key={step.id} className="flex items-center gap-3">
                    {step.status === 'completed' && (
                      <CheckCircle2 className="text-green-500 flex-shrink-0" size={20} />
                    )}
                    {step.status === 'processing' && (
                      <Loader2 className="text-blue-500 animate-spin flex-shrink-0" size={20} />
                    )}
                    {step.status === 'pending' && (
                      <Clock className="text-gray-300 flex-shrink-0" size={20} />
                    )}
                    <span className={`text-sm ${
                      step.status === 'completed' ? 'text-green-700 font-medium' :
                      step.status === 'processing' ? 'text-blue-700 font-medium' :
                      'text-gray-400'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botão de Processar */}
          <button
            onClick={processarRoundHandler}
            disabled={processing || !podeProcessar}
            className={`w-full py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
              podeProcessar && !processing
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {processing ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Processando...
              </>
            ) : (
              <>
                <Download size={20} />
                Gerar Round de Hoje
              </>
            )}
          </button>

          {/* Mensagens */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              ⚠️ {error}
            </div>
          )}

          {result && downloadUrl && downloadFilename && (
            <div className="mt-4 space-y-3">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                ✅ {result}
              </div>
              <button
                onClick={() => handleDownload(downloadUrl, downloadFilename)}
                className="w-full py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <Download size={24} />
                Baixar {downloadFilename}
              </button>
            </div>
          )}
        </div>

        {/* Histórico */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📚 Histórico</h2>
          {history.length === 0 ? (
            <p className="text-gray-600">
              Os últimos 5 documentos gerados aparecerão aqui
            </p>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <FileText className="text-indigo-600" size={24} />
                    <div>
                      <p className="font-medium text-gray-800">{item.filename}</p>
                      <p className="text-sm text-gray-500">{item.date} às {item.time}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(item.url, item.filename)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    <Download size={16} />
                    Baixar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
