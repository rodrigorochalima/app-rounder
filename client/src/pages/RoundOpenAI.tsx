import React, { useState, useEffect } from 'react';
import { Upload, Loader2, Download, Trash2, FileText, CheckCircle2, Brain } from 'lucide-react';
import { 
  processarComOpenAI, 
  validarComGroq, 
  transcreverAudio,
  analisarFeedback,
  carregarRegras,
  adicionarRegras,
  limparRegras
} from '../lib/ai-service';
import { AudioRecorder } from '../components/AudioRecorder';
import mammoth from 'mammoth';

const OPENAI_KEY_STORAGE = 'openai_api_key';
const GROQ_KEY_STORAGE = 'groq_api_key';
const HISTORY_STORAGE = 'round_history';

interface HistoryItem {
  id: string;
  filename: string;
  date: string;
  time: string;
  content: string;
}

interface ProcessingStep {
  id: number;
  label: string;
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

export default function RoundOpenAI() {
  // Estados de configuração
  const [openaiKey, setOpenaiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  
  // Estados de arquivos
  const [docAnterior, setDocAnterior] = useState<File | null>(null);
  const [transcricaoFile, setTranscricaoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  
  // Estados de processamento
  const [processing, setProcessing] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('');
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { id: 1, label: 'Lendo arquivos', progress: 0, status: 'pending' },
    { id: 2, label: 'AGENTE 1: OpenAI processando', progress: 0, status: 'pending' },
    { id: 3, label: 'AGENTE 2: Groq validando', progress: 0, status: 'pending' },
    { id: 4, label: 'Gerando arquivo final', progress: 0, status: 'pending' },
  ]);
  
  // Estados de resultado
  const [documentoGerado, setDocumentoGerado] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de feedback
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackProcessing, setFeedbackProcessing] = useState(false);
  const [regrasAprendidas, setRegrasAprendidas] = useState<string[]>([]);
  
  // Estados de histórico
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Carregar configurações e regras
  useEffect(() => {
    const savedOpenAI = localStorage.getItem(OPENAI_KEY_STORAGE);
    const savedGroq = localStorage.getItem(GROQ_KEY_STORAGE);
    const savedHistory = localStorage.getItem(HISTORY_STORAGE);
    
    if (savedOpenAI) setOpenaiKey(savedOpenAI);
    if (savedGroq) setGroqKey(savedGroq);
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Erro ao carregar histórico:', e);
      }
    }
    
