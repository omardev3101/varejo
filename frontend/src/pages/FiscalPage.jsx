import React, { useState, useEffect } from 'react';
import { 
    FileText, Download, Calendar, Search, ShieldCheck, RotateCcw, 
    AlertTriangle, CheckCircle2, RefreshCw, Printer, X
} from 'lucide-react';
import api from '../services/api';
import FiscalReceipt from '../components/FiscalReceipt';
import './FiscalPage.css';

const FiscalPage = () => {
    const [activeTab, setActiveTab] = useState('notes'); // 'notes' | 'export'
    const [notesList, setNotesList] = useState([]);
    const [summary, setSummary] = useState({
        total_count: 0,
        emitted_count: 0,
        contingency_count: 0,
        draft_count: 0,
        total_amount: 0
    });
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [receiptData, setReceiptData] = useState(null);
    const [loadingReceiptId, setLoadingReceiptId] = useState(null);

    // Export XML State
    const [startDate, setStartDate] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    });

    const [endDate, setEndDate] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    });

    const fetchNotes = async () => {
        setLoading(true);
        try {
            const response = await api.get('/fiscal/notes');
            setNotesList(response.data.notes || []);
            setSummary(response.data.summary || {});
        } catch (error) {
            console.error('Erro ao buscar notas fiscais:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotes();
    }, []);

    const handleSyncAllContingencies = async () => {
        if (summary.contingency_count === 0) {
            alert('Não há notas pendentes de transmissão em contingência.');
            return;
        }

        setSyncing(true);
        try {
            const response = await api.post('/fiscal/sync-contingency');
            alert(response.data.message || 'Sincronização concluída com sucesso!');
            fetchNotes();
        } catch (error) {
            alert(error.response?.data?.error || 'Erro ao sincronizar contingências.');
        } finally {
            setSyncing(false);
        }
    };

    const handleSyncSingleNote = async (note) => {
        setSyncing(true);
        try {
            if (note.ref_type === 'return') {
                await api.post(`/returns/${note.origin_id}/sync-contingency`);
            } else {
                await api.post('/fiscal/sync-contingency');
            }
            alert('Nota Fiscal transmitida e autorizada com sucesso na SEFAZ!');
            fetchNotes();
        } catch (error) {
            alert(error.response?.data?.error || 'Erro ao transmitir nota para a SEFAZ.');
        } finally {
            setSyncing(false);
        }
    };

    const handleExport = () => {
        if (!startDate || !endDate) {
            alert('Por favor, selecione as datas de início e fim.');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            alert('A data de início não pode ser maior que a data de fim.');
            return;
        }
        
        const url = `${api.defaults.baseURL}/fiscal/export?start=${startDate}&end=${endDate}`;
        window.open(url, '_blank');
    };

    const handlePrintReceipt = async (note) => {
        setLoadingReceiptId(note.id);
        try {
            const res = await api.get(`/fiscal/${note.id}/data`);
            setReceiptData(res.data);
        } catch (err) {
            console.error('Erro ao buscar dados do cupom:', err);
            // Fallback object
            setReceiptData({
                id: note.id,
                fiscal_key: note.fiscal_key,
                fiscal_protocol: note.fiscal_protocol,
                fiscal_status: note.fiscal_status,
                total_amount: note.total_amount,
                final_amount: note.total_amount,
                createdAt: note.createdAt
            });
        } finally {
            setLoadingReceiptId(null);
        }
    };

    const filteredNotes = notesList.filter(note => {
        if (filterStatus === 'emitted' && note.fiscal_status !== 'emitted') return false;
        if (filterStatus === 'contingency' && note.fiscal_status !== 'contingency') return false;
        if (filterStatus === 'cancelled' && note.fiscal_status !== 'cancelled') return false;
        if (filterStatus === 'draft' && note.fiscal_status !== 'draft' && note.fiscal_status !== 'none') return false;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const key = note.fiscal_key?.toLowerCase() || '';
            const dest = note.destination?.toLowerCase() || '';
            const type = note.doc_type?.toLowerCase() || '';
            return key.includes(term) || dest.includes(term) || type.includes(term) || note.id.toString().includes(term);
        }
        return true;
    });

    return (
        <div className="fiscal-page-container page-wrapper">
            <header className="page-header">
                <div className="header-title">
                    <FileText size={28} className="title-icon text-primary" />
                    <div>
                        <h1>Central de Notas Fiscais & Contingência SEFAZ</h1>
                        <p className="subtitle">Monitoramento de emissões, sincronização de contingências e exportação de XMLs</p>
                    </div>
                </div>
                <div className="header-actions">
                    <button 
                        className="btn btn-secondary"
                        onClick={fetchNotes}
                        disabled={loading}
                        title="Atualizar lista de notas"
                    >
                        <RefreshCw size={18} className={loading ? 'spin' : ''} /> Atualizar
                    </button>
                    {summary.contingency_count > 0 && (
                        <button 
                            className="btn btn-warning shadow-warning"
                            onClick={handleSyncAllContingencies}
                            disabled={syncing}
                        >
                            <RefreshCw size={18} className={syncing ? 'spin' : ''} /> 
                            Sincronizar {summary.contingency_count} Notas em Contingência
                        </button>
                    )}
                    <button 
                        className={`btn ${activeTab === 'notes' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setActiveTab('notes')}
                    >
                        <FileText size={18} /> Painel de Notas
                    </button>
                    <button 
                        className={`btn ${activeTab === 'export' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setActiveTab('export')}
                    >
                        <Download size={18} /> Exportar XMLs
                    </button>
                </div>
            </header>

            {/* KPI Cards */}
            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <div className="kpi-card glass">
                    <div className="kpi-info">
                        <span>Total de Notas Ativas</span>
                        <h2>{summary.active_count || (summary.total_count - (summary.cancelled_count || 0))}</h2>
                        <p className="kpi-sub">Acumulado R$ {Number(summary.total_amount || 0).toFixed(2)}</p>
                    </div>
                    <FileText size={32} className="text-primary opacity-80" />
                </div>

                <div className="kpi-card glass">
                    <div className="kpi-info">
                        <span>Homologadas SEFAZ</span>
                        <h2 className="text-success">{summary.emitted_count || 0}</h2>
                        <p className="kpi-sub text-success">Autorizadas com sucesso</p>
                    </div>
                    <CheckCircle2 size={32} className="text-success opacity-80" />
                </div>

                <div className={`kpi-card glass ${summary.contingency_count > 0 ? 'kpi-warning-alert' : ''}`}>
                    <div className="kpi-info">
                        <span>⚡ Em Contingência</span>
                        <h2 className="text-warning">{summary.contingency_count || 0}</h2>
                        <p className="kpi-sub text-warning">
                            {summary.contingency_count > 0 ? 'Pendente de sincronização' : 'Nenhuma pendente'}
                        </p>
                    </div>
                    <AlertTriangle size={32} className="text-warning opacity-80" />
                </div>

                <div className="kpi-card glass" style={{ borderLeft: '4px solid #ef4444' }}>
                    <div className="kpi-info">
                        <span>🚫 Canceladas SEFAZ</span>
                        <h2 style={{ color: '#ef4444' }}>{summary.cancelled_count || 0}</h2>
                        <p className="kpi-sub" style={{ color: '#f87171' }}>
                            R$ {Number(summary.cancelled_amount || 0).toFixed(2)} estornados
                        </p>
                    </div>
                    <X size={32} style={{ color: '#ef4444', opacity: 0.8 }} />
                </div>

                <div className="kpi-card glass">
                    <div className="kpi-info">
                        <span>Rascunhos / Pendentes</span>
                        <h2 className="text-muted">{summary.draft_count || 0}</h2>
                        <p className="kpi-sub">Aguardando emissão</p>
                    </div>
                    <ShieldCheck size={32} className="text-muted opacity-80" />
                </div>
            </div>

            {activeTab === 'notes' ? (
                <>
                    {/* Filters Bar */}
                    <div className="filters-card glass">
                        <div className="search-box">
                            <Search size={18} />
                            <input 
                                type="text"
                                placeholder="Buscar por ID, Tipo, Destinatário ou Chave de Acesso (44 dígitos)..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="filter-tabs">
                            <button 
                                className={`tab-btn ${filterStatus === 'all' ? 'active' : ''}`}
                                onClick={() => setFilterStatus('all')}
                            >
                                Todas ({notesList.length})
                            </button>
                            <button 
                                className={`tab-btn ${filterStatus === 'emitted' ? 'active' : ''}`}
                                onClick={() => setFilterStatus('emitted')}
                            >
                                Homologadas ({summary.emitted_count || 0})
                            </button>
                            <button 
                                className={`tab-btn ${filterStatus === 'contingency' ? 'active' : ''}`}
                                onClick={() => setFilterStatus('contingency')}
                            >
                                ⚡ Contingência ({summary.contingency_count || 0})
                            </button>
                            <button 
                                className={`tab-btn ${filterStatus === 'cancelled' ? 'active cancelled-active' : ''}`}
                                onClick={() => setFilterStatus('cancelled')}
                            >
                                🚫 Canceladas ({summary.cancelled_count || 0})
                            </button>
                            <button 
                                className={`tab-btn ${filterStatus === 'draft' ? 'active' : ''}`}
                                onClick={() => setFilterStatus('draft')}
                            >
                                Rascunhos ({summary.draft_count || 0})
                            </button>
                        </div>
                    </div>

                    {/* Notes Table */}
                    <div className="table-card glass">
                        {loading ? (
                            <div className="loading-state">Carregando Notas Fiscais...</div>
                        ) : filteredNotes.length === 0 ? (
                            <div className="empty-state">
                                <FileText size={48} className="empty-icon" />
                                <p>Nenhuma nota fiscal encontrada.</p>
                            </div>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th># Doc / Modelo</th>
                                        <th>Tipo de Nota</th>
                                        <th>Data / Hora</th>
                                        <th>Destinatário / Origem</th>
                                        <th>Valor Total</th>
                                        <th>Chave de Acesso</th>
                                        <th>Status SEFAZ</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredNotes.map((note) => (
                                        <tr key={`${note.ref_type}-${note.id}`}>
                                            <td className="fw-bold">
                                                #{note.id} <span className="badge badge-info ms-1">Mod. {note.model}</span>
                                            </td>
                                            <td><strong>{note.doc_type}</strong></td>
                                            <td>{new Date(note.createdAt).toLocaleString('pt-BR')}</td>
                                            <td>{note.destination}</td>
                                            <td className="fw-bold text-success">
                                                R$ {Number(note.total_amount).toFixed(2)}
                                            </td>
                                            <td>
                                                {note.fiscal_key ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <code className="fiscal-key-code" title={note.fiscal_key}>
                                                            {note.fiscal_key.replace(/(.{4})/g, '$1 ').trim()}
                                                        </code>
                                                        <button 
                                                            className="btn-icon btn-sm" 
                                                            title="Copiar Chave de Acesso"
                                                            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(note.fiscal_key.replace(/\D/g, ''));
                                                                alert('Chave de Acesso copiada para a área de transferência!');
                                                            }}
                                                        >
                                                            📋
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted">Não gerada</span>
                                                )}
                                            </td>
                                            <td>
                                                <span 
                                                    className={`badge ${
                                                        note.fiscal_status === 'emitted' ? 'badge-success' : 
                                                        note.fiscal_status === 'contingency' ? 'badge-warning' : 
                                                        note.fiscal_status === 'cancelled' ? 'badge-danger' : 'badge-secondary'
                                                    }`}
                                                    style={note.fiscal_status === 'cancelled' ? { backgroundColor: '#ef4444', color: '#ffffff', fontWeight: 'bold' } : {}}
                                                >
                                                    {note.fiscal_status === 'emitted' ? 'SEFAZ Homologada' : 
                                                     note.fiscal_status === 'contingency' ? '⚡ Contingência' : 
                                                     note.fiscal_status === 'cancelled' ? '🚫 Cancelada SEFAZ' : 'Rascunho'}
                                                </span>
                                                {note.fiscal_status === 'cancelled' && (
                                                    <div style={{ fontSize: '10px', color: '#f87171', marginTop: '3px', fontWeight: '500' }}>
                                                        {note.cancellation_protocol ? `Prot. Canc: ${note.cancellation_protocol}` : 'Cancelada / Estornada'}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <div className="action-buttons" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                    <button 
                                                        className="btn-action btn-sm btn-outline-primary"
                                                        onClick={() => handlePrintReceipt(note)}
                                                        disabled={loadingReceiptId === note.id}
                                                        title="Reimprimir Cupom / Nota Fiscal"
                                                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '4px', fontSize: '0.78rem', cursor: 'pointer' }}
                                                    >
                                                        <Printer size={14} className={loadingReceiptId === note.id ? 'spin' : ''} /> Reimprimir
                                                    </button>
                                                    {note.fiscal_status === 'contingency' && (
                                                        <button 
                                                            className="btn-action btn-sm btn-outline-success"
                                                            onClick={() => handleSyncSingleNote(note)}
                                                            disabled={syncing}
                                                            title="Transmitir nota pendente para a SEFAZ"
                                                            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '4px', fontSize: '0.78rem', cursor: 'pointer' }}
                                                        >
                                                            <RefreshCw size={14} className={syncing ? 'spin' : ''} /> Transmitir
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            ) : (
                /* Export XML Card */
                <div className="fiscal-content">
                    <div className="export-card glass">
                        <h3>Exportar XMLs de Notas & Cupons</h3>
                        <p className="export-desc">
                            Gera um arquivo .zip contendo todos os cupons fiscais emitidos (NFC-e) e notas de devolução/entrada (NF-e) para envio à Contabilidade.
                        </p>

                        <div className="form-group-row">
                            <div className="form-group">
                                <label>Data de Início</label>
                                <div className="input-with-icon">
                                    <Calendar size={18} className="input-icon" />
                                    <input 
                                        type="date" 
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="month-input"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Data de Fim</label>
                                <div className="input-with-icon">
                                    <Calendar size={18} className="input-icon" />
                                    <input 
                                        type="date" 
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="month-input"
                                    />
                                </div>
                            </div>
                        </div>

                        <button className="export-btn" onClick={handleExport}>
                            <Download size={20} />
                            Gerar e Baixar Pacote XML (.ZIP)
                        </button>
                    </div>
                </div>
            )}

            {/* Fiscal Receipt Re-print Modal */}
            {receiptData && (
                <FiscalReceipt 
                    data={receiptData} 
                    onClose={() => setReceiptData(null)} 
                />
            )}
        </div>
    );
};

export default FiscalPage;
