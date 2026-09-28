import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Wallet, ArrowUpCircle, ArrowDownCircle, Lock, Unlock, FileText, AlertCircle, History, Printer } from 'lucide-react';
import CashierReceipt from '../components/CashierReceipt';
import ManagerAuthModal from '../components/ManagerAuthModal';
import './CashierPage.css';

const CashierPage = () => {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tenants, setTenants] = useState([]);
    const [selectedTenant, setSelectedTenant] = useState('');
    const [terminals, setTerminals] = useState([]);
    const [selectedTerminal, setSelectedTerminal] = useState('');
    const [openingBalance, setOpeningBalance] = useState('');
    const [transAmount, setTransAmount] = useState('');
    const [transDesc, setTransDesc] = useState('');
    const [transType, setTransType] = useState('withdrawal');
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    
    // Receipt Modal State
    const [receiptData, setReceiptData] = useState(null);
    const [receiptType, setReceiptType] = useState('X');

    const fetchSessionAndTenants = async () => {
        setLoading(true);
        try {
            const [sessionRes, tenantsRes] = await Promise.all([
                api.get('/cashier/active'),
                api.get('/tenants')
            ]);
            setSession(sessionRes.data);
            const tenantList = Array.isArray(tenantsRes.data) ? tenantsRes.data : [];
            setTenants(tenantList);

            let initialTenantId = sessionRes.data?.tenant_id || (tenantList.length > 0 ? tenantList[0].id : '');
            setSelectedTenant(initialTenantId);
            fetchTerminalsForTenant(initialTenantId);
        } catch (error) {
            console.error('Error fetching cashier data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTerminalsForTenant = async (tenantId) => {
        if (!tenantId) return;
        try {
            const terminalsRes = await api.get(`/terminals?tenant_id=${tenantId}`);
            const activeTerms = (terminalsRes.data || []).filter(t => t.status === 'active');
            setTerminals(activeTerms);
            if (activeTerms.length > 0) {
                setSelectedTerminal(activeTerms[0].id);
            } else {
                setSelectedTerminal('');
            }
        } catch (err) {
            console.error('Error fetching terminals for tenant:', err);
        }
    };

    useEffect(() => {
        fetchSessionAndTenants();
    }, []);

    const handleTenantChange = (e) => {
        const newTenantId = e.target.value;
        setSelectedTenant(newTenantId);
        fetchTerminalsForTenant(newTenantId);
    };

    const handleOpenCashier = async (e) => {
        e.preventDefault();
        try {
            if (!selectedTerminal) {
                alert('Selecione um terminal para abrir o caixa.');
                return;
            }
            const response = await api.post('/cashier/open', { 
                opening_balance: parseFloat(openingBalance) || 0,
                terminal_id: selectedTerminal,
                tenant_id: selectedTenant
            });
            setSession(response.data);
            setOpeningBalance('');
        } catch (error) {
            alert(error.response?.data?.error || 'Erro ao abrir caixa');
        }
    };

    const handleTransaction = (e) => {
        e.preventDefault();
        setIsAuthOpen(true);
    };

    const handleTransactionSuccess = async (manager) => {
        setIsAuthOpen(false);
        try {
            const type = transType === 'withdrawal' ? 'withdrawal' : 'addition';
            const actionText = transType === 'withdrawal' ? 'Sangria' : 'Suprimento';
            await api.post(`/cashier/${session.id}/transaction`, {
                type,
                amount: parseFloat(transAmount),
                description: `${transDesc} (${actionText} autorizada por: ${manager.name})`
            });
            setTransAmount('');
            setTransDesc('');
            fetchSessionAndTerminals();
        } catch (error) {
            alert(error.response?.data?.error || 'Erro na transação');
        }
    };

    const handleCloseCashier = async () => {
        const closing = prompt('Digite o valor total contado no caixa para fechamento:');
        if (closing === null) return;

        try {
            await api.post(`/cashier/${session.id}/close`, { closing_balance: parseFloat(closing) });
            
            // Show Redução Z
            setReceiptType('Z');
            setReceiptData({ ...session, closing_balance: parseFloat(closing), closed_at: new Date() });
            
            setSession(null);
        } catch (error) {
            alert(error.response?.data?.error || 'Erro ao fechar caixa');
        }
    };

    if (loading) return <div className="loading-state glass">Carregando informações do caixa...</div>;

    return (
        <div className="cashier-container">
            <header className="page-header">
                <div className="header-title">
                    <Wallet size={24} className="title-icon" />
                    <div>
                        <h1>Administração de Caixa</h1>
                        {session && session.terminal && (
                            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>
                                Operando no <strong>{session.terminal.name}</strong>
                            </p>
                        )}
                    </div>
                </div>
                {session && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary btn-icon" onClick={() => { setReceiptType('X'); setReceiptData(session); }}>
                            <Printer size={18} /> Leitura X
                        </button>
                        <button className="btn btn-danger btn-icon" onClick={handleCloseCashier}>
                            <Lock size={18} /> Fechar Caixa
                        </button>
                    </div>
                )}
            </header>

            {!session ? (
                <div className="open-cashier-card glass">
                    <div className="card-info">
                        <Unlock size={48} color="var(--primary)" />
                        <h2>O caixa está fechado</h2>
                        <p>Informe o saldo inicial para começar as operações do dia.</p>
                    </div>
                    <form onSubmit={handleOpenCashier} className="open-form">
                        {tenants.length > 0 && (
                            <div className="form-group">
                                <label style={{ color: '#10b981', fontWeight: 'bold' }}>Loja / Unidade de Operação</label>
                                <select 
                                    value={selectedTenant} 
                                    onChange={handleTenantChange}
                                    style={{ borderColor: '#10b981', fontWeight: '600' }}
                                    required
                                >
                                    {tenants.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} (CNPJ: {t.cnpj})</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="form-group">
                            <label>Selecione o PDV (Terminal)</label>
                            <select 
                                value={selectedTerminal} 
                                onChange={e => setSelectedTerminal(e.target.value)}
                                required
                            >
                                <option value="" disabled>Escolha um terminal...</option>
                                {terminals.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                            {terminals.length === 0 && (
                                <small style={{ color: '#ef4444', display: 'block', marginTop: '4px' }}>
                                    Nenhum terminal ativo nesta unidade. Um novo PDV será gerado automaticamente ao abrir.
                                </small>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Saldo Inicial (Dinheiro)</label>
                            <div className="input-with-prefix">
                                <span>R$</span>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    placeholder="0,00" 
                                    value={openingBalance}
                                    onChange={e => setOpeningBalance(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary btn-large">Abrir Caixa Agora</button>
                    </form>
                </div>
            ) : (
                <div className="cashier-grid">
                    <div className="main-stats">
                        <div className="stat-card glass highlight">
                            <span>Saldo Atual Estimado</span>
                            <strong>R$ {parseFloat(session.expected_balance).toFixed(2)}</strong>
                            <small>Saldo Inicial: R$ {parseFloat(session.opening_balance).toFixed(2)}</small>
                        </div>

                        <div className="transaction-form glass">
                            <h3>Movimentação Manual (Sangria / Suprimento)</h3>
                            <form onSubmit={handleTransaction}>
                                <div className="type-toggle">
                                    <button 
                                        type="button" 
                                        className={transType === 'addition' ? 'active add' : ''}
                                        onClick={() => setTransType('addition')}
                                    >
                                        <ArrowUpCircle size={18} /> Suprimento
                                    </button>
                                    <button 
                                        type="button" 
                                        className={transType === 'withdrawal' ? 'active sub' : ''}
                                        onClick={() => setTransType('withdrawal')}
                                    >
                                        <ArrowDownCircle size={18} /> Sangria
                                    </button>
                                </div>
                                
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Valor</label>
                                        <input 
                                            type="number" 
                                            step="0.01" 
                                            value={transAmount}
                                            onChange={e => setTransAmount(e.target.value)}
                                            required 
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Descrição / Motivo</label>
                                        <input 
                                            type="text" 
                                            placeholder="Ex: Troco inicial, Retirada p/ lanche..."
                                            value={transDesc}
                                            onChange={e => setTransDesc(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <button type="submit" className="btn btn-secondary">Registrar Movimentação</button>
                            </form>
                        </div>
                    </div>

                    <div className="transaction-history glass">
                        <div className="history-header">
                            <h3>Resumo de Exceções</h3>
                        </div>
                        <div className="history-list" style={{ marginBottom: '16px', display: 'flex', gap: '16px' }}>
                            <div className="stat-card glass" style={{ flex: 1, padding: '12px', background: 'rgba(239, 68, 68, 0.05)' }}>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>Estornos / Cancelamentos</span>
                                <strong style={{ color: '#ef4444' }}>R$ {
                                    session.transactions?.filter(t => t.type === 'cancellation').reduce((acc, t) => acc + parseFloat(t.amount), 0).toFixed(2) || '0.00'
                                }</strong>
                            </div>
                            <div className="stat-card glass" style={{ flex: 1, padding: '12px', background: 'rgba(16, 185, 129, 0.05)' }}>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>Descontos Concedidos</span>
                                <strong style={{ color: '#10b981' }}>R$ {
                                    session.transactions?.filter(t => t.type === 'discount').reduce((acc, t) => acc + parseFloat(t.amount), 0).toFixed(2) || '0.00'
                                }</strong>
                            </div>
                        </div>

                        <div className="history-header">
                            <h3>Histórico da Sessão</h3>
                            <History size={18} />
                        </div>
                        <div className="history-list">
                            {session.transactions?.sort((a,b) => b.id - a.id).map(t => (
                                <div key={t.id} className={`history-item ${t.type}`}>
                                    <div className="t-icon">
                                        {t.type === 'sale' ? <FileText size={16} /> : 
                                         (t.type === 'addition' || t.type === 'inflow' ? <ArrowUpCircle size={16} /> : 
                                         (t.type === 'discount' ? <AlertCircle size={16} /> : <ArrowDownCircle size={16} />))}
                                    </div>
                                    <div className="t-info">
                                        <span className="t-desc">{t.description || t.type}</span>
                                        <span className="t-time">
                                            {new Date(t.createdAt || t.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="t-amount" style={{ color: t.type === 'discount' ? '#10b981' : undefined }}>
                                        {(t.type === 'withdrawal' || t.type === 'outflow' || t.type === 'cancellation' || t.type === 'discount') ? '-' : '+'} R$ {parseFloat(t.amount).toFixed(2)}
                                    </div>
                                  </div>
                              ))}
                            {(!session.transactions || session.transactions.length === 0) && (
                                <p className="empty-msg">Nenhuma movimentação registrada.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {receiptData && (
                <CashierReceipt 
                    data={receiptData} 
                    type={receiptType} 
                    onClose={() => setReceiptData(null)} 
                />
            )}

            <ManagerAuthModal
                isOpen={isAuthOpen}
                onClose={() => setIsAuthOpen(false)}
                onSuccess={handleTransactionSuccess}
                title={`Autorização de ${transType === 'withdrawal' ? 'Sangria' : 'Suprimento'}`}
                description={`A liberação deste ${transType === 'withdrawal' ? 'saque' : 'aporte'} exige a senha de um gerente.`}
            />
        </div>
    );
};

export default CashierPage;