    // Carregar regras aprendidas
    const regras = carregarRegras();
    setRegrasAprendidas(regras);
  }, []);

  // Salvar API Keys
  useEffect(() => {
    if (openaiKey && openaiKey.length > 10) {
      localStorage.setItem(OPENAI_KEY_STORAGE, openaiKey);
    }
  }, [openaiKey]);

  useEffect(() => {
    if (groqKey && groqKey.length > 10) {
      localStorage.setItem(GROQ_KEY_STORAGE, groqKey);
    }
  }, [groqKey]);

  const updateProgress = (progress: number, message: string) => {
    setCurrentProgress(progress);
    setCurrentMessage(message);
    
    // Atualizar steps
    setSteps(prev => prev.map(step => {
      if (progress < 20) {
        return step.id === 1 ? { ...step, progress, status: 'processing' } : step;
      } else if (progress < 70) {
        if (step.id === 1) return { ...step, progress: 100, status: 'completed' };
        if (step.id === 2) return { ...step, progress: ((progress - 20) / 50) * 100, status: 'processing' };
        return step;
      } else if (progress < 95) {
        if (step.id === 1) return { ...step, progress: 100, status: 'completed' };
        if (step.id === 2) return { ...step, progress: 100, status: 'completed' };
        if (step.id === 3) return { ...step, progress: ((progress - 70) / 25) * 100, status: 'processing' };
        return step;
      } else {
        if (step.id < 4) return { ...step, progress: 100, status: 'completed' };
        if (step.id === 4) return { ...step, progress: ((progress - 95) / 5) * 100, status: 'processing' };
        return step;
      }
    }));
  };

  const lerDocumento = async (file: File): Promise<string> => {
    if (file.name.endsWith('.docx')) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } else if (file.name.endsWith('.txt')) {
      return await file.text();
    } else {
      throw new Error('Formato de arquivo não suportado');
    }
  };

  const handleGerarRound = async () => {
    if (!docAnterior || (!transcricaoFile && !audioFile)) {
      alert('Por favor, selecione todos os arquivos necessários');
      return;
    }

    setProcessing(true);
    setError(null);
    setDocumentoGerado(null);
    setShowFeedback(false);

    try {
      // Etapa 1: Ler documento anterior
      updateProgress(5, 'Lendo documento anterior...');
      const textoDocAnterior = await lerDocumento(docAnterior);

      // Etapa 2: Processar transcrição
      let textoTranscricao = '';
      
      if (audioFile) {
        updateProgress(10, 'Transcrevendo áudio...');
        textoTranscricao = await transcreverAudio(groqKey, audioFile, updateProgress);
      } else if (transcricaoFile) {
        updateProgress(10, 'Lendo transcrição...');
        textoTranscricao = await lerDocumento(transcricaoFile);
      }

      updateProgress(20, 'Arquivos carregados');

      // Etapa 3: AGENTE 1 - Processar com OpenAI
      updateProgress(30, 'AGENTE 1: Processando com OpenAI...');
      const documentoBruto = await processarComOpenAI(
        openaiKey,
        textoDocAnterior,
        textoTranscricao,
        regrasAprendidas,
        updateProgress
      );

      // Etapa 4: AGENTE 2 - Validar com Groq
      updateProgress(70, 'AGENTE 2: Validando com Groq...');
      const documentoFinal = await validarComGroq(
        groqKey,
        documentoBruto,
        regrasAprendidas,
        updateProgress
      );

      // Etapa 5: Finalizar
      updateProgress(95, 'Gerando arquivo...');
      
      const filename = gerarNomeArquivo();
      setDocumentoGerado(documentoFinal);
      setDownloadFilename(filename);

      // Adicionar ao histórico
      const now = new Date();
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        filename,
        date: now.toLocaleDateString('pt-BR'),
        time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        content: documentoFinal
      };
      
      const newHistory = [newItem, ...history].slice(0, 5);
      setHistory(newHistory);
      localStorage.setItem(HISTORY_STORAGE, JSON.stringify(newHistory));

      updateProgress(100, 'Concluído!');
      
      // Marcar todos os steps como concluídos
      setSteps(prev => prev.map(step => ({ ...step, progress: 100, status: 'completed' })));
      
      // Mostrar interface de feedback após 1 segundo
      setTimeout(() => {
        setShowFeedback(true);
      }, 1000);

    } catch (err: any) {
      console.error('Erro ao processar:', err);
      setError(err.message || 'Erro ao processar documento');
      setSteps(prev => prev.map(step => 
        step.status === 'processing' ? { ...step, status: 'error' } : step
      ));
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFeedbackAudio = async (audioBlob: Blob, audioFile: File) => {
    setFeedbackProcessing(true);
    
    try {
      // Transcrever feedback
      updateProgress(50, 'Transcrevendo feedback...');
      const feedbackTexto = await transcreverAudio(groqKey, audioFile);
      
      // Analisar feedback
      updateProgress(75, 'Analisando feedback...');
      const novasRegras = await analisarFeedback(groqKey, feedbackTexto);
      
      // Salvar regras
      adicionarRegras(novasRegras);
      const regrasAtualizadas = carregarRegras();
      setRegrasAprendidas(regrasAtualizadas);
      
      updateProgress(100, 'Feedback processado!');
      
      alert(`✅ Aprendi ${novasRegras.length} novas regras!\n\n${novasRegras.map((r, i) => `${i + 1}. ${r}`).join('\n')}`);
      
      setShowFeedback(false);
      
    } catch (err: any) {
      alert(`❌ Erro ao processar feedback: ${err.message}`);
    } finally {
      setFeedbackProcessing(false);
    }
  };

  const gerarNomeArquivo = (): string => {
    const now = new Date();
    const dia = now.getDate().toString().padStart(2, '0');
    const mes = (now.getMonth() + 1).toString().padStart(2, '0');
    const ano = now.getFullYear().toString().slice(-2);
    return `Round ${dia}${mes}${ano}.txt`;
  };

  const podeProcessar = openaiKey.length > 10 && groqKey.length > 10 && docAnterior !== null && (transcricaoFile !== null || audioFile !== null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Gerar Round de Hoje</h1>
          <p className="text-gray-600">Sistema com dupla checagem de IA (OpenAI + Groq) e aprendizado contínuo</p>
        </div>

        {/* Configuração de API Keys */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">🔑 Configuração</h2>
          
          <div className="space-y-4">
            {/* OpenAI API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key do OpenAI (ChatGPT) {openaiKey.length > 10 && <span className="text-green-600">✓ Salva</span>}
              </label>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="Cole sua API Key do OpenAI (sk-proj-...)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Obtenha em: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">platform.openai.com/api-keys</a>
              </p>
            </div>

            {/* Groq API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key do Groq {groqKey.length > 10 && <span className="text-green-600">✓ Salva</span>}
              </label>
              <input
                type="password"
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                placeholder="Cole sua API Key do Groq (gsk_...)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Obtenha em: <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">console.groq.com/keys</a> (gratuito)
              </p>
            </div>
          </div>
        </div>

        {/* Upload de Arquivos */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📄 Documentos</h2>
          
          <div className="space-y-4">
            {/* Documento Anterior */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Documento do Round Anterior
              </label>
              <input
                type="file"
                accept=".docx,.txt"
                onChange={(e) => setDocAnterior(e.target.files?.[0] || null)}
                className="w-full"
              />
              {docAnterior && (
                <p className="text-sm text-green-600 mt-1">✓ {docAnterior.name}</p>
              )}
            </div>

            {/* Transcrição ou Áudio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transcrição ou Áudio do Dia
              </label>
              
              <div className="space-y-2">
                <input
                  type="file"
                  accept=".docx,.txt,.mp3,.wav,.m4a,.ogg,.webm"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.type.startsWith('audio/')) {
                        setAudioFile(file);
                        setTranscricaoFile(null);
                      } else {
                        setTranscricaoFile(file);
                        setAudioFile(null);
                      }
                    }
                  }}
                  className="w-full"
                />
                {transcricaoFile && (
                  <p className="text-sm text-green-600">✓ {transcricaoFile.name}</p>
                )}
                {audioFile && (
                  <p className="text-sm text-green-600">✓ {audioFile.name} (será transcrito automaticamente)</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Botão de Gerar */}
        <button
          onClick={handleGerarRound}
          disabled={!podeProcessar || processing}
          className={`w-full py-4 rounded-lg font-semibold text-white text-lg flex items-center justify-center gap-2 mb-6 ${
            podeProcessar && !processing
              ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {processing ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Download className="w-6 h-6" />
              Gerar Round de Hoje
            </>
          )}
        </button>

        {/* Barra de Progresso */}
        {processing && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Processamento em Andamento</h3>
            
            {/* Barra geral */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>{currentMessage}</span>
                <span>{currentProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${currentProgress}%` }}
                />
              </div>
            </div>

            {/* Steps detalhados */}
            <div className="space-y-3">
              {steps.map((step) => (
                <div key={step.id} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step.status === 'completed' ? 'bg-green-500' :
                    step.status === 'processing' ? 'bg-blue-500' :
                    step.status === 'error' ? 'bg-red-500' :
                    'bg-gray-300'
                  }`}>
                    {step.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    ) : step.status === 'processing' ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <span className="text-white text-sm">{step.id}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{step.label}</p>
                    {step.status === 'processing' && (
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${step.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">⚠️ {error}</p>
          </div>
        )}

        {/* Documento Gerado */}
        {documentoGerado && downloadFilename && !showFeedback && (
          <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-green-900 mb-4">✅ Documento Gerado com Sucesso!</h3>
            <button
              onClick={() => handleDownload(documentoGerado, downloadFilename)}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Baixar {downloadFilename}
            </button>
          </div>
        )}

        {/* Interface de Feedback */}
        {showFeedback && documentoGerado && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-600" />
              Como ficou o documento?
            </h2>
            <p className="text-gray-600 mb-4">
              Envie um feedback em áudio (até 10 minutos) para o sistema aprender com suas correções.
            </p>
            
            {!feedbackProcessing ? (
              <AudioRecorder
                onAudioReady={handleFeedbackAudio}
                maxDurationSeconds={600}
              />
            ) : (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-purple-600" />
                <p className="text-gray-600">{currentMessage}</p>
              </div>
            )}
            
            <button
              onClick={() => setShowFeedback(false)}
              className="mt-4 text-gray-600 hover:text-gray-800 text-sm"
            >
              Pular feedback (documento está perfeito)
            </button>
          </div>
        )}

        {/* Regras Aprendidas */}
        {regrasAprendidas.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-600" />
              Regras Aprendidas ({regrasAprendidas.length})
            </h2>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {regrasAprendidas.map((regra, index) => (
                <div key={index} className="flex items-start gap-2 p-2 bg-purple-50 rounded">
                  <CheckCircle2 className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{regra}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                if (confirm('Tem certeza que deseja limpar todas as regras aprendidas?')) {
                  limparRegras();
                  setRegrasAprendidas([]);
                }
              }}
              className="mt-4 text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Limpar regras
            </button>
          </div>
        )}

        {/* Histórico */}
        {history.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">📚 Histórico</h2>
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-sm">{item.filename}</p>
                      <p className="text-xs text-gray-500">{item.date} às {item.time}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(item.content, item.filename)}
                    className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    Baixar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
