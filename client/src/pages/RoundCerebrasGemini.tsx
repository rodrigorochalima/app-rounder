import { useState, useEffect } from 'react';
import { ProcessadorRound, RegraAprendida } from '../lib/ai-service-v2';
import { DocxGenerator } from '../lib/docx-generator';
import mammoth from 'mammoth';

export default function RoundCerebrasGemini() {
  // Estados de configuração
  const [cerebrasKey, setCerebrasKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
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

  // Carregar API Keys do localStorage
  useEffect(() => {
    const savedCerebras = localStorage.getItem('cerebras_api_key');
    const savedGemini = localStorage.getItem('gemini_api_key');
    const savedGroq = localStorage.getItem('groq_api_key');

    if (savedCerebras) setCerebrasKey(savedCerebras);
    if (savedGemini) setGeminiKey(savedGemini);
    if (savedGroq) setGroqKey(savedGroq);
  }, []);

  // Salvar API Keys no localStorage
  const salvarCerebrasKey = (key: string) => {
    setCerebrasKey(key);
    localStorage.setItem('cerebras_api_key', key);
  };

  const salvarGeminiKey = (key: string) => {
    setGeminiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

  const salvarGroqKey = (key: string) => {
    setGroqKey(key);
    localStorage.setItem('groq_api_key', key);
  };

  // Verificar se pode processar
  const podeProcessar = cerebrasKey.length > 10 && geminiKey.length > 10 && groqKey.length > 10 && docAnterior !== null && transcricao !== null;

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
      const processador = new ProcessadorRound(cerebrasKey, geminiKey, groqKey);

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

      // Atualizar regras aprendidas
      setRegrasAprendidas(processador.obterRegrasAprendidas());
    } catch (error: any) {
      setErro(error.message);
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

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Cabeçalho */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Gerar Round de Hoje</h1>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Sistema com dupla checagem de IA (Cerebras + Gemini) e aprendizado contínuo
        </p>
      </div>

      {/* Configuração de API Keys */}
      <div style={{ background: '#f9f9f9', padding: '24px', borderRadius: '12px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🔑 Configuração
        </h2>

        {/* Cerebras API Key */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            API Key do Cerebras {cerebrasKey && '✓ Salva'}
          </label>
          <input
            type="password"
            value={cerebrasKey}
            onChange={(e) => salvarCerebrasKey(e.target.value)}
            placeholder="Cole sua API Key do Cerebras (csk-...)"
            style={{
              width: '100%',
              padding: '12px',
              border: '2px dashed #ccc',
              borderRadius: '8px',
              fontSize: '14px',
              background: cerebrasKey ? '#e8f5e9' : 'white'
            }}
          />
          <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            Obtenha em: <a href="https://cloud.cerebras.ai" target="_blank" rel="noopener noreferrer" style={{ color: '#4285f4' }}>cloud.cerebras.ai</a> (gratuito, ilimitado)
          </p>
        </div>

        {/* Gemini API Key */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            API Key do Google Gemini {geminiKey && '✓ Salva'}
          </label>
          <input
            type="password"
            value={geminiKey}
            onChange={(e) => salvarGeminiKey(e.target.value)}
            placeholder="Cole sua API Key do Gemini (AIzaSy...)"
            style={{
              width: '100%',
              padding: '12px',
              border: '2px dashed #ccc',
              borderRadius: '8px',
              fontSize: '14px',
              background: geminiKey ? '#e8f5e9' : 'white'
            }}
          />
          <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            Obtenha em: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: '#4285f4' }}>aistudio.google.com/app/apikey</a> (gratuito)
          </p>
        </div>

        {/* Groq API Key */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            API Key do Groq {groqKey && '✓ Salva'}
          </label>
          <input
            type="password"
            value={groqKey}
            onChange={(e) => salvarGroqKey(e.target.value)}
            placeholder="Cole sua API Key do Groq (gsk_...)"
            style={{
              width: '100%',
              padding: '12px',
              border: '2px dashed #ccc',
              borderRadius: '8px',
              fontSize: '14px',
              background: groqKey ? '#e8f5e9' : 'white'
            }}
          />
          <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            Obtenha em: <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" style={{ color: '#4285f4' }}>console.groq.com/keys</a> (gratuito)
          </p>
        </div>
      </div>

      {/* Documentos */}
      <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e0e0e0', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📄 Documentos
        </h2>

        {/* Documento Anterior */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Documento do Round Anterior
          </label>
          <input
            type="file"
            accept=".docx"
            onChange={(e) => setDocAnterior(e.target.files?.[0] || null)}
            style={{ width: '100%' }}
          />
          {docAnterior && (
            <p style={{ fontSize: '12px', color: '#4caf50', marginTop: '4px' }}>
              ✓ {docAnterior.name}
            </p>
          )}
          <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            Aceita: .docx
          </p>
        </div>

        {/* Transcrição ou Áudio */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Transcrição ou Áudio do Dia
          </label>
          <input
            type="file"
            accept=".docx,.txt,.mp3,.wav,.m4a,.webm"
            onChange={(e) => setTranscricao(e.target.files?.[0] || null)}
            style={{ width: '100%' }}
          />
          {transcricao && (
            <p style={{ fontSize: '12px', color: '#4caf50', marginTop: '4px' }}>
              ✓ {transcricao.name}
            </p>
          )}
          <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            Aceita: Documentos (.docx, .txt) ou Áudios (.mp3, .wav, .m4a, .webm)
          </p>
        </div>
      </div>

      {/* Botão de Processar */}
      <button
        onClick={processarRound}
        disabled={!podeProcessar || processando}
        style={{
          width: '100%',
          padding: '16px',
          fontSize: '18px',
          fontWeight: '600',
          color: 'white',
          background: podeProcessar && !processando ? '#4285f4' : '#ccc',
          border: 'none',
          borderRadius: '12px',
          cursor: podeProcessar && !processando ? 'pointer' : 'not-allowed',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        📥 Gerar Round de Hoje
      </button>

      {/* Barra de Progresso */}
      {processando && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ background: '#f0f0f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '8px' }}>
            <div
              style={{
                width: `${progresso}%`,
                height: '24px',
                background: 'linear-gradient(90deg, #4285f4, #34a853)',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
          <p style={{ textAlign: 'center', fontSize: '14px', color: '#666' }}>
            {mensagemProgresso}
          </p>
        </div>
      )}

      {/* Erro */}
      {erro && (
        <div style={{ background: '#ffebee', border: '1px solid #ef5350', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
          <p style={{ color: '#c62828', margin: 0, fontSize: '14px' }}>
            ⚠️ {erro}
          </p>
        </div>
      )}

      {/* Sucesso + Download */}
      {sucesso && documentoGerado && (
        <div style={{ background: '#e8f5e9', border: '1px solid #4caf50', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
          <p style={{ color: '#2e7d32', marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>
            ✅ Documento processado com sucesso!
          </p>
          <button
            onClick={baixarDocx}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              fontWeight: '600',
              color: 'white',
              background: '#4caf50',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            📥 Baixar {DocxGenerator.gerarNomeArquivo('Round')}
          </button>
        </div>
      )}

      {/* Regras Aprendidas */}
      {regrasAprendidas.length > 0 && (
        <div style={{ background: '#fff3e0', border: '1px solid #ff9800', borderRadius: '8px', padding: '16px' }}>
          <button
            onClick={() => setMostrarRegras(!mostrarRegras)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '16px',
              fontWeight: '600',
              color: '#e65100',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: mostrarRegras ? '12px' : '0'
            }}
          >
            📚 Regras Aprendidas ({regrasAprendidas.length})
            <span>{mostrarRegras ? '▼' : '▶'}</span>
          </button>

          {mostrarRegras && (
            <div style={{ marginTop: '12px' }}>
              {regrasAprendidas.map((regra) => (
                <div key={regra.id} style={{ background: 'white', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                  <p style={{ margin: 0, fontSize: '14px' }}>
                    <strong>[{regra.tipo.toUpperCase()}]</strong> {regra.descricao}
                  </p>
                  {regra.exemplo && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
                      Exemplo: {regra.exemplo}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
