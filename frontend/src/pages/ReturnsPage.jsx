import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Truck, Plus, Trash2, Search, RotateCcw, FileText, User, X, Printer, ShieldCheck, CheckCircle2 } from 'lucide-react';
import ManagerAuthModal from '../components/ManagerAuthModal';

const ReturnsPage = () => {
    const [returnsList, setReturnsList] = useState([]);
    const [suppliersList, setSuppliersList] = useState([]);
    const [productsList, setProductsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state for New Return
    const [showModal, setShowModal] = useState(false);
    const [returnType, setReturnType] = useState('supplier_return');
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [saleId, setSaleId] = useState('');
    const [cancelSale, setCancelSale] = useState(true);
    const [fetchingSale, setFetchingSale] = useState(false);
    const [returnReason, setReturnReason] = useState('Avaria');
    const [cfop, setCfop] = useState('5201');
    const [notes, setNotes] = useState('');

    // Manager Auth Modal
    const [showManagerAuth, setShowManagerAuth] = useState(false);

    // Items being added to the new return
    const [returnItems, setReturnItems] = useState([]);
    const [productSearch, setProductSearch] = useState('');
    const [foundProducts, setFoundProducts] = useState([]);

    // Detail & NF Modal
    const [selectedReturn, setSelectedReturn] = useState(null);
    const [emittingNf, setEmittingNf] = useState(false);
    const [nfSuccess, setNfSuccess] = useState(null);

    const fetchReturns = async () => {
        setLoading(true);
        try {
            const response = await api.get('/returns');
            setReturnsList(response.data);
        } catch (error) {
            console.error('Erro ao carregar devoluções:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSuppliers = async () => {
        try {
            const response = await api.get('/inventory/suppliers');
            setSuppliersList(response.data);
        } catch (error) {
            console.error('Erro ao carregar fornecedores:', error);
        }
    };

    useEffect(() => {
        fetchReturns();
        fetchSuppliers();
    }, []);

    const handleFetchSaleItems = async () => {
        if (!saleId) {
            alert('Digite o código/ID da venda.');
            return;
        }
        setFetchingSale(true);
        try {
            const response = await api.get(`/sales/${saleId}`);
            const saleData = response.data;
            if (saleData && saleData.items && saleData.items.length > 0) {
                const itemsMapped = saleData.items.map(it => ({
                    product_id: it.product_id,
                    name: it.product_sale?.name || `Produto #${it.product_id}`,
                    barcode: it.product_sale?.ean || '',
                    batch_number: it.batch_number || 'LOTE-RETORNO',
                    quantity: it.quantity,
                    unit_price: Number(it.unit_price || 0),
                    total_price: Number(it.total_price || (it.quantity * it.unit_price)),
                    reason: returnReason
                }));
                setReturnItems(itemsMapped);
                alert(`Venda #${saleId} carregada com sucesso! ${itemsMapped.length} item(ns) importado(s).`);
            } else {
                alert(`Nenhum item encontrado para a Venda #${saleId}.`);
            }
        } catch (err) {
            alert('Erro ao buscar venda: ' + (err.response?.data?.error || err.message));
        } finally {
            setFetchingSale(false);
        }
    };

    // Search product for return item
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

    const addItemToReturn = (prod) => {
        if (returnItems.some(i => i.product_id === prod.id)) return;
        setReturnItems([
            ...returnItems,
            {
                product_id: prod.id,
                name: prod.name,
                barcode: prod.ean || prod.barcode || prod.code || '',
                batch_number: prod.batches && prod.batches.length > 0 ? prod.batches[0].batch_number : '',
                quantity: 1,
                unit_price: Number(prod.price || prod.cost_price || 0),
                total_price: Number(prod.price || prod.cost_price || 0),
                reason: returnReason
            }
        ]);
        setProductSearch('');
        setFoundProducts([]);
    };

    const removeItemFromReturn = (index) => {
        setReturnItems(returnItems.filter((_, i) => i !== index));
    };

    const updateItemQty = (index, qty) => {
        const updated = [...returnItems];
        const q = Math.max(1, parseInt(qty) || 1);
        updated[index].quantity = q;
        updated[index].total_price = q * updated[index].unit_price;
        setReturnItems(updated);
    };

    const updateItemPrice = (index, price) => {
        const updated = [...returnItems];
        const p = parseFloat(price) || 0;
        updated[index].unit_price = p;
        updated[index].total_price = updated[index].quantity * p;
        setReturnItems(updated);
    };

    const handleCreateReturn = (e) => {
        e.preventDefault();
        if (returnItems.length === 0) {
            alert('Adicione pelo menos 1 produto para realizar a devolução.');
            return;
        }

        // If customer return with sale cancellation, demand manager authentication
        if (returnType === 'customer_return' && (cancelSale || saleId)) {
            setShowManagerAuth(true);
        } else {
            executeCreateReturn({});
        }
    };

    const executeCreateReturn = async (authData = {}) => {
        try {
            const payload = {
                type: returnType,
                supplier_id: returnType === 'supplier_return' ? selectedSupplierId : null,
                sale_id: returnType === 'customer_return' ? (saleId || null) : null,
                reason: returnReason,
                cfop: cfop,
                notes: notes,
                items: returnItems,
                cancel_sale: returnType === 'customer_return' ? cancelSale : false,
                authorized_by: authData.authorized_by || null,
                cancellation_reason: authData.cancellation_reason || returnReason
            };

            const response = await api.post('/returns', payload);
            alert(`Devolução registrada com sucesso! ${cancelSale && saleId ? 'Venda #' + saleId + ' cancelada e estornada no caixa e SEFAZ.' : ''}`);
            setShowModal(false);
            setShowManagerAuth(false);
            setReturnItems([]);
            setSaleId('');
            setNotes('');
            fetchReturns();
        } catch (error) {
            console.error('Erro ao registrar devolução:', error);
            alert(error.response?.data?.error || 'Erro ao registrar devolução.');
        }
    };

    const handleEmitNF = async (returnId) => {
        setEmittingNf(true);
        setNfSuccess(null);
        try {
            const response = await api.post(`/returns/${returnId}/emit-nf`);
            setNfSuccess(response.data);
            fetchReturns();
            if (selectedReturn && selectedReturn.id === returnId) {
                setSelectedReturn(prev => ({
                    ...prev,
                    fiscal_status: 'emitted',
                    fiscal_key: response.data.fiscal_key,
                    fiscal_protocol: response.data.fiscal_protocol
                }));
            }
        } catch (error) {
            const allowContingency = window.confirm(
                'Falha na comunicação com a SEFAZ ou tempo limite excedido.\n\nDeseja emitir a Nota Fiscal em CONTINGÊNCIA OFFLINE agora?'
            );
            if (allowContingency) {
                await handleEmitContingency(returnId);
            }
        } finally {
            setEmittingNf(false);
        }
    };

    const handleEmitContingency = async (returnId) => {
        setEmittingNf(true);
        try {
            const response = await api.post(`/returns/${returnId}/emit-contingency`);
            alert('NF-e emitida em CONTINGÊNCIA OFFLINE! Lembre-se de transmiti-la para a SEFAZ assim que o serviço estabilizar.');
            fetchReturns();
            if (selectedReturn && selectedReturn.id === returnId) {
                setSelectedReturn(prev => ({
                    ...prev,
                    fiscal_status: 'contingency',
                    fiscal_key: response.data.fiscal_key,
                    fiscal_protocol: response.data.fiscal_protocol
                }));
            }
        } catch (error) {
            alert(error.response?.data?.error || 'Erro ao emitir NF-e em contingência.');
        } finally {
            setEmittingNf(false);
        }
    };

    const handleSyncContingency = async (returnId) => {
        setEmittingNf(true);
        try {
            const response = await api.post(`/returns/${returnId}/sync-contingency`);
            alert('NF-e em contingência transmitida e autorizada com sucesso na SEFAZ!');
            fetchReturns();
            if (selectedReturn && selectedReturn.id === returnId) {
                setSelectedReturn(prev => ({
                    ...prev,
                    fiscal_status: 'emitted',
                    fiscal_protocol: response.data.fiscal_protocol
                }));
            }
        } catch (error) {
            alert(error.response?.data?.error || 'Erro ao sincronizar nota em contingência com a SEFAZ.');
        } finally {
            setEmittingNf(false);
        }
    };

    const handlePrintDANFE = () => {
        if (!selectedReturn) return;
        const originalTitle = document.title;
        const returnId = String(selectedReturn.id || '0').padStart(9, '0');
        const dateObj = new Date(selectedReturn.createdAt || Date.now());
        const dateFormatted = `${String(dateObj.getDate()).padStart(2, '0')}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${dateObj.getFullYear()}`;
        
        document.title = `NFE_N${returnId}_${dateFormatted}`;
        window.print();
        setTimeout(() => {
            document.title = originalTitle || 'VarejoPro ERP';
        }, 1500);
    };

    const filteredReturns = returnsList.filter(ret => {
        if (filterType !== 'all' && ret.type !== filterType) return false;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const suppName = ret.supplier?.name?.toLowerCase() || '';
            const reason = ret.reason?.toLowerCase() || '';
            const key = ret.fiscal_key?.toLowerCase() || '';
            return suppName.includes(term) || reason.includes(term) || key.includes(term) || ret.id.toString().includes(term);
        }
        return true;
    });

    const totalReturnAmount = returnItems.reduce((acc, item) => acc + item.total_price, 0);

    return (
        <div className="returns-page page-wrapper">
            <header className="page-header">
                <div className="header-title">
                    <RotateCcw size={26} className="title-icon text-primary" />
                    <div>
                        <h1>Devolução de Produtos & NF-e</h1>
                        <p className="subtitle">Gestão de devoluções a fornecedores e clientes com emissão fiscal</p>
                    </div>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={18} /> Nova Devolução
                    </button>
                </div>
            </header>

            {/* Filter Bar */}
            <div className="filters-card glass">
                <div className="search-box">
                    <Search size={18} />
                    <input 
                        type="text"
                        placeholder="Buscar por ID, Fornecedor, Motivo ou Chave..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-tabs">
                    <button 
                        className={`tab-btn ${filterType === 'all' ? 'active' : ''}`}
                        onClick={() => setFilterType('all')}
                    >
                        Todas
                    </button>
                    <button 
                        className={`tab-btn ${filterType === 'supplier_return' ? 'active' : ''}`}
                        onClick={() => setFilterType('supplier_return')}
                    >
                        <Truck size={16} /> Para Fornecedor
                    </button>
                    <button 
                        className={`tab-btn ${filterType === 'customer_return' ? 'active' : ''}`}
                        onClick={() => setFilterType('customer_return')}
                    >
                        <User size={16} /> De Cliente
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="table-card glass">
                {loading ? (
                    <div className="loading-state">Carregando devoluções...</div>
                ) : filteredReturns.length === 0 ? (
                    <div className="empty-state">
                        <RotateCcw size={48} className="empty-icon" />
                        <p>Nenhuma devolução encontrada.</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th># ID</th>
                                <th>Tipo</th>
                                <th>Origem / Destino</th>
                                <th>Motivo</th>
                                <th>CFOP</th>
                                <th>Total</th>
                                <th>Status Fiscal</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReturns.map((ret) => (
                                <tr key={ret.id}>
                                    <td className="fw-bold">#{ret.id}</td>
                                    <td>
                                        <span className={`badge ${ret.type === 'supplier_return' ? 'badge-info' : 'badge-warning'}`}>
                                            {ret.type === 'supplier_return' ? 'Dev. Fornecedor' : 'Dev. Cliente'}
                                        </span>
                                    </td>
                                    <td>
                                        {ret.type === 'supplier_return' ? (
                                            ret.supplier ? ret.supplier.name : 'Fornecedor N/A'
                                        ) : (
                                            ret.sale_id ? `Venda #${ret.sale_id}` : 'Cliente Balcão'
                                        )}
                                    </td>
                                    <td>{ret.reason}</td>
                                    <td><code>{ret.cfop || '5201'}</code></td>
                                    <td className="fw-bold text-success">
                                        R$ {Number(ret.total_amount).toFixed(2)}
                                    </td>
                                    <td>
                                        <span className={`badge ${
                                            ret.fiscal_status === 'emitted' ? 'badge-success' : 
                                            ret.fiscal_status === 'contingency' ? 'badge-warning' : 'badge-secondary'
                                        }`}>
                                            {ret.fiscal_status === 'emitted' ? 'NF-e Emitida' : 
                                             ret.fiscal_status === 'contingency' ? '⚡ Contingência' : 'Rascunho'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button 
                                                className="btn-icon" 
                                                title="Ver Detalhes / Impressão DANFE"
                                                onClick={() => setSelectedReturn(ret)}
                                            >
                                                <FileText size={18} />
                                            </button>
                                            {ret.fiscal_status === 'draft' && (
                                                <>
                                                    <button 
                                                        className="btn-action btn-sm btn-outline-primary"
                                                        onClick={() => handleEmitNF(ret.id)}
                                                        disabled={emittingNf}
                                                        title="Transmitir para SEFAZ (Normal)"
                                                    >
                                                        <ShieldCheck size={16} /> Emitir NF-e
                                                    </button>
                                                    <button 
                                                        className="btn-action btn-sm btn-outline-warning"
                                                        onClick={() => handleEmitContingency(ret.id)}
                                                        disabled={emittingNf}
                                                        title="Emitir em Contingência Offline"
                                                    >
                                                        ⚡ Contingência
                                                    </button>
                                                </>
                                            )}
                                            {ret.fiscal_status === 'contingency' && (
                                                <button 
                                                    className="btn-action btn-sm btn-outline-success"
                                                    onClick={() => handleSyncContingency(ret.id)}
                                                    disabled={emittingNf}
                                                    title="Transmitir nota pendente para a SEFAZ"
                                                >
                                                    <RotateCcw size={14} /> Sincronizar SEFAZ
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

            {/* Modal Nova Devolução */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content glass modal-lg">
                        <div className="modal-header">
                            <h2><Plus size={22} /> Nova Devolução de Produtos</h2>
                            <button className="close-btn" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateReturn}>
                            <div className="modal-body">
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Tipo de Devolução</label>
                                        <select 
                                            value={returnType} 
                                            onChange={(e) => {
                                                setReturnType(e.target.value);
                                                setCfop(e.target.value === 'supplier_return' ? '5201' : '1202');
                                            }}
                                        >
                                            <option value="supplier_return">Devolução a Fornecedor (Baixa de Estoque)</option>
                                            <option value="customer_return">Devolução de Cliente (Entrada de Estoque)</option>
                                        </select>
                                    </div>

                                    {returnType === 'supplier_return' ? (
                                        <div className="form-group">
                                            <label>Fornecedor Destino</label>
                                            <select 
                                                value={selectedSupplierId}
                                                onChange={(e) => setSelectedSupplierId(e.target.value)}
                                            >
                                                <option value="">Selecione o Fornecedor...</option>
                                                {suppliersList.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name} (CNPJ: {s.cnpj || 'N/A'})</option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : (
                                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                            <label style={{ fontWeight: 'bold', color: '#38bdf8' }}>Código da Venda Origem</label>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <input 
                                                    type="number" 
                                                    placeholder="Ex: 1042"
                                                    value={saleId}
                                                    onChange={(e) => setSaleId(e.target.value)}
                                                    style={{ flex: 1 }}
                                                />
                                                <button 
                                                    type="button" 
                                                    className="btn btn-secondary" 
                                                    onClick={handleFetchSaleItems}
                                                    disabled={fetchingSale || !saleId}
                                                    style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '0 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                                >
                                                    <Search size={16} /> {fetchingSale ? 'Buscando Venda...' : 'Carregar Itens da Venda'}
                                                </button>
                                            </div>
                                            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <input 
                                                    type="checkbox" 
                                                    id="cancel_sale_chk" 
                                                    checked={cancelSale} 
                                                    onChange={(e) => setCancelSale(e.target.checked)} 
                                                />
                                                <label htmlFor="cancel_sale_chk" style={{ fontSize: '12px', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer' }}>
                                                    Cancelar a Venda associada e Transmitir Cancelamento de NF-e na SEFAZ (Evitar impostos)
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    <div className="form-group">
                                        <label>Motivo da Devolução</label>
                                        <select value={returnReason} onChange={(e) => setReturnReason(e.target.value)}>
                                            <option value="Avaria">Produto Avariado / Danificado</option>
                                            <option value="Vencimento">Vencimento Próximo / Vencido</option>
                                            <option value="Erro de Envio">Pedido / Item Incorreto</option>
                                            <option value="Recall">Recall de Fabricante / ANVISA</option>
                                            <option value="Desistência Cliente">Desistência / Troca de Cliente</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>CFOP Fiscal</label>
                                        <input 
                                            type="text" 
                                            value={cfop}
                                            onChange={(e) => setCfop(e.target.value)}
                                            placeholder="5201 / 1202"
                                        />
                                    </div>
                                </div>

                                {/* Items Section */}
                                <div className="items-section">
                                    <h3>Itens para Devolução</h3>
                                    
                                    <div className="product-search-box">
                                        <Search size={18} />
                                        <input 
                                            type="text" 
                                            placeholder="Buscar produto por nome, código ou código de barras..."
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
                                                    onClick={() => addItemToReturn(p)}
                                                >
                                                    <span><strong>{p.name}</strong> ({p.barcode || p.code})</span>
                                                    <span className="text-muted">Estoque: {p.stock_qty || p.stock || 0}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {returnItems.length > 0 ? (
                                        <table className="items-table">
                                            <thead>
                                                <tr>
                                                    <th>Produto</th>
                                                    <th>Lote</th>
                                                    <th>Qtd</th>
                                                    <th>Vlr. Unitário</th>
                                                    <th>Subtotal</th>
                                                    <th>Remover</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {returnItems.map((item, index) => (
                                                    <tr key={index}>
                                                        <td>{item.name}</td>
                                                        <td>
                                                            <input 
                                                                type="text" 
                                                                value={item.batch_number}
                                                                onChange={(e) => {
                                                                    const updated = [...returnItems];
                                                                    updated[index].batch_number = e.target.value;
                                                                    setReturnItems(updated);
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
                                                        <td>
                                                            <input 
                                                                type="number"
                                                                step="0.01"
                                                                value={item.unit_price}
                                                                onChange={(e) => updateItemPrice(index, e.target.value)}
                                                                className="table-input price-input"
                                                            />
                                                        </td>
                                                        <td className="fw-bold">R$ {item.total_price.toFixed(2)}</td>
                                                        <td>
                                                            <button 
                                                                type="button" 
                                                                className="btn-icon danger"
                                                                onClick={() => removeItemFromReturn(index)}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="no-items">Pesquise e selecione os produtos acima.</div>
                                    )}
                                </div>

                                <div className="form-group full-width">
                                    <label>Observações Adicionais</label>
                                    <textarea 
                                        rows="2"
                                        placeholder="Ex: Devolução autorizada via protocolo 99481 do fornecedor..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    ></textarea>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <div className="total-preview">
                                    <span>Total da Devolução:</span>
                                    <strong>R$ {totalReturnAmount.toFixed(2)}</strong>
                                </div>
                                <div className="footer-btns">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                    <button type="submit" className="btn btn-primary">Confirmar e Registrar</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Detalhes & Impressão DANFE NF-e Devolução Oficial */}
            {selectedReturn && (
                <div className="modal-overlay">
                    <div className="modal-content glass modal-lg danfe-modal-content">
                        <div className="modal-header no-print">
                            <h2><FileText size={22} /> Documento Auxiliar da Nota Fiscal Eletrônica (DANFE Devolução #{selectedReturn.id})</h2>
                            <button className="close-btn" onClick={() => setSelectedReturn(null)}><X size={20} /></button>
                        </div>
                        
                        <div className="modal-body danfe-paper-body">
                            <div className="official-danfe-container printable-area">
                                {/* Canhoto de Recebimento */}
                                <div className="danfe-row border-all">
                                    <div className="danfe-col flex-5 border-right p-1">
                                        <span className="danfe-label-sm">
                                            RECEBEMOS DE <strong>VAREJOPRO ERP DEVOLUÇÃO</strong> OS PRODUTOS/SERVIÇOS CONSTANTES DA NOTA FISCAL ELETRÔNICA INDICADA AO LADO.
                                        </span>
                                    </div>
                                    <div className="danfe-col flex-2 border-right p-1">
                                        <div className="danfe-label-sm">DATA DE RECEBIMENTO</div>
                                        <div className="danfe-val-space"></div>
                                    </div>
                                    <div className="danfe-col flex-3 border-right p-1">
                                        <div className="danfe-label-sm">IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR</div>
                                        <div className="danfe-val-space"></div>
                                    </div>
                                    <div className="danfe-col flex-2 text-center p-1">
                                        <div className="fw-bold">NF-e</div>
                                        <div className="danfe-val">Nº {String(selectedReturn.id).padStart(9, '0')}</div>
                                        <div className="danfe-val">SÉRIE 1</div>
                                    </div>
                                </div>
                                
                                <div className="danfe-cut-line">
                                    ---------------------------------------------------------------------------------------------------------------------------------------------
                                </div>

                                {/* Cabeçalho Oficial */}
                                <div className="danfe-row border-all">
                                    {/* Emitente */}
                                    <div className="danfe-col flex-3 border-right p-2 text-center align-center">
                                        <div className="danfe-company-name">VAREJOPRO ERP</div>
                                        <div className="danfe-company-desc">LOJA E DROGARIA LTDA</div>
                                        <div className="danfe-label-sm">AV. PRINCIPAL, 1000 - CENTRO</div>
                                        <div className="danfe-label-sm">SÃO PAULO - SP - CEP 01000-000</div>
                                        <div className="danfe-label-sm">TEL: (11) 3000-0000</div>
                                    </div>

                                    {/* DANFE Box */}
                                    <div className="danfe-col flex-2 border-right p-2 text-center align-center">
                                        <div className="danfe-title">DANFE</div>
                                        <div className="danfe-subtitle">DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRÔNICA</div>
                                        <div className="danfe-flag-box mt-1">
                                            <span>0 - ENTRADA</span><br/>
                                            <span>1 - SAÍDA</span>
                                            <span className="danfe-flag-val">{selectedReturn.type === 'supplier_return' ? '1' : '0'}</span>
                                        </div>
                                        <div className="fw-bold mt-1">Nº {String(selectedReturn.id).padStart(9, '0')}</div>
                                        <div className="danfe-val">SÉRIE 1 - FOLHA 1/1</div>
                                    </div>

                                    {/* Chave & Barcode */}
                                    <div className="danfe-col flex-4 p-2">
                                        <div className="danfe-barcode-box text-center">
                                            <div className="barcode-lines">||| | |||| ||| ||||| ||| |||| ||||| ||| |||| ||| ||||| |||</div>
                                        </div>
                                        <div className="danfe-field border-top mt-1">
                                            <div className="danfe-label-sm">CHAVE DE ACESSO</div>
                                            <div className="danfe-chave">
                                                {(selectedReturn.fiscal_key || ('3526' + String(selectedReturn.id).padStart(8, '0') + '55001000000000100000000')).replace(/(.{4})/g, '$1 ').trim()}
                                            </div>
                                        </div>
                                        <div className="danfe-field border-top mt-1">
                                            <div className="danfe-label-sm">Consulta de autenticidade no portal nacional da NF-e</div>
                                            <div className="danfe-val-sm">www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora</div>
                                        </div>
                                        <div className="danfe-field border-top mt-1">
                                            <div className="danfe-label-sm">PROTOCOLO DE AUTORIZAÇÃO DE USO</div>
                                            <div className="danfe-val-bold">{selectedReturn.fiscal_protocol || (selectedReturn.fiscal_status === 'emitted' ? '135260000099481 05/08/2026 20:33:00' : 'RASCUNHO SEFAZ - EMISSÃO PENDENTE')}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Natureza da Operação */}
                                <div className="danfe-row border-x border-b">
                                    <div className="danfe-col flex-5 border-right p-1">
                                        <div className="danfe-label-sm">NATUREZA DA OPERAÇÃO</div>
                                        <div className="danfe-val-bold">{selectedReturn.type === 'supplier_return' ? 'DEVOLUÇÃO DE COMPRA PARA MANUTENÇÃO/TROCA' : 'DEVOLUÇÃO DE VENDA DE MERCADORIA'}</div>
                                    </div>
                                    <div className="danfe-col flex-3 border-right p-1">
                                        <div className="danfe-label-sm">INSCRIÇÃO ESTADUAL</div>
                                        <div className="danfe-val">123.456.789.110</div>
                                    </div>
                                    <div className="danfe-col flex-3 border-right p-1">
                                        <div className="danfe-label-sm">INSC.ESTADUAL DO SUBST.TRIB.</div>
                                        <div className="danfe-val"></div>
                                    </div>
                                    <div className="danfe-col flex-3 p-1">
                                        <div className="danfe-label-sm">CNPJ</div>
                                        <div className="danfe-val">00.123.456/0001-99</div>
                                    </div>
                                </div>

                                {/* Destinatário / Remetente */}
                                <div className="danfe-section-header">DESTINATÁRIO / REMETENTE</div>
                                <div className="danfe-row border-all">
                                    <div className="danfe-col flex-6 border-right p-1">
                                        <div className="danfe-label-sm">NOME / RAZÃO SOCIAL</div>
                                        <div className="danfe-val-bold">
                                            {selectedReturn.type === 'supplier_return'
                                                ? (selectedReturn.supplier ? selectedReturn.supplier.name : 'FORNECEDOR DIVERSOS')
                                                : (selectedReturn.sale_id ? `CLIENTE DEVOLUÇÃO (VENDA #${selectedReturn.sale_id})` : 'CLIENTE BALCÃO')
                                            }
                                        </div>
                                    </div>
                                    <div className="danfe-col flex-3 border-right p-1">
                                        <div className="danfe-label-sm">CNPJ / CPF</div>
                                        <div className="danfe-val">{selectedReturn.supplier?.cnpj || '00.000.000/0001-00'}</div>
                                    </div>
                                    <div className="danfe-col flex-2 p-1">
                                        <div className="danfe-label-sm">DATA DA EMISSÃO</div>
                                        <div className="danfe-val">{new Date(selectedReturn.createdAt || Date.now()).toLocaleDateString('pt-BR')}</div>
                                    </div>
                                </div>
                                <div className="danfe-row border-x border-b">
                                    <div className="danfe-col flex-5 border-right p-1">
                                        <div className="danfe-label-sm">ENDEREÇO</div>
                                        <div className="danfe-val">RUA DAS LOJAS, 500</div>
                                    </div>
                                    <div className="danfe-col flex-3 border-right p-1">
                                        <div className="danfe-label-sm">BAIRRO / DISTRITO</div>
                                        <div className="danfe-val">CENTRO</div>
                                    </div>
                                    <div className="danfe-col flex-2 border-right p-1">
                                        <div className="danfe-label-sm">CEP</div>
                                        <div className="danfe-val">01000-000</div>
                                    </div>
                                    <div className="danfe-col flex-2 p-1">
                                        <div className="danfe-label-sm">DATA DA SAÍDA/ENTRADA</div>
                                        <div className="danfe-val">{new Date(selectedReturn.createdAt || Date.now()).toLocaleDateString('pt-BR')}</div>
                                    </div>
                                </div>
                                <div className="danfe-row border-x border-b">
                                    <div className="danfe-col flex-4 border-right p-1">
                                        <div className="danfe-label-sm">MUNICÍPIO</div>
                                        <div className="danfe-val">SÃO PAULO</div>
                                    </div>
                                    <div className="danfe-col flex-2 border-right p-1">
                                        <div className="danfe-label-sm">FONE / FAX</div>
                                        <div className="danfe-val">(11) 3000-0000</div>
                                    </div>
                                    <div className="danfe-col flex-1 border-right p-1">
                                        <div className="danfe-label-sm">UF</div>
                                        <div className="danfe-val">SP</div>
                                    </div>
                                    <div className="danfe-col flex-3 border-right p-1">
                                        <div className="danfe-label-sm">INSCRIÇÃO ESTADUAL</div>
                                        <div className="danfe-val">ISENTO</div>
                                    </div>
                                    <div className="danfe-col flex-2 p-1">
                                        <div className="danfe-label-sm">HORA DA SAÍDA</div>
                                        <div className="danfe-val">12:00:00</div>
                                    </div>
                                </div>

                                {/* Impostos */}
                                <div className="danfe-section-header">CÁLCULO DO IMPOSTO</div>
                                <div className="danfe-row border-all">
                                    <div className="danfe-col flex-1 border-right p-1">
                                        <div className="danfe-label-sm">BASE DE CÁLC. DO ICMS</div>
                                        <div className="danfe-val-num">0,00</div>
                                    </div>
                                    <div className="danfe-col flex-1 border-right p-1">
                                        <div className="danfe-label-sm">VALOR DO ICMS</div>
                                        <div className="danfe-val-num">0,00</div>
                                    </div>
                                    <div className="danfe-col flex-1 border-right p-1">
                                        <div className="danfe-label-sm">BASE CÁLC. ICMS ST</div>
                                        <div className="danfe-val-num">0,00</div>
                                    </div>
                                    <div className="danfe-col flex-1 border-right p-1">
                                        <div className="danfe-label-sm">VALOR DO ICMS ST</div>
                                        <div className="danfe-val-num">0,00</div>
                                    </div>
                                    <div className="danfe-col flex-1 p-1">
                                        <div className="danfe-label-sm">VLR TOTAL PRODUTOS</div>
                                        <div className="danfe-val-num">{Number(selectedReturn.total_amount).toFixed(2)}</div>
                                    </div>
                                </div>
                                <div className="danfe-row border-x border-b">
                                    <div className="danfe-col flex-1 border-right p-1">
                                        <div className="danfe-label-sm">VALOR DO FRETE</div>
                                        <div className="danfe-val-num">0,00</div>
                                    </div>
                                    <div className="danfe-col flex-1 border-right p-1">
                                        <div className="danfe-label-sm">VALOR DO SEGURO</div>
                                        <div className="danfe-val-num">0,00</div>
                                    </div>
                                    <div className="danfe-col flex-1 border-right p-1">
                                        <div className="danfe-label-sm">DESCONTO</div>
                                        <div className="danfe-val-num">0,00</div>
                                    </div>
                                    <div className="danfe-col flex-1 border-right p-1">
                                        <div className="danfe-label-sm">OUTRAS DESPESAS</div>
                                        <div className="danfe-val-num">0,00</div>
                                    </div>
                                    <div className="danfe-col flex-1 border-right p-1">
                                        <div className="danfe-label-sm">VALOR DO IPI</div>
                                        <div className="danfe-val-num">0,00</div>
                                    </div>
                                    <div className="danfe-col flex-1 p-1">
                                        <div className="danfe-label-sm">VLR TOTAL DA NOTA</div>
                                        <div className="danfe-val-num fw-bold">{Number(selectedReturn.total_amount).toFixed(2)}</div>
                                    </div>
                                </div>

                                {/* Transportador */}
                                <div className="danfe-section-header">TRANSPORTADOR / VOLUMES TRANSPORTADOS</div>
                                <div className="danfe-row border-all">
                                    <div className="danfe-col flex-4 border-right p-1">
                                        <div className="danfe-label-sm">RAZÃO SOCIAL</div>
                                        <div className="danfe-val">O MESMO</div>
                                    </div>
                                    <div className="danfe-col flex-2 border-right p-1">
                                        <div className="danfe-label-sm">FRETE POR CONTA</div>
                                        <div className="danfe-val">9 - SEM FRETE</div>
                                    </div>
                                    <div className="danfe-col flex-2 border-right p-1">
                                        <div className="danfe-label-sm">CÓDIGO ANTT</div>
                                        <div className="danfe-val"></div>
                                    </div>
                                    <div className="danfe-col flex-2 border-right p-1">
                                        <div className="danfe-label-sm">PLACA DO VEÍCULO</div>
                                        <div className="danfe-val"></div>
                                    </div>
                                    <div className="danfe-col flex-1 border-right p-1">
                                        <div className="danfe-label-sm">UF</div>
                                        <div className="danfe-val">SP</div>
                                    </div>
                                    <div className="danfe-col flex-3 p-1">
                                        <div className="danfe-label-sm">CNPJ / CPF</div>
                                        <div className="danfe-val"></div>
                                    </div>
                                </div>

                                {/* Tabela de Produtos */}
                                <div className="danfe-section-header">DADOS DOS PRODUTOS / SERVIÇOS</div>
                                <div className="danfe-table-wrapper border-all">
                                    <table className="official-danfe-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '12%' }}>CÓD. PROD.</th>
                                                <th style={{ width: '32%' }}>DESCRIÇÃO DO PRODUTO / SERVIÇO</th>
                                                <th style={{ width: '8%' }}>NCM/SH</th>
                                                <th style={{ width: '6%' }}>CST</th>
                                                <th style={{ width: '6%' }}>CFOP</th>
                                                <th style={{ width: '5%' }}>UNID</th>
                                                <th style={{ width: '5%' }}>QTD</th>
                                                <th style={{ width: '8%' }}>V. UNIT</th>
                                                <th style={{ width: '9%' }}>V. TOTAL</th>
                                                <th style={{ width: '9%' }}>BC ICMS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedReturn.items && selectedReturn.items.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="text-center">{item.product?.ean || String(item.product_id).padStart(6, '0')}</td>
                                                    <td>{item.product?.name || `Produto #${item.product_id}`} {item.batch_number ? `(LOTE: ${item.batch_number})` : ''}</td>
                                                    <td className="text-center">3004.90.99</td>
                                                    <td className="text-center">0102</td>
                                                    <td className="text-center">{selectedReturn.cfop || '5201'}</td>
                                                    <td className="text-center">UN</td>
                                                    <td className="text-right">{item.quantity}</td>
                                                    <td className="text-right">{Number(item.unit_price).toFixed(2)}</td>
                                                    <td className="text-right fw-bold">{Number(item.total_price).toFixed(2)}</td>
                                                    <td className="text-right">0,00</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Dados Adicionais */}
                                <div className="danfe-section-header">DADOS ADICIONAIS</div>
                                <div className="danfe-row border-all p-2">
                                    <div className="danfe-col flex-1">
                                        <div className="danfe-label-sm">INFORMAÇÕES COMPLEMENTARES</div>
                                        <div className="danfe-val-sm">
                                            {selectedReturn.fiscal_status === 'contingency' && <><strong>EMISSÃO EM CONTINGÊNCIA OFFLINE - SEFAZ INDISPONÍVEL. PENDENTE DE TRANSMISSÃO.</strong><br/></>}
                                            MOTIVO DA DEVOLUÇÃO: {selectedReturn.reason ? selectedReturn.reason.toUpperCase() : 'AVARIA / TROCA'}.<br/>
                                            {selectedReturn.notes && <>OBSERVAÇÕES: {selectedReturn.notes.toUpperCase()}<br/></>}
                                            DOCUMENTO EMITIDO POR ME/EPP OPTANTE PELO SIMPLES NACIONAL. NÃO GERA DIREITO A CRÉDITO FISCAL DE IPI.<br/>
                                            FARMA BUS ERP - GESTÃO FISCAL comercial.
                                        </div>
                                    </div>
                                    <div className="danfe-col flex-1 border-left pl-2">
                                        <div className="danfe-label-sm">RESERVADO AO FISCO</div>
                                        <div className="danfe-val-sm"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer no-print">
                            <button className="btn btn-secondary" onClick={handlePrintDANFE}>
                                <Printer size={16} /> Imprimir DANFE Devolução
                            </button>
                            {selectedReturn.fiscal_status === 'draft' && (
                                <div className="footer-btns">
                                    <button className="btn btn-warning" onClick={() => handleEmitContingency(selectedReturn.id)} disabled={emittingNf}>
                                        ⚡ Emitir em Contingência (SEFAZ Offline)
                                    </button>
                                    <button className="btn btn-primary" onClick={() => handleEmitNF(selectedReturn.id)} disabled={emittingNf}>
                                        <ShieldCheck size={16} /> {emittingNf ? 'Transmitindo...' : 'Transmitir SEFAZ'}
                                    </button>
                                </div>
                            )}
                            {selectedReturn.fiscal_status === 'contingency' && (
                                <button className="btn btn-success" onClick={() => handleSyncContingency(selectedReturn.id)} disabled={emittingNf}>
                                    <RotateCcw size={16} /> {emittingNf ? 'Transmitindo...' : 'Sincronizar & Transmitir SEFAZ'}
                                </button>
                            )}
                            {selectedReturn.fiscal_status === 'emitted' && (
                                <span className="badge badge-success fs-6"><CheckCircle2 size={16} className="me-1" /> NF-e Homologada SEFAZ</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <ManagerAuthModal 
                isOpen={showManagerAuth}
                onClose={() => setShowManagerAuth(false)}
                onConfirm={(authData) => executeCreateReturn(authData)}
                title="Autorização Gerencial para Cancelamento da Venda & NF-e"
                actionDescription={`O cancelamento da Venda #${saleId || 'associada'} estorna os valores no caixa e transmitirá o Evento de Cancelamento de NF-e para a SEFAZ (evitando tributação). Digite a senha do Gerente ou Administrador para autorizar.`}
            />
        </div>
    );
};

export default ReturnsPage;
