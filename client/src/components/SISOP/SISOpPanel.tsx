import { useState, useEffect } from 'react';
import { Settings, RefreshCw, Download, Trash2, X, CheckCircle, AlertCircle, Clock, Database, Package, Shield } from 'lucide-react';
import './SISOpPanel.css';

interface Version {
  component: string;
  installed_version: string;
  latest_version: string | null;
  update_available: boolean;
  last_checked: string | null;
  update_url: string | null;
  changelog: string | null;
}

interface Backup {
  id: string;
  backup_date: string;
  total_chunks: number;
  total_size_bytes: number;
  filename: string | null;
  status: string;
}

interface RAGStats {
  total_chunks: number;
  total_days: number;
  total_chars: number;
  oldest_date: string | null;
  newest_date: string | null;
  chunks_with_embedding: number;
}

interface Props { onClose: () => void; }

export function SISOpPanel({ onClose }: Props) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [ragStats, setRagStats] = useState<RAGStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'versions' | 'rag' | 'backups'>('versions');
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearDays, setClearDays] = useState(60);
  const token = localStorage.getItem('access_token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [vRes, bRes, rRes] = await Promise.all([
        fetch('/api/sisop/versions', { headers }),
        fetch('/api/sisop/backups', { headers }),
        fetch('/api/rag/index', { headers }),
      ]);
      if (vRes.ok) setVersions(await vRes.json());
      if (bRes.ok) setBackups(await bRes.json());
      if (rRes.ok) { const d = await rRes.json(); setRagStats(d.stats); }
    } catch (_) {}
    setLoading(false);
  }

  async function checkUpdates() {
    setChecking(true);
    try {
      const res = await fetch('/api/sisop/check-updates', { method: 'POST', headers });
      if (res.ok) { const d = await res.json(); setVersions(d.versions); }
    } catch (_) {}
    setChecking(false);
  }

  async function exportBackup() {
    setExporting(true);
    try {
      const res = await fetch('/api/rag/backup', { headers });
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rag-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        await loadAll();
      }
    } catch (_) {}
    setExporting(false);
  }

  async function clearOldData() {
    try {
      await fetch('/api/rag/index', { method: 'DELETE', headers, body: JSON.stringify({ days_older_than: clearDays }) });
      setConfirmClear(false);
      await loadAll();
    } catch (_) {}
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  function formatDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR');
  }

  return (
    <div className="sisop-overlay">
      <div className="sisop-modal">
        <div className="sisop-header">
          <div className="sisop-header-title"><Settings size={20} /><h2>SISOP — Sistema Operacional</h2></div>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="sisop-tabs">
          <button className={activeTab === 'versions' ? 'sisop-tab active' : 'sisop-tab'} onClick={() => setActiveTab('versions')}>
            <Package size={14} /> Versões
            {versions.some(v => v.update_available) && <span className="sisop-badge-alert">!</span>}
          </button>
          <button className={activeTab === 'rag' ? 'sisop-tab active' : 'sisop-tab'} onClick={() => setActiveTab('rag')}>
            <Database size={14} /> Índice RAG
          </button>
          <button className={activeTab === 'backups' ? 'sisop-tab active' : 'sisop-tab'} onClick={() => setActiveTab('backups')}>
            <Shield size={14} /> Backups
          </button>
        </div>

        <div className="sisop-body">
          {loading ? (
            <div className="sisop-loading">Carregando...</div>
          ) : activeTab === 'versions' ? (
            <div className="sisop-versions">
              <div className="sisop-section-header">
                <p className="sisop-desc">Versões instaladas dos componentes do sistema. Verifique atualizações regularmente para manter o melhor desempenho e segurança.</p>
                <button className="sisop-btn-check" onClick={checkUpdates} disabled={checking}>
                  <RefreshCw size={14} className={checking ? 'sisop-spin' : ''} />
                  {checking ? 'Verificando...' : 'Verificar Atualizações'}
                </button>
              </div>
              <div className="sisop-version-list">
                {versions.map(v => (
                  <div key={v.component} className={`sisop-version-item ${v.update_available ? 'sisop-update-available' : ''}`}>
                    <div className="sisop-version-icon">
                      {v.update_available
                        ? <AlertCircle size={20} color="#f59e0b" />
                        : <CheckCircle size={20} color="#22c55e" />}
                    </div>
                    <div className="sisop-version-info">
                      <div className="sisop-version-name">{v.component}</div>
                      <div className="sisop-version-nums">
                        <span>Instalado: <strong>v{v.installed_version}</strong></span>
                        {v.latest_version && <span>Disponível: <strong>v{v.latest_version}</strong></span>}
                        {v.last_checked && <span><Clock size={10} /> Verificado: {formatDate(v.last_checked)}</span>}
                      </div>
                      {v.update_available && v.changelog && (
                        <div className="sisop-changelog">
                          <strong>Novidades:</strong> {v.changelog.slice(0, 200)}{v.changelog.length > 200 ? '...' : ''}
                        </div>
                      )}
                    </div>
                    <div className="sisop-version-actions">
                      {v.update_available && v.update_url && (
                        <a href={v.update_url} target="_blank" rel="noreferrer" className="sisop-btn-update">
                          Atualizar
                        </a>
                      )}
                      {!v.update_available && <span className="sisop-badge-ok">Atualizado</span>}
                    </div>
                  </div>
                ))}
                {versions.length === 0 && (
                  <div className="sisop-empty">Clique em "Verificar Atualizações" para carregar as versões.</div>
                )}
              </div>
            </div>
          ) : activeTab === 'rag' ? (
            <div className="sisop-rag">
              {ragStats && (
                <div className="sisop-rag-stats">
                  <div className="sisop-stat-card">
                    <div className="sisop-stat-value">{ragStats.total_chunks}</div>
                    <div className="sisop-stat-label">Chunks indexados</div>
                  </div>
                  <div className="sisop-stat-card">
                    <div className="sisop-stat-value">{ragStats.total_days}</div>
                    <div className="sisop-stat-label">Dias com dados</div>
                  </div>
                  <div className="sisop-stat-card">
                    <div className="sisop-stat-value">{formatBytes(ragStats.total_chars || 0)}</div>
                    <div className="sisop-stat-label">Texto indexado</div>
                  </div>
                  <div className="sisop-stat-card">
                    <div className="sisop-stat-value">{ragStats.chunks_with_embedding}</div>
                    <div className="sisop-stat-label">Com embedding vetorial</div>
                  </div>
                </div>
              )}
              {ragStats && (
                <div className="sisop-rag-range">
                  <span>Período: {formatDate(ragStats.oldest_date)} até {formatDate(ragStats.newest_date)}</span>
                </div>
              )}
              <div className="sisop-rag-info">
                <div className="sisop-info-title"><Database size={14} /> Motor RAG: pgvector + Google Gemini Embeddings</div>
                <div className="sisop-info-items">
                  <div className="sisop-info-item"><CheckCircle size={12} color="#22c55e" /> pgvector ativo no Neon PostgreSQL</div>
                  <div className="sisop-info-item"><CheckCircle size={12} color="#22c55e" /> Chunking automático por leito/paciente</div>
                  <div className="sisop-info-item"><CheckCircle size={12} color="#22c55e" /> Busca semântica vetorial (quando Gemini API disponível)</div>
                  <div className="sisop-info-item"><CheckCircle size={12} color="#22c55e" /> Fallback para busca por texto (sem API key)</div>
                  <div className="sisop-info-item"><CheckCircle size={12} color="#22c55e" /> Expiração automática após 60 dias</div>
                  <div className="sisop-info-item"><CheckCircle size={12} color="#22c55e" /> Backup exportável a qualquer momento</div>
                </div>
              </div>
              <div className="sisop-rag-clear">
                <div className="sisop-clear-title"><Trash2 size={14} /> Limpeza do Índice</div>
                <p className="sisop-clear-desc">Remove chunks com mais de X dias. O sistema já faz isso automaticamente a cada ingestão, mas você pode forçar manualmente.</p>
                {!confirmClear ? (
                  <div className="sisop-clear-row">
                    <label>Remover dados com mais de</label>
                    <input type="number" min={7} max={365} value={clearDays} onChange={e => setClearDays(parseInt(e.target.value))} />
                    <label>dias</label>
                    <button className="sisop-btn-danger" onClick={() => setConfirmClear(true)}>Limpar</button>
                  </div>
                ) : (
                  <div className="sisop-confirm-row">
                    <span>Confirmar remoção de dados com mais de {clearDays} dias?</span>
                    <button className="sisop-btn-danger" onClick={clearOldData}>Confirmar</button>
                    <button className="sisop-btn-cancel" onClick={() => setConfirmClear(false)}>Cancelar</button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="sisop-backups">
              <div className="sisop-section-header">
                <p className="sisop-desc">Exporte o índice RAG completo como arquivo JSON. O backup inclui todos os chunks de texto indexados, metadados e histórico de rounds.</p>
                <button className="sisop-btn-export" onClick={exportBackup} disabled={exporting}>
                  <Download size={14} />
                  {exporting ? 'Exportando...' : 'Exportar Backup Agora'}
                </button>
              </div>
              <div className="sisop-backup-list">
                <div className="sisop-backup-header">
                  <span>Data</span><span>Chunks</span><span>Tamanho</span><span>Status</span>
                </div>
                {backups.map(b => (
                  <div key={b.id} className="sisop-backup-row">
                    <span>{formatDate(b.backup_date)}</span>
                    <span>{b.total_chunks} chunks</span>
                    <span>{formatBytes(b.total_size_bytes)}</span>
                    <span className={`sisop-status sisop-status-${b.status}`}>{b.status}</span>
                  </div>
                ))}
                {backups.length === 0 && (
                  <div className="sisop-empty">Nenhum backup registrado. Exporte o primeiro backup acima.</div>
                )}
              </div>
              <div className="sisop-backup-note">
                <Shield size={13} /> Os backups são exportados como arquivos JSON locais. Guarde em local seguro (Google Drive, iCloud, etc.).
              </div>
            </div>
          )}
        </div>

        <div className="sisop-footer">
          <button className="sisop-btn-close" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}
