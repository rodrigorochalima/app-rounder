import { useState, useEffect, useRef } from 'react';
import { ProcessadorRound, RegraAprendida } from '../lib/ai-service-v2';
import { DocxGenerator } from '../lib/docx-generator';
import { roundRulesAPI } from '../lib/api';
import mammoth from 'mammoth';
import { Mic, MicOff, Upload, Download, History, BookOpen, Trash2, X, Brain, CheckCircle } from 'lucide-react';
import Header from '../components/Header/Header';
import UserProfile from '../components/UserProfile/UserProfile';
import APIManager from '../components/APIManager/APIManager';
import RulesPanel from '../components/RulesPanel/RulesPanel';
import UniversalInputArea from '../components/UniversalInput/UniversalInputArea';
import ClinicalContextPanel from '../components/ClinicalContext/ClinicalContextPanel';

export default function RoundCerebrasGemini() {
  // Estados de configuração
  const [cerebrasKey, setCerebrasKey] = useState('');
  const [deepseekKey, setDeepseekKey] = useState('');
  const [groqKey, setGroqKey] = useState('');

  // Estados de documentos
  const [docAnterior, setDocAnterior] = useState<File | null>(null);

  // Estados de transcrição universal (texto ou arquivo)
  const [transcricaoTexto, setTranscricaoTexto] = useState<string>('');
  const [transcricaoFileName, setTranscricaoFileName] = useState<string>('');
  const [transcricaoAudio, setTranscricaoAudio] = useState<File | null>(null);

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
  const [historico, setHistorico] = useState<any[]>([]);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  // Estados de gravação de áudio
  const [gravando, setGravando] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Estados de modais
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [mostrarConfigAPIs, setMostrarConfigAPIs] = useState(false);
  const [mostrarContexto, setMostrarContexto] = useState(false);

  // Carregar API Keys do localStorage
  useEffect(() => {
    const savedCerebras = localStorage.getItem('cerebras_api_key');
    const savedDeepSeek = localStorage.getItem('deepseek_api_key');
    const savedGroq = localStorage.getItem('groq_api_key');
    if (savedCerebras) setCerebrasKey(savedCerebras);
    if (savedDeepSeek) setDeepseekKey(savedDeepSeek);
    if (savedGroq) setGroqKey(savedGroq);
    carregarRegras();
    carregarHistorico();
  }, []);

  const carregarRegras = async () => {
    try {
      const data = await roundRulesAPI.list();
      setRegrasAprendidas((data.rules || []) as any[]);
    } catch (e) {
      console.error('Erro ao carregar regras:', e);
    }
  };

  const carregarHistorico = async () => {
    setCarregandoHistorico(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/rounds/history?limit=20', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistorico(data);
      }
    } catch (e) {
      console.error('Erro ao carregar histórico:', e);
    } finally {
      setCarregandoHistorico(false);
    }
  };

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
  const temTranscricao = transcricaoTexto.length > 10 || transcricaoAudio !== null;
  const podeProcessar = cerebrasKey.length > 10 && deepseekKey.length > 10 && groqKey.length > 10 && docAnterior !== null && temTranscricao;

  // Ler arquivo .docx
  const lerDocx = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  // Handler para texto pronto da UniversalInputArea
  const handleTranscricaoTexto = (text: string, sourceName: string) => {
    setTranscricaoTexto(text);
    setTranscricaoFileName(sourceName);
    setTranscricaoAudio(null);
  };

  // Handler para arquivo de áudio da UniversalInputArea
  const handleTranscricaoAudio = (file: File) => {
    setTranscricaoAudio(file);
    setTranscricaoTexto('');
    setTranscricaoFileName(file.name);
  };

  // Limpar transcrição
  const limparTranscricao = () => {
    setTranscricaoTexto('');
    setTranscricaoFileName('');
    setTranscricaoAudio(null);
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

      // Buscar contexto RAG clínico
      let contextoClinco = '';
      try {
        const token = localStorage.getItem('access_token');
        const ragRes = await fetch('/api/clinical/rag-context', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (ragRes.ok) {
          const ragData = await ragRes.json();
          if (ragData.active_patients?.length > 0 || ragData.pending_items?.length > 0) {
            setMensagemProgresso('🧠 Carregando contexto clínico dos pacientes...');
            contextoClinco = buildRagContext(ragData);
          }
        }
      } catch (e) {
        console.warn('Contexto RAG não disponível:', e);
      }

      let resultado: string;

      if (transcricaoAudio) {
        // Processamento com áudio
        resultado = await processador.processarComAudio(
          textoDocAnterior,
          transcricaoAudio,
          (prog, msg) => {
            setProgresso(prog);
            setMensagemProgresso(msg);
          }
        );
      } else {
        // Processamento com texto (colado, digitado ou de arquivo)
        const textoFinal = contextoClinco
          ? `[CONTEXTO CLÍNICO DOS PACIENTES - USE PARA RASTREAR PENDÊNCIAS E EVOLUÇÃO]\n${contextoClinco}\n\n[TRANSCRIÇÃO DO ROUND DE HOJE]\n${transcricaoTexto}`
          : transcricaoTexto;

        resultado = await processador.processar(
          textoDocAnterior,
          textoFinal,
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

      // Salvar no histórico
      try {
        const token = localStorage.getItem('access_token');
        const today = new Date().toISOString().split('T')[0];
        const roundName = `Round ${today.split('-').reverse().join('').slice(0, 6)}`;
        await fetch('/api/rounds/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            round_date: today,
            round_name: roundName,
            transcription_text: transcricaoTexto.slice(0, 5000),
            generated_document: resultado,
            raw_input_text: transcricaoTexto.slice(0, 2000),
            llm_provider: 'cerebras+deepseek+groq',
            tokens_used: Math.round(resultado.length / 4)
          })
        });
        carregarHistorico();
      } catch (e) {
        console.warn('Erro ao salvar histórico:', e);
      }

      // Ingerir transcrição no índice RAG para contexto futuro
      try {
        const token = localStorage.getItem('access_token');
        if (transcricaoTexto.length > 50) {
          setMensagemProgresso('🧠 Indexando transcrição no RAG...');
          await fetch('/api/rag/ingest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              text: transcricaoTexto,
              source_type: 'round_transcription',
              source_date: new Date().toISOString().split('T')[0],
              metadata: { generated_document_preview: resultado.slice(0, 500) }
            })
          });
        }
      } catch (e) {
        console.warn('Ingestão RAG não crítica:', e);
      }
      // Baixar automaticamente
      setTimeout(() => baixarDocx(resultado), 500);
    } catch (error: any) {
      setErro(`Erro no processamento: ${error.message}`);
      setProgresso(0);
    } finally {
      setProcessando(false);
    }
  };

  // Construir contexto RAG para injetar no prompt
  const buildRagContext = (ragData: any): string => {
    let ctx = '';
    if (ragData.active_patients?.length > 0) {
      ctx += 'PACIENTES ATIVOS:\n';
      for (const p of ragData.active_patients) {
        ctx += `- Leito ${p.bed_number}: ${p.patient_name || 'Sem nome'} | Diagnóstico: ${p.main_diagnosis || '-'} | Status: ${p.current_status || '-'}`;
        if (p.pending_exams) ctx += ` | PENDÊNCIAS: ${p.pending_exams}`;
        if (p.active_antibiotics) ctx += ` | ATB: ${p.active_antibiotics}`;
        ctx += '\n';
      }
    }
    if (ragData.pending_items?.length > 0) {
      ctx += '\nITENS PENDENTES:\n';
      for (const item of ragData.pending_items) {
        ctx += `- Leito ${item.bed_number}: [${item.item_type.toUpperCase()}] ${item.description} (desde ${item.requested_date})\n`;
      }
    }
    return ctx;
  };

  // Baixar documento .docx com dados reais do médico e instituição
  const baixarDocx = async (doc?: string) => {
    const docToDownload = doc || documentoGerado;
    if (!docToDownload) return;
    try {
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };

      // Buscar perfil do médico
      let doctorOpts: any = {};
      try {
        const drRes = await fetch('/api/doctor-profile', { headers });
        if (drRes.ok) {
          const dr = await drRes.json();
          if (dr) {
            doctorOpts = {
              doctorName: dr.full_name,
              doctorCrm: dr.crm,
              doctorCrmState: dr.crm_state,
              doctorSpecialty: dr.specialty,
              doctorRqe: dr.rqe,
              doctorPhone: dr.phone,
              doctorEmail: dr.email,
              doctorSignatureBase64: dr.signature_base64,
              doctorFooterText: dr.footer_text,
              showDoctorCrm: dr.show_crm,
              showDoctorSpecialty: dr.show_specialty,
              showDoctorPhone: dr.show_phone,
              showDoctorEmail: dr.show_email,
            };
          }
        }
      } catch (_) {}

      // Buscar instituição padrão
      let instOpts: any = {};
      try {
        const instRes = await fetch('/api/institutions', { headers });
        if (instRes.ok) {
          const insts = await instRes.json();
          const defaultInst = insts.find((i: any) => i.is_default) || insts[0];
          if (defaultInst) {
            instOpts = {
              instituicao: defaultInst.name,
              institutionLogoBase64: defaultInst.logo_base64,
              institutionHeaderColor: defaultInst.header_color,
              institutionHeaderTextColor: defaultInst.header_text_color,
              institutionCity: defaultInst.city,
              institutionState: defaultInst.state,
            };
          }
        }
      } catch (_) {}

      const nomeArquivo = DocxGenerator.gerarNomeArquivo('Round');
      await DocxGenerator.gerar(
        docToDownload,
        nomeArquivo,
        {
          titulo: 'Round de Hoje',
          data: new Date().toLocaleDateString('pt-BR', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          }),
          ...instOpts,
          ...doctorOpts,
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
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
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
    setMensagemProgresso('✅ Feedback registrado!');
    setAudioBlob(null);
    setTimeout(() => carregarRegras(), 1000);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #A8D8EA 0%, #5B9BD5 100%)',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <Header />

        {/* Card Principal */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          {/* Aviso sobre APIs */}
          {(!cerebrasKey || !deepseekKey || !groqKey) && (
            <div style={{
              background: '#FFF3CD', border: '1px solid #FFE69C', borderRadius: '8px',
              padding: '14px 16px', marginBottom: '24px',
              display: 'flex', alignItems: 'center', gap: '12px'
            }}>
              <span style={{ fontSize: '22px' }}>⚠️</span>
              <div>
                <p style={{ margin: '0 0 2px 0', fontWeight: '600', color: '#856404', fontSize: '14px' }}>
                  Configure suas API Keys
                </p>
                <p style={{ margin: 0, fontSize: '13px', color: '#856404' }}>
                  Clique no botão "🔑 APIs" no topo da página para configurar suas chaves de API gratuitas.
                </p>
              </div>
            </div>
          )}

          {/* Botão Contexto Clínico RAG */}
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={() => setMostrarContexto(true)}
              style={{
                width: '100%', padding: '12px 16px',
                background: 'linear-gradient(135deg, #6C3483 0%, #9B59B6 100%)',
                color: 'white', border: 'none', borderRadius: '10px',
                cursor: 'pointer', fontWeight: '600', fontSize: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: '0 4px 12px rgba(108, 52, 131, 0.3)'
              }}
            >
              <Brain size={18} />
              🧠 Contexto Clínico dos Pacientes (RAG)
              <span style={{
                background: 'rgba(255,255,255,0.2)', borderRadius: '12px',
                padding: '2px 8px', fontSize: '11px', marginLeft: '4px'
              }}>
                Memória entre rounds
              </span>
            </button>
          </div>

          {/* Upload de Documentos */}
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#2C3E50', marginBottom: '16px' }}>
              📄 Documentos
            </h2>

            {/* Documento Anterior */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#2C3E50', marginBottom: '6px' }}>
                Documento do Round Anterior
              </label>
              {docAnterior ? (
                <div style={{
                  border: '2px solid #27AE60', borderRadius: '10px', padding: '12px 14px',
                  background: '#F0FFF4', display: 'flex', alignItems: 'center', gap: '10px'
                }}>
                  <CheckCircle size={18} color="#27AE60" />
                  <span style={{ flex: 1, fontSize: '13px', color: '#27AE60', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {docAnterior.name}
                  </span>
                  <button onClick={() => setDocAnterior(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    border: '2px dashed #5B9BD5', borderRadius: '10px', padding: '18px',
                    textAlign: 'center', background: '#F8FCFF', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.background = '#E8F4FF'; }}
                  onDragLeave={(e) => { e.currentTarget.style.background = '#F8FCFF'; }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.background = '#F8FCFF';
                    const file = e.dataTransfer.files[0];
                    if (file) setDocAnterior(file);
                  }}
                  onClick={() => document.getElementById('docAnterior')?.click()}
                >
                  <Upload size={26} color="#5B9BD5" style={{ marginBottom: '6px' }} />
                  <p style={{ margin: '0 0 2px 0', color: '#2C3E50', fontWeight: '500', fontSize: '14px' }}>
                    Clique ou arraste o arquivo .docx
                  </p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#888' }}>Aceita: .docx</p>
                  <input
                    id="docAnterior" type="file" accept=".docx" style={{ display: 'none' }}
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) setDocAnterior(file); }}
                  />
                </div>
              )}
            </div>

            {/* Transcrição Universal */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#2C3E50', marginBottom: '6px' }}>
                Transcrição ou Áudio do Dia
              </label>
              <UniversalInputArea
                onTextReady={handleTranscricaoTexto}
                onFileReady={handleTranscricaoAudio}
                currentValue={transcricaoTexto}
                currentFileName={transcricaoFileName}
                onClear={limparTranscricao}
              />
            </div>
          </div>

          {/* Barra de progresso */}
          {processando && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: '#666' }}>{mensagemProgresso}</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#5B9BD5' }}>{progresso}%</span>
              </div>
              <div style={{ height: '8px', background: '#E0E0E0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${progresso}%`,
                  background: 'linear-gradient(90deg, #5B9BD5, #9B59B6)',
                  borderRadius: '4px', transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )}

          {/* Erro */}
          {erro && (
            <div style={{
              background: '#FFF0F0', border: '1px solid #FFCDD2', borderRadius: '8px',
              padding: '12px 16px', marginBottom: '20px', color: '#E53935', fontSize: '14px'
            }}>
              ❌ {erro}
            </div>
          )}

          {/* Sucesso */}
          {sucesso && !processando && (
            <div style={{
              background: '#F0FFF4', border: '2px solid #8BC34A', borderRadius: '8px',
              padding: '14px 16px', marginBottom: '20px', textAlign: 'center'
            }}>
              <strong style={{ color: '#2E7D32' }}>✅ Round gerado com sucesso!</strong>
              <br />
              <small style={{ color: '#555' }}>O download do arquivo .docx iniciou automaticamente.</small>
              <br />
              <button
                onClick={() => baixarDocx()}
                style={{
                  marginTop: '8px', padding: '8px 16px', background: '#2E7D32',
                  color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer',
                  fontSize: '13px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px'
                }}
              >
                <Download size={14} /> Baixar novamente
              </button>
            </div>
          )}

          {/* Botão Gerar */}
          <button
            onClick={processarRound}
            disabled={!podeProcessar || processando}
            style={{
              width: '100%', padding: '16px', fontSize: '17px', fontWeight: '600',
              color: 'white',
              background: podeProcessar && !processando
                ? 'linear-gradient(135deg, #5B9BD5 0%, #2C3E50 100%)'
                : '#CCCCCC',
              border: 'none', borderRadius: '12px',
              cursor: podeProcessar && !processando ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s',
              boxShadow: podeProcessar && !processando ? '0 4px 12px rgba(91, 155, 213, 0.3)' : 'none',
              marginBottom: '8px'
            }}
          >
            {processando ? `⏳ Processando... ${progresso}%` : '🚀 Gerar Round de Hoje'}
          </button>

          {!podeProcessar && !processando && (
            <p style={{ textAlign: 'center', fontSize: '12px', color: '#999', margin: '4px 0 0 0' }}>
              {!cerebrasKey || !deepseekKey || !groqKey
                ? 'Configure as API Keys para habilitar a geração'
                : !docAnterior
                  ? 'Adicione o documento do round anterior'
                  : 'Adicione a transcrição ou áudio do dia'}
            </p>
          )}
        </div>

        {/* Botões de Ação */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px', marginBottom: '20px'
        }}>
          <button
            onClick={gravando ? pararGravacao : iniciarGravacao}
            style={{
              padding: '14px', fontSize: '14px', fontWeight: '600', color: 'white',
              background: gravando
                ? 'linear-gradient(135deg, #F44336 0%, #D32F2F 100%)'
                : 'linear-gradient(135deg, #F4A582 0%, #E57373 100%)',
              border: 'none', borderRadius: '10px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: '0 4px 12px rgba(244, 165, 130, 0.3)'
            }}
          >
            {gravando ? <MicOff size={18} /> : <Mic size={18} />}
            {gravando ? 'Parar Gravação' : 'Gravar Feedback'}
          </button>

          <button
            onClick={() => { setMostrarHistorico(!mostrarHistorico); if (!mostrarHistorico) carregarHistorico(); }}
            style={{
              padding: '14px', fontSize: '14px', fontWeight: '600', color: '#2C3E50',
              background: 'white', border: '2px solid #5B9BD5', borderRadius: '10px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            <History size={18} />
            Histórico ({historico.length})
          </button>

          <button
            onClick={() => setMostrarRegras(!mostrarRegras)}
            style={{
              padding: '14px', fontSize: '14px', fontWeight: '600', color: '#2C3E50',
              background: 'white', border: '2px solid #5B9BD5', borderRadius: '10px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            <BookOpen size={18} />
            Regras ({regrasAprendidas.length})
          </button>
        </div>

        {/* Preview de Áudio Gravado */}
        {audioBlob && (
          <div style={{
            background: 'white', borderRadius: '12px', padding: '20px',
            marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#2C3E50' }}>🎤 Feedback Gravado</h3>
            <audio controls src={URL.createObjectURL(audioBlob)} style={{ width: '100%', marginBottom: '16px' }} />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={enviarFeedback}
                style={{
                  flex: 1, padding: '10px', fontSize: '14px', fontWeight: '600', color: 'white',
                  background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
                  border: 'none', borderRadius: '8px', cursor: 'pointer'
                }}
              >
                📤 Enviar Feedback
              </button>
              <button
                onClick={() => setAudioBlob(null)}
                style={{
                  padding: '10px 16px', fontSize: '14px', color: '#F44336',
                  background: 'white', border: '2px solid #F44336', borderRadius: '8px', cursor: 'pointer'
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
            background: 'white', borderRadius: '12px', padding: '24px',
            marginBottom: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#2C3E50' }}>📊 Histórico de Rounds</h3>
              <button onClick={() => setMostrarHistorico(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={22} color="#666" />
              </button>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {carregandoHistorico ? (
                <p style={{ color: '#666', textAlign: 'center' }}>Carregando...</p>
              ) : historico.length === 0 ? (
                <p style={{ color: '#666', textAlign: 'center' }}>Nenhum round gerado ainda.</p>
              ) : (
                historico.map((item) => (
                  <div key={item.id} style={{
                    padding: '12px 14px', border: '1px solid #E0E0E0', borderRadius: '8px',
                    marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#2C3E50', fontSize: '14px' }}>{item.round_name || 'Round'}</div>
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                        {new Date(item.round_date).toLocaleDateString('pt-BR')} • {item.llm_provider || 'IA'}
                      </div>
                      {item.preview && (
                        <div style={{ fontSize: '11px', color: '#AAA', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '400px' }}>
                          {item.preview.slice(0, 80)}...
                        </div>
                      )}
                    </div>
                    <button
                      onClick={async () => {
                        const token = localStorage.getItem('access_token');
                        const res = await fetch(`/api/rounds/history/${item.id}`, { headers: { Authorization: `Bearer ${token}` } });
                        if (res.ok) {
                          const full = await res.json();
                          if (full.generated_document) {
                            setDocumentoGerado(full.generated_document);
                            baixarDocx(full.generated_document);
                          }
                        }
                      }}
                      style={{
                        padding: '6px 12px', background: '#5B9BD5', color: 'white',
                        border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
                        display: 'flex', alignItems: 'center', gap: '4px'
                      }}
                    >
                      <Download size={12} /> Baixar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Modal Regras */}
        {mostrarRegras && (
          <div style={{
            background: 'white', borderRadius: '12px', padding: '24px',
            marginBottom: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#2C3E50' }}>📚 Regras Aprendidas</h3>
              <button onClick={() => setMostrarRegras(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={22} color="#666" />
              </button>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {regrasAprendidas.length === 0 ? (
                <p style={{ color: '#666', textAlign: 'center' }}>Nenhuma regra aprendida ainda.</p>
              ) : (
                regrasAprendidas.map((regra) => (
                  <div key={regra.id} style={{
                    padding: '12px', border: '1px solid #E0E0E0', borderRadius: '8px', marginBottom: '8px'
                  }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', background: '#5B9BD5',
                      color: 'white', borderRadius: '4px', fontSize: '11px', fontWeight: '600', marginBottom: '6px'
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
                ))
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', color: '#2C3E50', fontSize: '13px', opacity: 0.7, marginTop: '32px' }}>
          <p style={{ margin: '0 0 4px 0', fontWeight: 500 }}>Nexo Soluções Digitais</p>
          <p style={{ margin: 0, fontSize: '12px' }}>App Rounder • Gerador Inteligente de Rounds Médicos</p>
        </div>
      </div>

      {/* Modais */}
      {mostrarPerfil && <UserProfile onClose={() => setMostrarPerfil(false)} />}
      {mostrarConfigAPIs && <APIManager onClose={() => setMostrarConfigAPIs(false)} />}
      {mostrarContexto && <ClinicalContextPanel onClose={() => setMostrarContexto(false)} />}
    </div>
  );
}
