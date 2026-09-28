import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FileUp, CheckCircle, AlertCircle, Package, Truck, ChevronRight, Search, FileText, History, Zap, Barcode } from 'lucide-react';
import './InventoryImportPage.css';
import { SECTIONS, getSectionByCode } from '../constants/sections';

const InventoryImportPage = () => {
    const [activeTab, setActiveTab] = useState('buscador');
    const [file, setFile] = useState(null);
    const [nfeKey, setNfeKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await api.get('/categories');
                setCategories(res.data || []);
            } catch (err) {
                console.error('Error fetching categories for import:', err);
            }
        };
        fetchCategories();
    }, []);

    useEffect(() => {
        if (activeTab === 'historico') {
            fetchHistory();
        }
    }, [activeTab]);

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const res = await api.get('/inventory/imported-nfe-history');
            setHistory(res.data || []);
        } catch (err) {
            console.error('Error fetching NFe history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setPreviewData(null);
        setResult(null);
        setError(null);
    };

    const handlePreviewFile = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);
        setPreviewData(null);

        const formData = new FormData();
        formData.append('xml', file);

        try {
            const response = await api.post('/inventory/preview-nfe', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const data = response.data;
            if (data && data.items) {
                data.items = data.items.map(it => {
                    const sec = getSectionByCode(it.section_code) || SECTIONS[0];
                    return {
                        ...it,
                        section_code: it.section_code || sec.code,
                        section: it.section || sec.name,
                        icms_percentage: it.icms_percentage !== undefined ? it.icms_percentage : sec.default_icms,
                        price: it.price || (parseFloat(it.cost_unit || 0) * 1.6).toFixed(2)
                    };
                });
            }
            setPreviewData(data);
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao carregar pré-visualização do XML');
        } finally {
            setLoading(false);
        }
    };

    const handlePreviewKey = async (e) => {
        e.preventDefault();
        const clean = nfeKey.replace(/\D/g, '');
        if (clean.length !== 44) {
            setError('A Chave de Acesso da NF-e deve ter exatamente 44 dígitos numéricos.');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);
        setPreviewData(null);

        try {
            const response = await api.post('/inventory/preview-nfe', { chave_acesso: clean });
            const data = response.data;
            if (data && data.items) {
                data.items = data.items.map(it => {
                    const sec = getSectionByCode(it.section_code) || SECTIONS[0];
                    return {
                        ...it,
                        section_code: it.section_code || sec.code,
                        section: it.section || sec.name,
                        icms_percentage: it.icms_percentage !== undefined ? it.icms_percentage : sec.default_icms,
                        price: it.price || (parseFloat(it.cost_unit || 0) * 1.6).toFixed(2)
                    };
                });
            }
            setPreviewData(data);
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao buscar pré-visualização da NF-e na SEFAZ');
        } finally {
            setLoading(false);
        }
    };

    const handleItemChange = (index, field, val) => {
        if (!previewData) return;
        const newItems = [...previewData.items];
        let updatedItem = { ...newItems[index], [field]: val };
        
        if (field === 'section_code') {
            const sec = getSectionByCode(val);
            if (sec) {
                updatedItem.section = sec.name;
                updatedItem.section_code = sec.code;
                updatedItem.icms_percentage = sec.default_icms;
            }
        }

        if (field === 'quantity' || field === 'cost_unit') {
            const q = parseFloat(field === 'quantity' ? val : updatedItem.quantity) || 0;
            const c = parseFloat(field === 'cost_unit' ? val : updatedItem.cost_unit) || 0;
            updatedItem.total_cost = q * c;
            if (field === 'cost_unit' && (!updatedItem.price || updatedItem.price === '0.00')) {
                updatedItem.price = (c * 1.6).toFixed(2);
            }
        }

        newItems[index] = updatedItem;
        const newTotal = newItems.reduce((acc, it) => acc + (parseFloat(it.total_cost) || 0), 0);
        setPreviewData({ ...previewData, items: newItems, total_amount: newTotal });
    };

    const handleRemoveItem = (index) => {
        if (!previewData) return;
        const newItems = previewData.items.filter((_, idx) => idx !== index);
        const newTotal = newItems.reduce((acc, it) => acc + (parseFloat(it.total_cost) || 0), 0);
        setPreviewData({ ...previewData, items: newItems, total_amount: newTotal });
    };

    const handleAddItem = () => {
        if (!previewData) return;
        const newItem = {
            item_num: previewData.items.length + 1,
            cProd: `MED-NOVO-${Date.now()}`,
            ean: '',
            name: 'NOVO MEDICAMENTO / PRODUTO',
            ncm: '30049099',
            cfop: '5405',
            unit: 'UN',
            quantity: 10,
            cost_unit: 5.00,
            total_cost: 50.00,
            batch_number: `LOT-${Date.now()}`,
            expiry_date: '2028-12-31'
        };
        const newItems = [...previewData.items, newItem];
        const newTotal = newItems.reduce((acc, it) => acc + (parseFloat(it.total_cost) || 0), 0);
        setPreviewData({ ...previewData, items: newItems, total_amount: newTotal });
    };

    const handleConfirmImport = async () => {
        if (!previewData) return;
        setLoading(true);
        setError(null);

        try {
            const response = await api.post('/inventory/confirm-import', {
                nfe_key: previewData.nfe_key,
                supplier: previewData.supplier,
                items: previewData.items,
                xml_content: previewData.xml_content
            });
            setResult(response.data);
            setPreviewData(null);
            setFile(null);
            setNfeKey('');
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao confirmar importação da NF-e');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-wrapper">
            <header className="page-header">
                <div className="header-title">
                    <Search size={26} className="title-icon" />
                    <div>
                        <h1>Buscador e Importador de NF-e</h1>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Localize notas fiscais na SEFAZ pela Chave de Acesso ou faça upload de arquivos XML.</p>
                    </div>
                </div>
            </header>

            <div className="import-tabs glass">
                <button className={`tab-btn ${activeTab === 'buscador' ? 'active' : ''}`} onClick={() => setActiveTab('buscador')}>
                    <Search size={16} /> Buscador por Chave NF-e
                </button>
                <button className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveTab('upload')}>
                    <FileUp size={16} /> Upload de Arquivo XML
                </button>
                <button className={`tab-btn ${activeTab === 'historico' ? 'active' : ''}`} onClick={() => setActiveTab('historico')}>
                    <History size={16} /> Notas Fiscais Importadas
                </button>
            </div>

            <div className="import-container">
                {activeTab === 'buscador' && (
                    <div className="search-box-card glass">
                        <div className="card-top">
                            <Barcode size={36} color="#10b981" />
                            <div>
                                <h3>Consulta e Importação por Chave de Acesso</h3>
                                <p>Digite ou bipe o código de barras da DANFE com 44 dígitos</p>
                            </div>
                        </div>

                        <form onSubmit={handlePreviewKey} className="search-form mt-4">
                            <div className="key-input-wrapper">
                                <input 
                                    type="text" 
                                    value={nfeKey}
                                    onChange={(e) => setNfeKey(e.target.value)}
                                    placeholder="Ex: 35260812345678000199550010000012341000001234"
                                    maxLength={44}
                                    className="key-input"
                                />
                                <span className={`counter ${nfeKey.replace(/\D/g, '').length === 44 ? 'valid' : ''}`}>
                                    {nfeKey.replace(/\D/g, '').length}/44
                                </span>
                            </div>

                            <button type="submit" className="btn btn-emerald btn-search-nfe mt-3" disabled={loading || nfeKey.replace(/\D/g, '').length !== 44}>
                                <Search size={18} />
                                {loading ? 'Carregando Pré-Visualização...' : 'Visualizar e Conferir NF-e'}
                            </button>
                        </form>
                    </div>
                )}

                {activeTab === 'upload' && !previewData && (
                    <div className="upload-box glass">
                        <FileUp size={48} color="var(--primary)" />
                        <h3>Selecione o arquivo XML da NF-e</h3>
                        <p>Arraste ou clique para selecionar o arquivo da nota fiscal</p>
                        <input 
                            type="file" 
                            accept=".xml" 
                            onChange={handleFileChange} 
                            className="file-input"
                            id="xml-upload"
                        />
                        <label htmlFor="xml-upload" className="btn btn-secondary">
                            {file ? file.name : 'Escolher Arquivo'}
                        </label>

                        {file && (
                            <button 
                                className="btn btn-primary mt-4" 
                                onClick={handlePreviewFile}
                                disabled={loading}
                            >
                                {loading ? 'Carregando...' : 'Visualizar e Conferir XML'}
                            </button>
                        )}
                    </div>
                )}

                {previewData && (
                    <div className="preview-nfe-card glass mt-4">
                        <div className="preview-header">
                            <div>
                                <h2 style={{ color: '#10b981', margin: 0, fontSize: '20px' }}>Conferência da Nota Fiscal de Entrada</h2>
                                <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                                    NF-e N° <strong>{previewData.nfe_number}</strong> | Série: <strong>{previewData.series}</strong> | Emissão: <strong>{previewData.issue_date}</strong>
                                </p>
                                <p style={{ fontFamily: 'monospace', fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' }}>
                                    Chave: {previewData.nfe_key}
                                </p>
                            </div>
                            <div className="nfe-total-badge">
                                <span>Valor Total da Nota</span>
                                <strong>R$ {parseFloat(previewData.total_amount).toFixed(2)}</strong>
                            </div>
                        </div>

                        <div className="supplier-details-grid mt-3 glass" style={{ padding: '14px', borderRadius: '10px' }}>
                            <div><strong>Fornecedor:</strong> {previewData.supplier.name}</div>
                            <div><strong>CNPJ:</strong> {previewData.supplier.cnpj}</div>
                            <div><strong>Inscrição Estadual:</strong> {previewData.supplier.ie}</div>
                            <div><strong>Endereço:</strong> {previewData.supplier.address}</div>
                        </div>

                        <div className="items-table-wrapper mt-4">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <h3 style={{ fontSize: '15px', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Package size={18} color="#10b981" /> Produtos e Produtos da Nota Fiscal ({previewData.items.length})
                                </h3>
                                <button className="btn btn-secondary btn-sm" onClick={handleAddItem} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    ➕ Adicionar Item à Nota
                                </button>
                            </div>
                            <table className="custom-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Cód / EAN</th>
                                        <th>Descrição do Produto</th>
                                        <th style={{ color: '#38bdf8' }}>Seção (Mercadológica)</th>
                                        <th style={{ color: '#10b981' }}>ICMS %</th>
                                        <th>Preço Venda (R$)</th>
                                        <th>Lote</th>
                                        <th>Validade</th>
                                        <th>Qtd</th>
                                        <th>Custo (R$)</th>
                                        <th>Total (R$)</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewData.items.map((it, idx) => (
                                        <tr key={idx}>
                                            <td>{idx + 1}</td>
                                            <td style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                                                <input 
                                                    type="text" 
                                                    value={it.ean || it.cProd} 
                                                    onChange={(e) => handleItemChange(idx, 'ean', e.target.value)}
                                                    style={{ width: '100px', background: 'rgba(15,23,42,0.8)', border: '1px solid #334155', color: '#fff', padding: '4px 6px', borderRadius: '4px', fontSize: '11px' }}
                                                />
                                            </td>
                                            <td>
                                                <input 
                                                    type="text" 
                                                    value={it.name} 
                                                    onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                                                    style={{ width: '100%', minWidth: '160px', background: 'rgba(15,23,42,0.8)', border: '1px solid #334155', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold' }}
                                                />
                                            </td>
                                            <td>
                                                <select
                                                    value={it.section_code || ''}
                                                    onChange={(e) => handleItemChange(idx, 'section_code', e.target.value)}
                                                    style={{ width: '130px', background: 'rgba(15,23,42,0.9)', border: '1px solid #0284c7', color: '#38bdf8', padding: '4px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}
                                                >
                                                    <option value="">Selecione...</option>
                                                    {SECTIONS.map(sec => (
                                                        <option key={sec.code} value={sec.code}>
                                                            [{sec.code}] {sec.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    value={it.icms_percentage !== undefined ? it.icms_percentage : 0} 
                                                    onChange={(e) => handleItemChange(idx, 'icms_percentage', e.target.value)}
                                                    style={{ width: '60px', background: 'rgba(15,23,42,0.8)', border: '1px solid #10b981', color: '#10b981', padding: '4px 6px', borderRadius: '4px', fontSize: '12px', textAlign: 'center', fontWeight: 'bold' }}
                                                />
                                            </td>
                                            <td>
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    value={it.price || 0} 
                                                    onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                                                    style={{ width: '75px', background: 'rgba(15,23,42,0.8)', border: '1px solid #f59e0b', color: '#f59e0b', padding: '4px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}
                                                />
                                            </td>
                                            <td>
                                                <input 
                                                    type="text" 
                                                    value={it.batch_number} 
                                                    onChange={(e) => handleItemChange(idx, 'batch_number', e.target.value)}
                                                    style={{ width: '80px', background: 'rgba(15,23,42,0.8)', border: '1px solid #334155', color: '#60a5fa', padding: '4px 6px', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}
                                                />
                                            </td>
                                            <td>
                                                <input 
                                                    type="date" 
                                                    value={it.expiry_date} 
                                                    onChange={(e) => handleItemChange(idx, 'expiry_date', e.target.value)}
                                                    style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid #334155', color: '#fff', padding: '4px 4px', borderRadius: '4px', fontSize: '11px' }}
                                                />
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <input 
                                                    type="number" 
                                                    value={it.quantity} 
                                                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                                    style={{ width: '55px', background: 'rgba(15,23,42,0.8)', border: '1px solid #334155', color: '#fff', padding: '4px 4px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}
                                                />
                                            </td>
                                            <td>
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    value={it.cost_unit} 
                                                    onChange={(e) => handleItemChange(idx, 'cost_unit', e.target.value)}
                                                    style={{ width: '65px', background: 'rgba(15,23,42,0.8)', border: '1px solid #334155', color: '#fff', padding: '4px 4px', borderRadius: '4px', fontSize: '12px' }}
                                                />
                                            </td>
                                            <td style={{ fontWeight: 'bold', color: '#10b981' }}>
                                                R$ {parseFloat(it.total_cost || 0).toFixed(2)}
                                            </td>
                                            <td>
                                                <button 
                                                    type="button"
                                                    onClick={() => handleRemoveItem(idx)}
                                                    style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#ef4444', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                                                    title="Remover item da nota"
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="preview-actions mt-4">
                            <button className="btn btn-secondary" onClick={() => setPreviewData(null)} disabled={loading}>
                                Cancelar / Outra Nota
                            </button>
                            <button className="btn btn-emerald btn-large" onClick={handleConfirmImport} disabled={loading} style={{ padding: '14px 28px', fontSize: '15px' }}>
                                <CheckCircle size={20} />
                                {loading ? 'Dando Entrada no Estoque...' : 'Confirmar Importação e Dar Entrada no Estoque'}
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'historico' && (
                    <div className="history-box glass">
                        <h3><History size={18} /> Histórico de Notas Fiscais Recebidas</h3>
                        {loadingHistory ? (
                            <p style={{ padding: '20px', textAlign: 'center' }}>Carregando histórico de XMLs...</p>
                        ) : history.length === 0 ? (
                            <p style={{ padding: '20px', color: 'var(--text-muted)', textAlign: 'center' }}>Nenhum XML importado até o momento nesta unidade.</p>
                        ) : (
                            <table className="custom-table mt-3">
                                <thead>
                                    <tr>
                                        <th>Chave de Acesso NF-e</th>
                                        <th>Data da Entrada</th>
                                        <th>Tamanho</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((h, i) => (
                                        <tr key={i}>
                                            <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{h.key}</td>
                                            <td>{new Date(h.imported_at).toLocaleString('pt-BR')}</td>
                                            <td>{(h.size_bytes / 1024).toFixed(1)} KB</td>
                                            <td><span className="status-badge active">Importado</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {error && (
                    <div className="alert alert-error glass mt-4">
                        <AlertCircle size={20} />
                        <span>{error}</span>
                    </div>
                )}

                {result && (
                    <div className="result-box glass mt-4">
                        <div className="result-header">
                            <CheckCircle size={32} color="var(--success)" />
                            <div>
                                <h2>Importação Concluída com Sucesso!</h2>
                                <p>Fornecedor: <strong>{result.supplier}</strong> {result.nfe_key && <span>| Chave: {result.nfe_key}</span>}</p>
                            </div>
                        </div>

                        <div className="items-summary mt-4">
                            <h3>Itens Importados ({result.items?.length || 0})</h3>
                            <div className="items-list">
                                {result.items?.map((item, idx) => (
                                    <div key={idx} className="import-item">
                                        <Package size={18} />
                                        <div className="item-details">
                                            <strong>{item.name}</strong>
                                            <span>Qtd: {item.quantity} | Custo: R$ {parseFloat(item.cost).toFixed(2)}</span>
                                        </div>
                                        <ChevronRight size={16} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InventoryImportPage;
