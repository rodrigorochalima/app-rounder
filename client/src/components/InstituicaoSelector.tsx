import { useState, useEffect } from 'react';
import { buscarInstituicoes, type Instituicao } from '../lib/supabase';

interface Props {
  onSelect: (instituicao: Instituicao) => void;
  selectedId?: string;
}

export default function InstituicaoSelector({ onSelect, selectedId }: Props) {
  const [instituicoes, setInstituicoes] = useState<Instituicao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarInstituicoes();
  }, []);

  const carregarInstituicoes = async () => {
    setLoading(true);
    const data = await buscarInstituicoes();
    setInstituicoes(data);
    
    // Selecionar padrão automaticamente
    if (!selectedId && data.length > 0) {
      const padrao = data.find(i => i.padrao) || data[0];
      onSelect(padrao);
    }
    
    setLoading(false);
  };

  if (loading) {
    return (
      <div style={{
        padding: '12px',
        textAlign: 'center',
        color: '#666',
        fontSize: '14px'
      }}>
        Carregando instituições...
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{
        display: 'block',
        fontSize: '14px',
        fontWeight: '500',
        color: '#2C3E50',
        marginBottom: '8px'
      }}>
        🏥 Instituição
      </label>
      <select
        value={selectedId || ''}
        onChange={(e) => {
          const inst = instituicoes.find(i => i.id === e.target.value);
          if (inst) onSelect(inst);
        }}
        style={{
          width: '100%',
          padding: '12px 16px',
          fontSize: '14px',
          border: '2px solid #E0E0E0',
          borderRadius: '8px',
          outline: 'none',
          cursor: 'pointer',
          background: 'white'
        }}
      >
        {instituicoes.map(inst => (
          <option key={inst.id} value={inst.id}>
            {inst.nome} {inst.padrao ? '(Padrão)' : ''}
          </option>
        ))}
      </select>
      <div style={{
        marginTop: '8px',
        fontSize: '12px',
        color: '#666'
      }}>
        {instituicoes.find(i => i.id === selectedId)?.numero_leitos || 20} leitos
      </div>
    </div>
  );
}
