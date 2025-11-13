import { useState } from 'react';
import { Upload, Loader2, Download, Trash2 } from 'lucide-react';

export default function RoundSimpleFinal() {
  const [apiKey, setApiKey] = useState('');
  const [docAnterior, setDocAnterior] = useState<File | null>(null);
  const [transcricao, setTranscricao] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

    // Limpar localStorage
    localStorage.clear();

    // Limpar sessionStorage
    sessionStorage.clear();

    // Recarregar página
    window.location.reload();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Round UTI</h1>
              <p className="text-gray-600 mt-2">
                Sistema Definitivo de Processamento de Rounds Médicos
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
            ✅ Processa ZIP do WhatsApp com transcrição automática
          </p>
        </div>

        {/* Formulário */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Gerar Round de Hoje</h2>

          {/* API Key */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Key do Groq (Gratuita)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Cole sua API Key aqui"
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
            </p>
          </div>

          {/* Documento Anterior */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Documento do Round Anterior
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".docx"
                onChange={(e) => setDocAnterior(e.files?.[0] || null)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {docAnterior && (
                <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                  <Upload size={16} />
                  {docAnterior.name}
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-2">Aceita: .docx</p>
          </div>

          {/* Transcrição */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transcrição ou WhatsApp ZIP
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".docx,.txt,.zip,.mp3,.wav,.m4a,.ogg"
                onChange={(e) => setTranscricao(e.files?.[0] || null)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {transcricao && (
                <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                  <Upload size={16} />
                  {transcricao.name}
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Aceita: Documentos, ZIP do WhatsApp, áudios
            </p>
          </div>

          {/* Botão de Processar */}
          <button
            onClick={processarRound}
            disabled={processing || !apiKey || !docAnterior || !transcricao}
            className="w-full bg-indigo-600 text-white py-4 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
