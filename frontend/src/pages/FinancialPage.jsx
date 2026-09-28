import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { DollarSign, ArrowDownCircle, ArrowUpCircle, Filter, Calendar, Plus, CheckCircle, AlertTriangle, Search, Trash2 } from 'lucide-react';
import './FinancialPage.css';

const FinancialPage = () => {
    const [entries, setEntries] = useState([]);
    const [activeTab, setActiveTab] = useState('payable'); // payable or receivable
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [stats, setStats] = useState({ totalPending: 0, totalPaid: 0, overDue: 0 });

    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        due_date: new Date().toISOString().split('T')[0],
        type: 'payable',
        category: 'Outros'
    });

    const fetchEntries = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/financial?type=${activeTab}`);
            setEntries(response.data);
            calculateStats(response.data);
        } catch (error) {
            console.error('Error fetching financial entries:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (data) => {
        const today = new Date().toISOString().split('T')[0];
        const pending = data.filter(e => e.status === 'pending').reduce((sum, e) => sum + parseFloat(e.amount), 0);
        const paid = data.filter(e => e.status === 'paid').reduce((sum, e) => sum + parseFloat(e.amount), 0);
        const over = data.filter(e => e.status === 'pending' && e.due_date < today).reduce((sum, e) => sum + parseFloat(e.amount), 0);
        setStats({ totalPending: pending, totalPaid: paid, overDue: over });
    };

    // Reports State
    const [reportType, setReportType] = useState('dre'); // 'dre' | 'delinquency' | 'payment_methods' | 'general'
    const [reportStartDate, setReportStartDate] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    });
    const [reportEndDate, setReportEndDate] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    });
    const [reportStatus, setReportStatus] = useState('all');
    const [reportCategory, setReportCategory] = useState('all');
    const [reportPaymentMethod, setReportPaymentMethod] = useState('all');
    const [reportData, setReportData] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);

    const fetchFinancialReports = async () => {
        setReportLoading(true);
        try {
            const response = await api.get('/financial/reports', {
                params: {
                    report_type: reportType,
                    start_date: reportStartDate,
                    end_date: reportEndDate,
                    status: reportStatus,
                    category: reportCategory,
                    payment_method: reportPaymentMethod
                }
            });
            setReportData(response.data);
        } catch (error) {
            console.error('Erro ao gerar relatório financeiro:', error);
        } finally {
            setReportLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'reports') {
            fetchFinancialReports();
        } else {
            fetchEntries();
        }
    }, [activeTab, reportType]);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/financial', { ...formData, type: activeTab });
            setShowModal(false);
            fetchEntries();
            setFormData({ ...formData, description: '', amount: '' });
        } catch (error) {
            alert('Erro ao criar lançamento');
        }
    };

    const handlePay = async (id) => {
        if (!window.confirm('Marcar este lançamento como PAGO?')) return;
        try {
            await api.patch(`/financial/${id}/status`, { status: 'paid' });
            fetchEntries();
        } catch (error) {
            alert('Erro ao atualizar status');
        }
    };

    const getStatusBadge = (entry) => {
        const today = new Date().toISOString().split('T')[0];
        if (entry.status === 'paid') return <span className="status-badge paid">Pago</span>;
        if (entry.due_date < today) return <span className="status-badge overdue">Atrasado</span>;
        return <span className="status-badge pending">Pendente</span>;
    };

    return (
        <div className="financial-container">
            <header className="page-header">
                <div className="header-title">
                    <DollarSign size={24} className="title-icon" />
                    <h1>Gestão Financeira</h1>
                </div>
                <button className="btn btn-primary btn-icon" onClick={() => setShowModal(true)}>
                    <Plus size={18} /> Novo Lançamento
                </button>
            </header>

            <div className="financial-stats glass">
                <div className="f-stat">
                    <span>Total {activeTab === 'payable' ? 'a Pagar' : 'a Receber'}</span>
                    <strong>R$ {stats.totalPending.toFixed(2)}</strong>
                </div>
                <div className="f-stat">
                    <span>Total {activeTab === 'payable' ? 'Pago' : 'Recebido'}</span>
                    <strong className="success-text">R$ {stats.totalPaid.toFixed(2)}</strong>
                </div>
                <div className="f-stat overdue">
                    <span>Total em Atraso</span>
                    <strong className="danger-text">R$ {stats.overDue.toFixed(2)}</strong>
                </div>
            </div>

            <div className="tabs-navigation glass">
                <button 
                    className={`tab-btn ${activeTab === 'payable' ? 'active' : ''}`}
                    onClick={() => setActiveTab('payable')}
                >
                    <ArrowDownCircle size={18} /> Contas a Pagar (Saídas)
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'receivable' ? 'active' : ''}`}
                    onClick={() => setActiveTab('receivable')}
                >
                    <ArrowUpCircle size={18} /> Contas a Receber (Entradas)
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
                    onClick={() => setActiveTab('reports')}
                >
                    <Filter size={18} /> 📊 Relatórios Financeiros Diversos & DRE
                </button>
            </div>

            {activeTab === 'reports' ? (
                <div className="reports-section">
                    {/* Filter Controls Bar */}
                    <div className="filter-controls-card glass p-3 mb-4" style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
                        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat( auto-fit, minmax(180px, 1fr) )', gap: '12px' }}>
                            <div className="form-group">
                                <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>Tipo de Relatório</label>
                                <select value={reportType} onChange={e => setReportType(e.target.value)} style={{ padding: '8px', borderRadius: '6px' }}>
                                    <option value="dre">DRE Gerencial (Demonstrativo de Resultado)</option>
                                    <option value="delinquency">Inadimplência / Contas a Receber Vencidas</option>
                                    <option value="payment_methods">Vendas por Forma de Pagamento</option>
                                    <option value="general">Lançamentos Gerais com Filtros</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>Data Inicial</label>
                                <input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} style={{ padding: '8px', borderRadius: '6px' }} />
                            </div>
                            <div className="form-group">
                                <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>Data Final</label>
                                <input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} style={{ padding: '8px', borderRadius: '6px' }} />
                            </div>
                            {reportType === 'general' && (
                                <>
                                    <div className="form-group">
                                        <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>Status</label>
                                        <select value={reportStatus} onChange={e => setReportStatus(e.target.value)} style={{ padding: '8px', borderRadius: '6px' }}>
                                            <option value="all">Todos os Status</option>
                                            <option value="pending">Pendentes</option>
                                            <option value="paid">Pagos / Recebidos</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>Categoria</label>
                                        <select value={reportCategory} onChange={e => setReportCategory(e.target.value)} style={{ padding: '8px', borderRadius: '6px' }}>
                                            <option value="all">Todas as Categorias</option>
                                            <option value="Fornecedor">Fornecedor</option>
                                            <option value="Aluguel">Aluguel</option>
                                            <option value="Salário">Salário</option>
                                            <option value="Impostos">Impostos</option>
                                            <option value="Marketing">Marketing</option>
                                            <option value="Venda Convênio">Venda Convênio</option>
                                            <option value="Outros">Outros</option>
                                        </select>
                                    </div>
                                </>
                            )}
                            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                                <button className="btn btn-primary" style={{ width: '100%' }} onClick={fetchFinancialReports} disabled={reportLoading}>
                                    <Search size={16} /> {reportLoading ? 'Gerando...' : 'Aplicar Filtros'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Report Content Output */}
                    {reportData && reportData.report_type === reportType && (
                        <div className="report-results-card glass p-4" style={{ padding: '20px', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h2>
                                    {reportType === 'dre' && 'DRE Gerencial - Demonstrativo do Resultado do Exercício'}
                                    {reportType === 'delinquency' && 'Relatório de Inadimplência & Contas a Receber Vencidas'}
                                    {reportType === 'payment_methods' && 'Relatório de Vendas por Formas de Pagamento'}
                                    {reportType === 'general' && 'Relatório Geral de Lançamentos Financeiros'}
                                </h2>
                                <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
                                    Imprimir / Salvar PDF
                                </button>
                            </div>

                            {/* DRE GERENCIAL VIEW */}
                            {reportType === 'dre' && reportData.dre && (
                                <div className="dre-container" style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '24px', borderRadius: '12px' }}>
                                    <div className="dre-line" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                        <span>(+) Receita Bruta de Vendas</span>
                                        <strong>R$ {Number(reportData.dre.gross_revenue || 0).toFixed(2)}</strong>
                                    </div>
                                    <div className="dre-line text-warning" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#f59e0b' }}>
                                        <span>(-) Descontos Concedidos</span>
                                        <span>- R$ {Number(reportData.dre.discounts || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="dre-line fw-bold" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '2px solid rgba(255,255,255,0.2)', fontSize: '1.1rem' }}>
                                        <span>(=) Receita Líquida</span>
                                        <span style={{ color: '#10b981' }}>R$ {Number(reportData.dre.net_revenue || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="dre-line" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#ef4444' }}>
                                        <span>(-) Custo dos Produtos Vendidos (CMV)</span>
                                        <span>- R$ {Number(reportData.dre.cmv || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="dre-line fw-bold" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '2px solid rgba(255,255,255,0.2)', fontSize: '1.1rem' }}>
                                        <span>(=) Lucro Bruto (Margem: {reportData.dre.gross_margin_pct || 0}%)</span>
                                        <span style={{ color: '#3b82f6' }}>R$ {Number(reportData.dre.gross_profit || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="dre-line" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#f59e0b' }}>
                                        <span>(-) Despesas Operacionais Pagas</span>
                                        <span>- R$ {Number(reportData.dre.operating_expenses || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="dre-line fw-bold p-3 mt-3" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', borderRadius: '8px', background: Number(reportData.dre.net_profit || 0) >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', fontSize: '1.3rem', marginTop: '16px' }}>
                                        <span>(=) RESULTADO LÍQUIDO DO PERÍODO</span>
                                        <span style={{ color: Number(reportData.dre.net_profit || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                                            R$ {Number(reportData.dre.net_profit || 0).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* DELINQUENCY VIEW */}
                            {reportType === 'delinquency' && (
                                <div>
                                    <div className="kpi-card glass p-3 mb-3 text-center" style={{ borderLeft: '4px solid #ef4444', padding: '16px', marginBottom: '16px' }}>
                                        <span style={{ color: '#94a3b8', fontSize: '12px' }}>Total de Títulos em Atraso</span>
                                        <h2 style={{ color: '#ef4444', margin: '4px 0', fontSize: '24px' }}>R$ {Number(reportData.total_overdue || 0).toFixed(2)}</h2>
                                        <small style={{ color: '#64748b' }}>{reportData.count || 0} título(s) pendente(s) vencido(s)</small>
                                    </div>
                                    <table className="custom-table">
                                        <thead>
                                            <tr>
                                                <th>Vencimento</th>
                                                <th>Cliente / Devedor</th>
                                                <th>Descrição</th>
                                                <th>Categoria</th>
                                                <th>Valor Vencido</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(reportData.entries || []).map(e => (
                                                <tr key={e.id}>
                                                    <td style={{ color: '#ef4444', fontWeight: 'bold' }}>{new Date(e.due_date).toLocaleDateString('pt-BR')}</td>
                                                    <td><strong>{e.customer ? e.customer.name : 'N/A'}</strong></td>
                                                    <td>{e.description}</td>
                                                    <td><span className="category-tag">{e.category}</span></td>
                                                    <td style={{ color: '#ef4444', fontWeight: 'bold' }}>R$ {Number(e.amount).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* PAYMENT METHODS VIEW */}
                            {reportType === 'payment_methods' && (
                                <div>
                                    <div className="kpi-grid mb-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                                        {(reportData.methods || []).map(m => (
                                            <div key={m.method} className="kpi-card glass p-3 text-center" style={{ padding: '16px', borderRadius: '8px' }}>
                                                <span style={{ textTransform: 'uppercase', fontSize: '11px', color: '#94a3b8' }}>{m.method}</span>
                                                <h3 style={{ color: '#10b981', margin: '4px 0' }}>R$ {Number(m.total || 0).toFixed(2)}</h3>
                                                <small style={{ color: '#64748b' }}>{m.count || 0} venda(s)</small>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* GENERAL REPORT VIEW */}
                            {reportType === 'general' && (
                                <div>
                                    <div style={{ marginBottom: '12px' }}>
                                        <strong>Total Filtrado: R$ {Number(reportData.total_amount || 0).toFixed(2)} ({reportData.count || 0} lançamentos)</strong>
                                    </div>
                                    <table className="custom-table">
                                        <thead>
                                            <tr>
                                                <th>Vencimento</th>
                                                <th>Descrição</th>
                                                <th>Entidade</th>
                                                <th>Categoria</th>
                                                <th>Valor</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(reportData.entries || []).map(e => (
                                                <tr key={e.id}>
                                                    <td>{new Date(e.due_date).toLocaleDateString('pt-BR')}</td>
                                                    <td>{e.description}</td>
                                                    <td>{e.supplier?.name || e.customer?.name || 'N/A'}</td>
                                                    <td><span className="category-tag">{e.category}</span></td>
                                                    <td className="fw-bold">R$ {Number(e.amount).toFixed(2)}</td>
                                                    <td>{getStatusBadge(e)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="table-container glass">
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th>Vencimento</th>
                                <th>Descrição</th>
                                <th>Categoria</th>
                                <th>Valor</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className="text-center">Carregando...</td></tr>
                            ) : entries.map(entry => (
                                <tr key={entry.id} className={entry.status === 'paid' ? 'row-paid' : ''}>
                                    <td>
                                        <div className="date-cell">
                                            <Calendar size={14} />
                                            {new Date(entry.due_date).toLocaleDateString('pt-BR')}
                                        </div>
                                    </td>
                                    <td>
                                        <strong>{entry.description}</strong>
                                        {entry.supplier && <small style={{display:'block'}}>{entry.supplier.name}</small>}
                                        {entry.customer && <small style={{display:'block'}}>{entry.customer.name}</small>}
                                    </td>
                                    <td><span className="category-tag">{entry.category}</span></td>
                                    <td><strong>R$ {parseFloat(entry.amount).toFixed(2)}</strong></td>
                                    <td>{getStatusBadge(entry)}</td>
                                    <td>
                                        {entry.status === 'pending' && (
                                            <button className="btn-small success" onClick={() => handlePay(entry.id)}>
                                                <CheckCircle size={16} /> Baixar
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {entries.length === 0 && (
                                <tr><td colSpan="6" className="text-center empty-msg">Nenhum lançamento encontrado para esta categoria.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content glass">
                        <h2>Novo Lançamento ({activeTab === 'payable' ? 'A Pagar' : 'A Receber'})</h2>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label>Descrição</label>
                                <input 
                                    type="text" 
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                    required 
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Valor (R$)</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={formData.amount}
                                        onChange={e => setFormData({...formData, amount: e.target.value})}
                                        required 
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Vencimento</label>
                                    <input 
                                        type="date"
                                        value={formData.due_date}
                                        onChange={e => setFormData({...formData, due_date: e.target.value})}
                                        required 
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Categoria</label>
                                <select 
                                    value={formData.category}
                                    onChange={e => setFormData({...formData, category: e.target.value})}
                                >
                                    <option value="Outros">Outros</option>
                                    <option value="Fornecedor">Fornecedor</option>
                                    <option value="Aluguel">Aluguel</option>
                                    <option value="Salário">Salário</option>
                                    <option value="Impostos">Impostos</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Venda Convênio">Venda Convênio</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Salvar Lançamento</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinancialPage;
