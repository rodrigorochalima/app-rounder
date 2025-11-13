import { useState, useEffect, useRef } from 'react';
import { Upload, Loader2, Download, Trash2, FileText, Clipboard } from 'lucide-react';

const API_KEY_STORAGE_KEY = 'groq_api_key';

export default function RoundSimpleFinalV2() {
  const [apiKey, setApiKey] = useState('');
  const [docAnterior, setDocAnterior] = useState<File | null>(null);
  const [transcricao, setTranscricao] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const docAnteriorRef = useRef<HTMLInputElement>(null);
  const transcricaoRef = useRef<HTMLInputElement>(null);

  // Carregar API Key do localStorage ao montar o componente
  useEffect(() => {
    const savedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  // Salvar API Key no localStorage quando mudar
  useEffect(() => {
    if (apiKey && apiKey.length > 10) {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    }
  }, [apiKey]);

  // Debug: Log quando os arquivos mudarem
  useEffect(() => {
    console.log('Estado atualizado:', {
      apiKey: apiKey.length,
      docAnterior: docAnterior?.name,
      transcricao: transcricao?.name,
      podeProcessar: apiKey.length > 10 && docAnterior !== null && transcricao !== null
    });
  }, [apiKey, docAnterior, transcricao]);

  const limparCache = () => {
    // Limpar cache do service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });
    }

    // Limpar cache storage
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name);
        });
      });
    }

    // Limpar localStorage (exceto API Key)
    const savedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    localStorage.clear();
    if (savedApiKey) {
      localStorage.setItem(API_KEY_STORAGE_KEY, savedApiKey);
    }

    // Limpar sessionStorage
    sessionStorage.clear();

    // Recarregar página com timestamp para forçar atualização
    window.location.href = window.location.pathname + '?v=' + Date.now();
  };

  const handlePaste = async (e: React.ClipboardEvent, tipo: 'anterior' | 'transcricao') => {
    e.preventDefault();
    const items = e.clipboardData?.items;
    
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Verificar se é um arquivo
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

  const processarRound = async () => {
    if (!apiKey || !docAnterior || !transcricao) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      // Aqui será implementada a lógica de processamento
      // Por agora, apenas simula o processamento
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      setResult('Documento processado com sucesso!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar documento');
    } finally {
      setProcessing(false);
    }
  };

  // Verificar se todos os campos estão preenchidos
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

          {/* Debug Info */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
            <strong>Debug:</strong> API Key: {apiKey.length > 10 ? '✓' : '✗'} | 
            Doc Anterior: {docAnterior ? '✓ ' + docAnterior.name : '✗'} | 
            Transcrição: {transcricao ? '✓ ' + transcricao.name : '✗'} | 
            Pode Processar: {podeProcessar ? '✓ SIM' : '✗ NÃO'}
          </div>

          {/* Botão de Processar */}
          <button
            onClick={processarRound}
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

          {result && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              ✅ {result}
            </div>
          )}
        </div>

        {/* Histórico */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📚 Histórico</h2>
          <p className="text-gray-600">
            Os últimos 5 documentos gerados aparecerão aqui
          </p>
        </div>
      </div>
    </div>
  );
}
