import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
    ArrowLeftRight, Plus, Search, FileText, CheckCircle2, AlertCircle, 
    Store, Calendar, ShieldCheck, Printer, X, Trash2, Truck, Check, PackageCheck
} from 'lucide-react';
import './TransfersPage.css';

const TransfersPage = () => {
    const [transfersList, setTransfersList] = useState([]);
    const [tenantsList, setTenantsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('all'); // 'all', 'outgoing', 'incoming'
    const [searchTerm, setSearchTerm] = useState('');

    // New Transfer Modal state
    const [showModal, setShowModal] = useState(false);
    const [destinationTenantId, setDestinationTenantId] = useState('');
    const [cfop, setCfop] = useState('5151');
    const [notes, setNotes] = useState('');
    const [transferItems, setTransferItems] = useState([]);

    // Product Search inside Modal
    const [productSearch, setProductSearch] = useState('');
    const [foundProducts, setFoundProducts] = useState([]);

    // Detail Modal
    const [selectedTransfer, setSelectedTransfer] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchTransfers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/transfers');
            setTransfersList(response.data);
        } catch (error) {
            console.error('Erro ao carregar transferências:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTenants = async () => {
        try {
            const response = await api.get('/tenants');
            setTenantsList(response.data);
        } catch (error) {
            console.error('Erro ao carregar lojas/unidades:', error);
        }
    };

    useEffect(() => {
        fetchTransfers();
        fetchTenants();
    }, []);

    const handleProductSearch = async (term) => {
        setProductSearch(term);
        if (term.length < 2) {
            setFoundProducts([]);
            return;
        }
        try {
            const response = await api.get(`/products?search=${term}`);
            setFoundProducts(response.data);
        } catch (err) {
            console.error('Erro ao buscar produtos:', err);
        }
    };

    const addItemToTransfer = (prod) => {
        if (transferItems.some(i => i.product_id === prod.id)) return;
        setTransferItems([
            ...transferItems,
            {
                product_id: prod.id,
                name: prod.name,
                barcode: prod.ean || prod.barcode || '',
                batch_number: prod.batches && prod.batches.length > 0 ? prod.batches[0].batch_number : '',
                quantity: 1,
                unit_price: Number(prod.price || prod.cost || 0),
                total_price: Number(prod.price || prod.cost || 0)
            }
        ]);
        setProductSearch('');
        setFoundProducts([]);
    };

    const removeItemFromTransfer = (index) => {
        setTransferItems(transferItems.filter((_, i) => i !== index));
    };

    const updateItemQty = (index, qty) => {
        const updated = [...transferItems];
        const q = Math.max(1, parseInt(qty) || 1);
        updated[index].quantity = q;
        updated[index].total_price = q * updated[index].unit_price;
        setTransferItems(updated);
    };

    const handleCreateTransfer = async (e) => {
        e.preventDefault();
        if (!destinationTenantId) {
            alert('Selecione a unidade de destino para a transferência.');
            return;
        }
        if (transferItems.length === 0) {
            alert('Adicione pelo menos 1 produto para transferência.');
            return;
        }

        try {
            const payload = {
                destination_tenant_id: destinationTenantId,
                cfop: cfop,
                notes: notes,
                items: transferItems
            };

            await api.post('/transfers', payload);
            alert('Transferência enviada com sucesso! Produtos estão em trânsito.');
            setShowModal(false);
            setTransferItems([]);
            setNotes('');
            fetchTransfers();
        } catch (error) {
            console.error('Erro ao criar transferência:', error);
            alert(error.response?.data?.error || 'Erro ao registrar transferência.');
        }
    };

    const handleReceiveTransfer = async (transferId) => {
        if (!window.confirm('Confirma o recebimento físico destes produtos na sua unidade? O estoque será atualizado.')) return;
        setActionLoading(true);
        try {
            const response = await api.post(`/transfers/${transferId}/receive`);
            alert(response.data.message || 'Transferência recebida com sucesso!');
            fetchTransfers();
            if (selectedTransfer && selectedTransfer.id === transferId) {
                setSelectedTransfer(null);
            }
        } catch (error) {
            console.error('Erro ao receber transferência:', error);
            alert(error.response?.data?.error || 'Erro ao confirmar recebimento.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleEmitNF = async (transferId) => {
        setActionLoading(true);
        try {
            const response = await api.post(`/transfers/${transferId}/emit-nf`);
            alert('NF-e de Transferência emitida com sucesso!');
            fetchTransfers();
            if (selectedTransfer && selectedTransfer.id === transferId) {
                setSelectedTransfer(prev => ({
                    ...prev,
                    fiscal_status: 'emitted',
                    fiscal_key: response.data.fiscal_key,
                    fiscal_protocol: response.data.fiscal_protocol
                }));
            }
        } catch (error) {
            alert(error.response?.data?.error || 'Erro ao emitir NF-e.');
        } finally {
            setActionLoading(false);
        }
    };

    const filteredTransfers = transfersList.filter(t => {
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const orig = t.origin_tenant?.name?.toLowerCase() || '';
            const dest = t.destination_tenant?.name?.toLowerCase() || '';
            const key = t.fiscal_key?.toLowerCase() || '';
            return orig.includes(term) || dest.includes(term) || key.includes(term) || t.id.toString().includes(term);
        }
        return true;
    });

    const totalTransferAmount = transferItems.reduce((acc, item) => acc + item.total_price, 0);

    return (
        <div className="transfers-page page-wrapper">
            <header className="page-header">
                <div className="header-title">
                    <ArrowLeftRight size={26} className="title-icon text-primary" />
                    <div>
                        <h1>Transferência de Estoque Inter-Unidades</h1>
                        <p className="subtitle">Movimentação e controle fiscal de produtos entre lojas e filiais</p>
                    </div>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={18} /> Nova Transferência
                    </button>
                </div>
            </header>

            {/* Filter Card */}
            <div className="filters-card glass">
                <div className="search-box">
                    <Search size={18} />
                    <input 
                        type="text"
                        placeholder="Buscar por ID, Unidade Origem, Destino ou Chave..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="table-card glass">
                {loading ? (
                    <div className="loading-state">Carregando transferências...</div>
                ) : filteredTransfers.length === 0 ? (
                    <div className="empty-state">
                        <ArrowLeftRight size={48} className="empty-icon" />
                        <p>Nenhuma transferência registrada.</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th># Transf.</th>
                                <th>Origem</th>
                                <th>Destino</th>
                                <th>Status Trânsito</th>
                                <th>CFOP</th>
                                <th>Valor Total</th>
                                <th>Status Fiscal</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransfers.map((t) => (
                                <tr key={t.id}>
                                    <td className="fw-bold">#{t.id}</td>
                                    <td>
                                        <span className="unit-tag"><Store size={14} /> {t.origin_tenant?.name || 'Unidade Origem'}</span>
                                    </td>
                                    <td>
                                        <span className="unit-tag"><Store size={14} /> {t.destination_tenant?.name || 'Unidade Destino'}</span>
                                    </td>
                                    <td>
                                        <span className={`badge ${t.status === 'received' ? 'badge-success' : 'badge-warning'}`}>
                                            {t.status === 'received' ? 'Recebido no Destino' : 'Em Trânsito'}
                                        </span>
                                    </td>
                                    <td><code>{t.cfop || '5151'}</code></td>
                                    <td className="fw-bold text-success">
                                        R$ {Number(t.total_amount).toFixed(2)}
                                    </td>
                                    <td>
                                        <span className={`badge ${t.fiscal_status === 'emitted' ? 'badge-success' : 'badge-secondary'}`}>
                                            {t.fiscal_status === 'emitted' ? 'NF-e Emitida' : 'Rascunho / Pendente'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button 
                                                className="btn-icon" 
                                                title="Ver Detalhes"
                                                onClick={() => setSelectedTransfer(t)}
                                            >
                                                <FileText size={18} />
                                            </button>

                                            {t.status === 'in_transit' && (
                                                <button 
                                                    className="btn-action btn-sm btn-success"
                                                    onClick={() => handleReceiveTransfer(t.id)}
                                                    disabled={actionLoading}
                                                    title="Confirmar recebimento de produtos no estoque"
                                                >
                                                    <PackageCheck size={16} /> Confirmar Recebimento
                                                </button>
                                            )}

                                            {t.fiscal_status !== 'emitted' && (
                                                <button 
                                                    className="btn-action btn-sm btn-outline-primary"
                                                    onClick={() => handleEmitNF(t.id)}
                                                    disabled={actionLoading}
                                                >
                                                    <ShieldCheck size={16} /> Emitir NF-e
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

            {/* Modal Nova Transferência */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content glass modal-lg">
                        <div className="modal-header">
                            <h2><Plus size={22} /> Nova Transferência de Estoque Inter-Unidades</h2>
                            <button className="close-btn" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateTransfer}>
                            <div className="modal-body">
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Unidade de Destino (Loja)</label>
                                        <select 
                                            value={destinationTenantId}
                                            onChange={(e) => setDestinationTenantId(e.target.value)}
                                            required
                                        >
                                            <option value="">Selecione a loja de destino...</option>
                                            {tenantsList.map(tn => (
                                                <option key={tn.id} value={tn.id}>
                                                    {tn.name} (CNPJ: {tn.cnpj || 'N/A'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>CFOP de Transferência</label>
                                        <input 
                                            type="text" 
                                            value={cfop}
                                            onChange={(e) => setCfop(e.target.value)}
                                            placeholder="5151 / 6151"
                                        />
                                    </div>
                                </div>

                                {/* Items Section */}
                                <div className="items-section">
                                    <h3>Produtos a Transferir</h3>
                                    
                                    <div className="product-search-box">
                                        <Search size={18} />
                                        <input 
                                            type="text" 
                                            placeholder="Buscar produto por nome, código ou barras..."
                                            value={productSearch}
                                            onChange={(e) => handleProductSearch(e.target.value)}
                                        />
                                    </div>

                                    {foundProducts.length > 0 && (
                                        <div className="search-dropdown">
                                            {foundProducts.map(p => (
                                                <div 
                                                    key={p.id} 
                                                    className="dropdown-item"
                                                    onClick={() => addItemToTransfer(p)}
                                                >
                                                    <span><strong>{p.name}</strong> ({p.barcode || p.code})</span>
                                                    <span className="text-muted">Estoque Atual: {p.stock_qty || p.stock || 0}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {transferItems.length > 0 ? (
                                        <table className="items-table">
                                            <thead>
                                                <tr>
                                                    <th>Produto</th>
                                                    <th>Lote</th>
                                                    <th>Qtd Envio</th>
                                                    <th>Vlr. Unitário</th>
                                                    <th>Total</th>
                                                    <th>Remover</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {transferItems.map((item, index) => (
                                                    <tr key={index}>
                                                        <td>{item.name}</td>
                                                        <td>
                                                            <input 
                                                                type="text" 
                                                                value={item.batch_number}
                                                                onChange={(e) => {
                                                                    const updated = [...transferItems];
                                                                    updated[index].batch_number = e.target.value;
                                                                    setTransferItems(updated);
                                                                }}
                                                                placeholder="Nº Lote"
                                                                className="table-input"
                                                            />
                                                        </td>
                                                        <td>
                                                            <input 
                                                                type="number"
                                                                min="1"
                                                                value={item.quantity}
                                                                onChange={(e) => updateItemQty(index, e.target.value)}
                                                                className="table-input qty-input"
                                                            />
                                                        </td>
                                                        <td className="fw-bold">R$ {item.unit_price.toFixed(2)}</td>
                                                        <td className="fw-bold text-success">R$ {item.total_price.toFixed(2)}</td>
                                                        <td>
                                                            <button 
                                                                type="button" 
                                                                className="btn-icon danger"
                                                                onClick={() => removeItemFromTransfer(index)}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="no-items">Pesquise produtos acima para adicionar à transferência.</div>
                                    )}
                                </div>

                                <div className="form-group full-width">
                                    <label>Observações / Nota do Envio</label>
                                    <textarea 
                                        rows="2"
                                        placeholder="Ex: Transferência de abastecimento emergencial solicitado pela Filial 02..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    ></textarea>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <div className="total-preview">
                                    <span>Total do Envio:</span>
                                    <strong>R$ {totalTransferAmount.toFixed(2)}</strong>
                                </div>
                                <div className="footer-btns">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                    <button type="submit" className="btn btn-primary">Despachar e Baixar Estoque</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Detalhes Transferência */}
            {selectedTransfer && (
                <div className="modal-overlay">
                    <div className="modal-content glass modal-md">
                        <div className="modal-header">
                            <h2><FileText size={22} /> Transferência #{selectedTransfer.id}</h2>
                            <button className="close-btn" onClick={() => setSelectedTransfer(null)}><X size={20} /></button>
                        </div>
                        <div className="modal-body printable-area">
                            <div className="detail-row">
                                <span>Origem:</span>
                                <strong>{selectedTransfer.origin_tenant?.name || 'Origem'}</strong>
                            </div>
                            <div className="detail-row">
                                <span>Destino:</span>
                                <strong>{selectedTransfer.destination_tenant?.name || 'Destino'}</strong>
                            </div>
                            <div className="detail-row">
                                <span>Status Trânsito:</span>
                                <strong>{selectedTransfer.status === 'received' ? 'Recebido no Destino' : 'Em Trânsito'}</strong>
                            </div>
                            <div className="detail-row">
                                <span>Valor Total:</span>
                                <strong className="text-success">R$ {Number(selectedTransfer.total_amount).toFixed(2)}</strong>
                            </div>

                            <div className="fiscal-box mt-3">
                                <h4>Nota Fiscal de Transferência (NF-e)</h4>
                                <p><strong>Status Fiscal:</strong> {selectedTransfer.fiscal_status === 'emitted' ? 'EMITIDA (SEFAZ)' : 'RASCUNHO / PENDENTE'}</p>
                                {selectedTransfer.fiscal_key && (
                                    <>
                                        <p><strong>Chave de Acesso:</strong> <code className="fiscal-key-code">{selectedTransfer.fiscal_key}</code></p>
                                        <p><strong>Protocolo de Autorização:</strong> {selectedTransfer.fiscal_protocol}</p>
                                    </>
                                )}
                            </div>

                            <div className="items-list-preview mt-3">
                                <h4>Produtos Transferidos</h4>
                                <ul>
                                    {selectedTransfer.items && selectedTransfer.items.map((item, idx) => (
                                        <li key={idx}>
                                            {item.product?.name || `Produto #${item.product_id}`} - {item.quantity}x (Lote: {item.batch_number || 'S/L'}) = R$ {Number(item.total_price).toFixed(2)}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => window.print()}>
                                <Printer size={16} /> Imprimir Guia de Trânsito
                            </button>

                            {selectedTransfer.status === 'in_transit' && (
                                <button className="btn btn-success" onClick={() => handleReceiveTransfer(selectedTransfer.id)}>
                                    <PackageCheck size={16} /> Confirmar Recebimento
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransfersPage;
