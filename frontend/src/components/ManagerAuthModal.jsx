import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle, X, KeyRound, UserCheck, FileText, Search, ShoppingBag, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import './ManagerAuthModal.css';

const ManagerAuthModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = "Autorização Gerencial Obrigatória", 
    actionDescription = "Para cancelar esta venda/NF-e e estornar os lançamentos, é necessária a validação de um Gerente ou Administrador.",
    saleIdProp = '',
    onSaleIdChange = null,
    showSaleInput = false
}) => {
    const [managers, setManagers] = useState([]);
    const [selectedManagerId, setSelectedManagerId] = useState('');
    const [password, setPassword] = useState('');
    const [reason, setReason] = useState('Desistência / Devolução de Cliente');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Sale preview states
    const [currentSaleId, setCurrentSaleId] = useState(saleIdProp);
    const [saleData, setSaleData] = useState(null);
    const [loadingSale, setLoadingSale] = useState(false);
    const [saleError, setSaleError] = useState(null);

    useEffect(() => {
        setCurrentSaleId(saleIdProp);
    }, [saleIdProp]);

    useEffect(() => {
        if (!isOpen) return;
        const fetchManagers = async () => {
            try {
                const response = await api.get('/users');
                const adminList = (response.data || []).filter(u => 
                    u.active && ['admin', 'manager', 'superadmin'].includes(u.role)
                );
                setManagers(adminList);
                if (adminList.length > 0) {
                    setSelectedManagerId(adminList[0].id);
                }
            } catch (err) {
                console.error('Error fetching managers:', err);
            }
        };
        fetchManagers();
        setCurrentSaleId(saleIdProp || '');
        if (saleIdProp) {
            fetchSaleDetails(saleIdProp);
        } else {
            setSaleData(null);
        }
        setPassword('');
        setError(null);
        setSaleError(null);
    }, [isOpen, saleIdProp]);

    // Live automatic sale search when typing ID
    useEffect(() => {
        if (!isOpen) return;
        if (!currentSaleId || String(currentSaleId).trim() === '') {
            setSaleData(null);
            setSaleError(null);
            return;
        }
        const timer = setTimeout(() => {
            fetchSaleDetails(currentSaleId);
        }, 350);
        return () => clearTimeout(timer);
    }, [isOpen, currentSaleId]);

    const fetchSaleDetails = async (id) => {
        if (!id) {
            setSaleData(null);
            setSaleError(null);
            return;
        }
        setLoadingSale(true);
        setSaleError(null);
        try {
            const response = await api.get(`/sales/${id}`);
            setSaleData(response.data);
        } catch (err) {
            console.error('Erro ao buscar detalhes da venda:', err);
            setSaleData(null);
            setSaleError('Venda #' + id + ' não encontrada ou inválida.');
        } finally {
            setLoadingSale(false);
        }
    };

    const handleSaleIdInputChange = (val) => {
        setCurrentSaleId(val);
        if (onSaleIdChange) onSaleIdChange(val);
    };

    const handleSearchSaleClick = () => {
        if (currentSaleId) {
            fetchSaleDetails(currentSaleId);
        }
    };

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (showSaleInput && !currentSaleId) {
            setError('Informe o ID da venda que deseja estornar.');
            return;
        }
        if (showSaleInput && !saleData) {
            setError('Busque e confirme uma venda válida antes de autorizar o estorno.');
            return;
        }
        if (!selectedManagerId) {
            setError('Selecione um Gerente ou Administrador autorizador.');
            return;
        }
        if (!password) {
            setError('Digite a senha ou PIN do gerente.');
            return;
        }
        if (!reason || reason.trim().length < 5) {
            setError('Informe o motivo/justificativa do cancelamento (mínimo 5 caracteres).');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await api.post('/sales/verify-manager', {
                manager_id: selectedManagerId,
                password: password
            });

            if (response.data.success) {
                onConfirm({
                    authorized_by: response.data.manager.id,
                    manager_name: response.data.manager.name,
                    cancellation_reason: reason.trim(),
                    sale_id: currentSaleId
                });
            } else {
                setError('Autorização negada.');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Senha gerencial incorreta ou autorização negada.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
            <div className="modal-content glass" style={{ maxWidth: '480px', padding: '24px', borderRadius: '16px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
                    <h3 style={{ margin: 0, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
                        <ShieldAlert size={22} color="#ef4444" /> {title}
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                {showSaleInput && (
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '12px', color: '#38bdf8', marginBottom: '6px', fontWeight: 'bold' }}>
                            <ShoppingBag size={14} style={{ display: 'inline', marginRight: '4px' }} /> Digite o Código / ID da Venda
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input 
                                type="number"
                                value={currentSaleId}
                                onChange={(e) => handleSaleIdInputChange(e.target.value)}
                                placeholder="Ex: 1042"
                                style={{ flex: 1, padding: '10px', background: 'rgba(15,23,42,0.9)', border: '1px solid #38bdf8', color: '#fff', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchSaleClick(); } }}
                            />
                            <button 
                                type="button" 
                                onClick={handleSearchSaleClick}
                                disabled={loadingSale || !currentSaleId}
                                style={{ padding: '0 16px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Search size={16} /> {loadingSale ? 'Buscando...' : 'Buscar'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Exibição dos Detalhes da Venda Encontrada */}
                {saleData && (
                    <div style={{ background: 'rgba(30, 41, 59, 0.85)', border: '1px solid #38bdf8', borderRadius: '12px', padding: '14px', marginBottom: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#38bdf8' }}>
                                📋 Venda #{saleData.id} {saleData.status === 'cancelled' && <span style={{ color: '#ef4444', fontSize: '11px' }}>(JÁ CANCELADA)</span>}
                            </span>
                            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#10b981' }}>
                                Total: R$ {Number(saleData.final_amount || saleData.total_amount || 0).toFixed(2)}
                            </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px', color: '#cbd5e1', marginBottom: '10px' }}>
                            <div><strong>Data:</strong> {new Date(saleData.created_at || saleData.createdAt).toLocaleString('pt-BR')}</div>
                            <div><strong>Pagamento:</strong> {(saleData.payment_method || 'Dinheiro').toUpperCase()}</div>
                            {saleData.customer && <div style={{ gridColumn: 'span 2' }}><strong>Cliente:</strong> {saleData.customer.name}</div>}
                            {saleData.user && <div><strong>Operador:</strong> {saleData.user.name}</div>}
                        </div>

                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '4px' }}>
                            Produtos da Venda ({saleData.items?.length || 0} item(ns)):
                        </div>
                        <div style={{ maxHeight: '110px', overflowY: 'auto', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px', padding: '8px', border: '1px solid #334155' }}>
                            {saleData.items && saleData.items.length > 0 ? (
                                saleData.items.map((it, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#f1f5f9', padding: '3px 0', borderBottom: idx < saleData.items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                        <span>{it.quantity}x {it.product_sale?.name || `Produto #${it.product_id}`}</span>
                                        <span style={{ fontWeight: 'bold' }}>R$ {Number(it.total_price || (it.quantity * it.unit_price)).toFixed(2)}</span>
                                    </div>
                                ))
                            ) : (
                                <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>Nenhum item listado</div>
                            )}
                        </div>
                    </div>
                )}

                {saleError && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px', borderRadius: '8px', fontSize: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertTriangle size={16} /> {saleError}
                    </div>
                )}

                <p style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '16px', lineHeight: '1.4' }}>
                    {actionDescription}
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: 'bold' }}>
                            <UserCheck size={14} style={{ display: 'inline', marginRight: '4px' }} /> Gerente / Administrador Autorizador
                        </label>
                        <select 
                            value={selectedManagerId}
                            onChange={(e) => setSelectedManagerId(e.target.value)}
                            style={{ width: '100%', padding: '10px', background: 'rgba(15,23,42,0.9)', border: '1px solid #334155', color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' }}
                            required
                        >
                            {managers.length === 0 ? (
                                <option value="">Nenhum gerente encontrado</option>
                            ) : (
                                managers.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.name} ({m.role.toUpperCase()})
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: 'bold' }}>
                            <KeyRound size={14} style={{ display: 'inline', marginRight: '4px' }} /> Senha / PIN de Autorização
                        </label>
                        <input 
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Digite a senha gerencial..."
                            style={{ width: '100%', padding: '10px', background: 'rgba(15,23,42,0.9)', border: '1px solid #334155', color: '#fff', borderRadius: '8px', fontSize: '14px' }}
                            required
                            autoFocus
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: 'bold' }}>
                            <FileText size={14} style={{ display: 'inline', marginRight: '4px' }} /> Motivo do Cancelamento / Estorno
                        </label>
                        <textarea
                            rows="2"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Ex: Cliente desistiu da compra / Produto avariado..."
                            style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.9)', border: '1px solid #334155', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                            required
                        />
                    </div>

                    {error && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px', borderRadius: '8px', fontSize: '12px' }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                        <button type="button" onClick={onClose} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid #475569', color: '#cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading || (showSaleInput && !saleData)}
                            style={{ padding: '8px 18px', background: '#ef4444', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', opacity: (showSaleInput && !saleData) ? 0.6 : 1 }}
                        >
                            <CheckCircle size={16} />
                            {loading ? 'Validando...' : 'Autorizar Estorno'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ManagerAuthModal;
