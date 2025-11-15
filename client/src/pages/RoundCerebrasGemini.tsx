import { useState, useEffect, useRef } from 'react';
import { ProcessadorRound, RegraAprendida } from '../lib/ai-service-v2';
import { DocxGenerator } from '../lib/docx-generator';
import { buscarRegrasAtivas, salvarFeedbackAudio, uploadAudio, buscarHistoricoRecente, type HistoricoRound } from '../lib/supabase';
import mammoth from 'mammoth';
import { Mic, MicOff, Upload, Download, History, BookOpen, Trash2, X } from 'lucide-react';

export default function RoundCerebrasGemini() {
  // Estados de configuração
  const [cerebrasKey, setCerebrasKey] = useState('');
  const [deepseekKey, setDeepseekKey] = useState('');
  const [groqKey, setGroqKey] = useState('');

  // Estados de documentos
  const [docAnterior, setDocAnterior] = useState<File | null>(null);
  const [transcricao, setTranscricao] = useState<File | null>(null);

  // Estados de processamento
  const [processando, setProcessando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [mensagemProgresso, setMensagemProgresso] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  // Estados de resultado
  const [documentoGerado, setDocumentoGerado] = useState('');

  // Estados de aprendizado
  const [regrasAprendidas, setRegrasAprendidas] = useState<RegraAprendida[]>([]);
  const [mostrarRegras, setMostrarRegras] = useState(false);

  // Estados de histórico
  const [historico, setHistorico] = useState<HistoricoRound[]>([]);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);

  // Estados de gravação de áudio
  const [gravando, setGravando] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Carregar API Keys do localStorage (LIMPAR PRIMEIRO)
  useEffect(() => {
    // Limpar API keys antigas que podem estar expiradas
    const ultimaLimpeza = localStorage.getItem('ultima_limpeza_keys');
    const agora = Date.now();
    const umDia = 24 * 60 * 60 * 1000;

    if (!ultimaLimpeza || (agora - parseInt(ultimaLimpeza)) > umDia) {
      // Limpar apenas se passou mais de 1 dia
      localStorage.removeItem('deepseek_api_key');
      localStorage.setItem('ultima_limpeza_keys', agora.toString());
    }

    const savedCerebras = localStorage.getItem('cerebras_api_key');
    const savedDeepSeek = localStorage.getItem('deepseek_api_key');
    const savedGroq = localStorage.getItem('groq_api_key');

    if (savedCerebras) setCerebrasKey(savedCerebras);
    if (savedDeepSeek) setDeepseekKey(savedDeepSeek);
    if (savedGroq) setGroqKey(savedGroq);

    // Carregar regras do Supabase
    carregarRegras();
    carregarHistorico();
  }, []);

  const carregarRegras = async () => {
    const regras = await buscarRegrasAtivas();
    setRegrasAprendidas(regras as any[]);
  };

  const carregarHistorico = async () => {
    const hist = await buscarHistoricoRecente(30);
    setHistorico(hist);
  };

  // Salvar API Keys no localStorage
  const salvarCerebrasKey = (key: string) => {
    setCerebrasKey(key);
    if (key) localStorage.setItem('cerebras_api_key', key);
  };

  const salvarDeepSeekKey = (key: string) => {
    setDeepseekKey(key);
    if (key) localStorage.setItem('deepseek_api_key', key);
  };

  const salvarGroqKey = (key: string) => {
    setGroqKey(key);
    if (key) localStorage.setItem('groq_api_key', key);
  };

  // Verificar se pode processar
  const podeProcessar = cerebrasKey.length > 10 && deepseekKey.length > 10 && groqKey.length > 10 && docAnterior !== null && transcricao !== null;

  // Ler arquivo .docx
  const lerDocx = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  // Processar round
  const processarRound = async () => {
    if (!podeProcessar) return;

    setProcessando(true);
    setErro('');
    setSucesso(false);
    setProgresso(0);
    setDocumentoGerado('');

    try {
      const processador = new ProcessadorRound(cerebrasKey, deepseekKey, groqKey);

      // Ler documento anterior
      setMensagemProgresso('📄 Lendo documento anterior...');
      const textoDocAnterior = await lerDocx(docAnterior!);

      // Verificar se é áudio ou texto
      const isAudio = transcricao!.type.startsWith('audio/');
      let resultado: string;

      if (isAudio) {
        resultado = await processador.processarComAudio(
          textoDocAnterior,
          transcricao!,
          (prog, msg) => {
            setProgresso(prog);
            setMensagemProgresso(msg);
          }
        );
      } else {
        const textoTranscricao = await lerDocx(transcricao!);
        resultado = await processador.processar(
          textoDocAnterior,
          textoTranscricao,
          (prog, msg) => {
            setProgresso(prog);
            setMensagemProgresso(msg);
          }
        );
      }

      setDocumentoGerado(resultado);
      setSucesso(true);
      setProgresso(100);
      setMensagemProgresso('✅ Round gerado com sucesso!');

      // Baixar automaticamente
      setTimeout(() => baixarDocx(), 500);

      // Recarregar histórico
      carregarHistorico();
    } catch (error: any) {
      setErro(`Erro no processamento: ${error.message}`);
      setProgresso(0);
    } finally {
      setProcessando(false);
    }
  };

  // Baixar documento .docx
  const baixarDocx = async () => {
    if (!documentoGerado) return;

    try {
      const nomeArquivo = DocxGenerator.gerarNomeArquivo('Round');
      await DocxGenerator.gerar(
        documentoGerado,
        nomeArquivo,
        {
          titulo: 'Round de Hoje',
          instituicao: 'Hospital Sanador Caneto',
          data: new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        }
      );
    } catch (error: any) {
      setErro(`Erro ao gerar .docx: ${error.message}`);
    }
  };

  // Gravação de áudio
  const iniciarGravacao = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setGravando(true);
    } catch (error: any) {
      setErro(`Erro ao iniciar gravação: ${error.message}`);
    }
  };

  const pararGravacao = () => {
    if (mediaRecorderRef.current && gravando) {
      mediaRecorderRef.current.stop();
      setGravando(false);
    }
  };

  const enviarFeedback = async () => {
    if (!audioBlob) return;

    try {
      setMensagemProgresso('📤 Enviando feedback...');
      const audioUrl = await uploadAudio(audioBlob);
      
      if (audioUrl) {
        await salvarFeedbackAudio(audioUrl);
        setMensagemProgresso('✅ Feedback enviado com sucesso!');
        setAudioBlob(null);
        
        // Recarregar regras após alguns segundos
        setTimeout(() => carregarRegras(), 3000);
      }
    } catch (error: any) {
      setErro(`Erro ao enviar feedback: ${error.message}`);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #A8D8EA 0%, #5B9BD5 100%)',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          <img 
            src="/logo.png" 
            alt="Rounder" 
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '24px',
              marginBottom: '20px',
              boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
            }}
          />
          <h1 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#2C3E50',
            margin: '0 0 10px 0'
          }}>
            App Rounder
          </h1>
          <p style={{
            fontSize: '16px',
            color: '#2C3E50',
            opacity: 0.8
          }}>
            Gerador Inteligente de Rounds Médicos
          </p>
        </div>

        {/* Card Principal */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          {/* API Keys */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#2C3E50',
              marginBottom: '20px'
            }}>
              🔑 API Keys (100% Gratuitas)
            </h2>

            {/* Cerebras */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#2C3E50',
                marginBottom: '8px'
              }}>
                Cerebras API Key ✅
              </label>
              <input
                type="password"
                value={cerebrasKey}
                onChange={(e) => salvarCerebrasKey(e.target.value)}
                placeholder="Cole sua Cerebras API Key aqui..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '14px',
                  border: '2px solid #E0E0E0',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  fontFamily: 'monospace'
                }}
                onFocus={(e) => e.target.style.borderColor = '#5B9BD5'}
                onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
              />
              <a 
                href="https://cerebras.ai" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  fontSize: '12px',
                  color: '#5B9BD5',
                  textDecoration: 'none',
                  marginTop: '4px',
                  display: 'inline-block'
                }}
              >
                Obter em: cerebras.ai (gratuito)
              </a>
            </div>

            {/* DeepSeek */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#2C3E50',
                marginBottom: '8px'
              }}>
                DeepSeek API Key ✅
              </label>
              <input
                type="password"
                value={deepseekKey}
                onChange={(e) => salvarDeepSeekKey(e.target.value)}
                placeholder="Cole sua DeepSeek API Key aqui..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '14px',
                  border: '2px solid #E0E0E0',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  fontFamily: 'monospace'
                }}
                onFocus={(e) => e.target.style.borderColor = '#5B9BD5'}
                onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
              />
              <a 
                href="https://platform.deepseek.com/api_keys" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  fontSize: '12px',
                  color: '#5B9BD5',
                  textDecoration: 'none',
                  marginTop: '4px',
                  display: 'inline-block'
                }}
              >
                Obter em: platform.deepseek.com (gratuito)
              </a>
            </div>

            {/* Groq */}
            <div style={{ marginBottom: '0' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#2C3E50',
                marginBottom: '8px'
              }}>
                Groq API Key ✅
              </label>
              <input
                type="password"
                value={groqKey}
                onChange={(e) => salvarGroqKey(e.target.value)}
                placeholder="Cole sua Groq API Key aqui..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '14px',
                  border: '2px solid #E0E0E0',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  fontFamily: 'monospace'
                }}
                onFocus={(e) => e.target.style.borderColor = '#5B9BD5'}
                onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
              />
              <a 
                href="https://console.groq.com/keys" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  fontSize: '12px',
                  color: '#5B9BD5',
                  textDecoration: 'none',
                  marginTop: '4px',
                  display: 'inline-block'
                }}
              >
                Obter em: console.groq.com/keys (gratuito)
              </a>
            </div>
          </div>

          <div style={{
            height: '1px',
            background: '#E0E0E0',
            margin: '32px 0'
          }} />

          {/* Upload de Documentos */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#2C3E50',
              marginBottom: '20px'
            }}>
              📄 Documentos
            </h2>

            {/* Documento Anterior */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#2C3E50',
                marginBottom: '8px'
              }}>
                Documento do Round Anterior
              </label>
              <div style={{
                border: '2px dashed #5B9BD5',
                borderRadius: '8px',
                padding: '20px',
                textAlign: 'center',
                background: '#F8FCFF',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.style.background = '#E8F4FF';
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.background = '#F8FCFF';
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.background = '#F8FCFF';
                const file = e.dataTransfer.files[0];
                if (file && file.name.endsWith('.docx')) {
                  setDocAnterior(file);
                }
              }}
              onClick={() => document.getElementById('docAnterior')?.click()}
              >
                <Upload size={32} color="#5B9BD5" style={{ marginBottom: '8px' }} />
                <p style={{ margin: '0 0 4px 0', color: '#2C3E50', fontWeight: '500' }}>
                  {docAnterior ? docAnterior.name : 'Clique ou arraste o arquivo .docx'}
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                  Aceita: .docx
                </p>
                <input
                  id="docAnterior"
                  type="file"
                  accept=".docx"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setDocAnterior(file);
                  }}
                />
              </div>
            </div>

            {/* Transcrição ou Áudio */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#2C3E50',
                marginBottom: '8px'
              }}>
                Transcrição ou Áudio do Dia
              </label>
              <div style={{
                border: '2px dashed #F4A582',
                borderRadius: '8px',
                padding: '20px',
                textAlign: 'center',
                background: '#FFF8F5',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.style.background = '#FFE8DD';
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.background = '#FFF8F5';
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.background = '#FFF8F5';
                const file = e.dataTransfer.files[0];
                if (file) {
                  setTranscricao(file);
                }
              }}
              onClick={() => document.getElementById('transcricao')?.click()}
              >
                <Upload size={32} color="#F4A582" style={{ marginBottom: '8px' }} />
                <p style={{ margin: '0 0 4px 0', color: '#2C3E50', fontWeight: '500' }}>
                  {transcricao ? transcricao.name : 'Clique ou arraste o arquivo'}
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                  Aceita: .docx, .txt ou .mp3, .wav, .webm
                </p>
                <input
                  id="transcricao"
                  type="file"
                  accept=".docx,.txt,.mp3,.wav,.webm,.m4a"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setTranscricao(file);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Botão Gerar */}
          <button
            onClick={processarRound}
            disabled={!podeProcessar || processando}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '18px',
              fontWeight: '600',
              color: 'white',
              background: podeProcessar && !processando ? 'linear-gradient(135deg, #5B9BD5 0%, #2C3E50 100%)' : '#CCCCCC',
              border: 'none',
              borderRadius: '12px',
              cursor: podeProcessar && !processando ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s',
              boxShadow: podeProcessar && !processando ? '0 4px 12px rgba(91, 155, 213, 0.3)' : 'none',
              marginBottom: '20px'
            }}
            onMouseEnter={(e) => {
              if (podeProcessar && !processando) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(91, 155, 213, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = podeProcessar && !processando ? '0 4px 12px rgba(91, 155, 213, 0.3)' : 'none';
            }}
          >
            {processando ? '⏳ Processando...' : '📨 Gerar Round de Hoje'}
          </button>

          {/* Barra de Progresso */}
          {processando && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                width: '100%',
                height: '8px',
                background: '#E0E0E0',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${progresso}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #5B9BD5 0%, #F4A582 100%)',
                  transition: 'width 0.3s'
                }} />
              </div>
              <p style={{
                marginTop: '8px',
                fontSize: '14px',
                color: '#2C3E50',
                textAlign: 'center'
              }}>
                {mensagemProgresso}
              </p>
            </div>
          )}

          {/* Mensagem de Erro */}
          {erro && (
            <div style={{
              padding: '16px',
              background: '#FEE',
              border: '2px solid #F88',
              borderRadius: '8px',
              color: '#C00',
              marginBottom: '20px'
            }}>
              <strong>⚠️ Erro no processamento:</strong> {erro}
            </div>
          )}

          {/* Mensagem de Sucesso */}
          {sucesso && (
            <div style={{
              padding: '16px',
              background: '#EFE',
              border: '2px solid #8F8',
              borderRadius: '8px',
              color: '#080',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <strong>✅ Round gerado com sucesso!</strong>
              <br />
              <small>O download do arquivo .docx iniciará automaticamente.</small>
            </div>
          )}
        </div>

        {/* Botões de Ação */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '20px'
        }}>
          {/* Botão Microfone */}
          <button
            onClick={gravando ? pararGravacao : iniciarGravacao}
            style={{
              padding: '16px',
              fontSize: '16px',
              fontWeight: '600',
              color: 'white',
              background: gravando ? 'linear-gradient(135deg, #F44336 0%, #D32F2F 100%)' : 'linear-gradient(135deg, #F4A582 0%, #E57373 100%)',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.3s',
              boxShadow: '0 4px 12px rgba(244, 165, 130, 0.3)'
            }}
          >
            {gravando ? <MicOff size={20} /> : <Mic size={20} />}
            {gravando ? 'Parar Gravação' : 'Gravar Feedback'}
          </button>

          {/* Botão Histórico */}
          <button
            onClick={() => setMostrarHistorico(!mostrarHistorico)}
            style={{
              padding: '16px',
              fontSize: '16px',
              fontWeight: '600',
              color: '#2C3E50',
              background: 'white',
              border: '2px solid #5B9BD5',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.3s'
            }}
          >
            <History size={20} />
            Histórico ({historico.length})
          </button>

          {/* Botão Regras */}
          <button
            onClick={() => setMostrarRegras(!mostrarRegras)}
            style={{
              padding: '16px',
              fontSize: '16px',
              fontWeight: '600',
              color: '#2C3E50',
              background: 'white',
              border: '2px solid #5B9BD5',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.3s'
            }}
          >
            <BookOpen size={20} />
            Regras ({regrasAprendidas.length})
          </button>
        </div>

        {/* Preview de Áudio Gravado */}
        {audioBlob && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#2C3E50' }}>🎤 Feedback Gravado</h3>
            <audio controls src={URL.createObjectURL(audioBlob)} style={{ width: '100%', marginBottom: '16px' }} />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={enviarFeedback}
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'white',
                  background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                📤 Enviar Feedback
              </button>
              <button
                onClick={() => setAudioBlob(null)}
                style={{
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#F44336',
                  background: 'white',
                  border: '2px solid #F44336',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Modal Histórico */}
        {mostrarHistorico && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#2C3E50' }}>📊 Histórico de Rounds</h3>
              <button
                onClick={() => setMostrarHistorico(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={24} color="#666" />
              </button>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {historico.length === 0 ? (
                <p style={{ color: '#666', textAlign: 'center' }}>Nenhum round gerado ainda.</p>
              ) : (
                historico.map((item) => (
                  <div key={item.id} style={{
                    padding: '12px',
                    border: '1px solid #E0E0E0',
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ fontWeight: '600', color: '#2C3E50' }}>{item.nome_arquivo}</div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      {new Date(item.data_geracao).toLocaleString('pt-BR')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Modal Regras */}
        {mostrarRegras && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#2C3E50' }}>📚 Regras Aprendidas</h3>
              <button
                onClick={() => setMostrarRegras(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={24} color="#666" />
              </button>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {regrasAprendidas.length === 0 ? (
                <p style={{ color: '#666', textAlign: 'center' }}>Nenhuma regra aprendida ainda.</p>
              ) : (
                regrasAprendidas.map((regra) => (
                  <div key={regra.id} style={{
                    padding: '12px',
                    border: '1px solid #E0E0E0',
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          background: '#5B9BD5',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          marginBottom: '8px'
                        }}>
                          {regra.tipo.toUpperCase()}
                        </span>
                        <div style={{ color: '#2C3E50', fontSize: '14px' }}>{regra.descricao}</div>
                        {regra.exemplo && (
                          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px', fontStyle: 'italic' }}>
                            Ex: {regra.exemplo}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          color: '#2C3E50',
          fontSize: '14px',
          opacity: 0.7,
          marginTop: '40px'
        }}>
          <p style={{ margin: '0 0 8px 0' }}>
            Powered by Cerebras + DeepSeek + Groq
          </p>
          <p style={{ margin: 0 }}>
            100% Gratuito • Custo: R$ 0,00
          </p>
        </div>
      </div>
    </div>
  );
}
