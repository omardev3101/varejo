import React, { useState } from 'react';
import { X, Save, AlertCircle, Search } from 'lucide-react';
import api from '../services/api';
import './ProductModal.css';
import WebImageSearchModal from './WebImageSearchModal';
import { SECTIONS, getSectionByCode } from '../constants/sections';

const ProductModal = ({ isOpen, onClose, onSuccess, initialData = null }) => {
    const [activeTab, setActiveTab] = useState('geral');
    const [isWebSearchOpen, setIsWebSearchOpen] = useState(false);
    
    const [formData, setFormData] = useState(initialData || {
        // Geral
        name: '', ean: '', ncm: '', category_id: '',
        section: '', section_code: '',
        manufacturer: '', brand: '', product_line: '', unit: 'UN',
        continuous_use: false, weight: 0, print_label: true, location: '',
        is_controlled: false, regulation_portaria: '', ms_registry: '',
        
        // Precificação
        cost: 0, markup: 30, profit_margin: 30, price: 0,
        max_discount_percentage: 0,
        pays_commission: false, commission_percentage: 0,
        is_promotional: false, promo_start_date: '', promo_end_date: '',
        wholesale_price: 0, wholesale_min_qty: 0, free_price: false, bonus_percentage: 0,

        // Tributação
        tax_type: 'ST', tax_situation: '', cst_csosn: '500', cfop: '5405', cest: '',
        origin: '0', cst_pis: '04', cst_cofins: '04', pis_percentage: 0, cofins_percentage: 0,
        icms_percentage: 0, icms_base: 100, icms_reduced_base: 0, fiscal_list: 'N',

        // Estoque & Compras
        min_stock: '', purchase_packaging: 1, reference_code: '', default_supplier_id: '',
        
        // Estoque Inicial (Apenas para novos)
        initial_batch: '', initial_expiry: '', initial_qty: 0
    });

    const [loading, setLoading] = useState(false);
    const [image, setImage] = useState(null);
    const [categories, setCategories] = useState([]);
    const [suppliers, setSuppliers] = useState([]);

    React.useEffect(() => {
        if (!isOpen) return;
        const fetchData = async () => {
            try {
                const [catRes, supRes] = await Promise.all([
                    api.get('/categories'),
                    api.get('/inventory/suppliers')
                ]);
                setCategories(catRes.data);
                setSuppliers(supRes.data);
            } catch (err) {
                console.error('Error fetching dependencies');
            }
        };
        fetchData();
        
        if (initialData) {
            setFormData({...initialData});
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        
        setFormData(prev => {
            let newState = { ...prev, [name]: val };
            
            // Auto-apply section tax percentage when section is selected
            if (name === 'section_code') {
                const sec = getSectionByCode(val);
                if (sec) {
                    newState.section = sec.name;
                    newState.section_code = sec.code;
                    newState.icms_percentage = sec.default_icms;
                    newState.tax_type = sec.default_tax_type;
                    newState.cst_csosn = sec.default_cst;
                    newState.fiscal_list = sec.default_fiscal_list;
                } else {
                    newState.section = '';
                    newState.section_code = '';
                }
            }

            // Auto-calculate price if cost or markup/margin changes
            if (name === 'cost' || name === 'profit_margin') {
                const cost = name === 'cost' ? parseFloat(val || 0) : parseFloat(prev.cost || 0);
                const margin = name === 'profit_margin' ? parseFloat(val || 0) : parseFloat(prev.profit_margin || 0);
                newState.price = (cost * (1 + margin / 100)).toFixed(2);
                newState.markup = margin; // Keep legacy markup synced
            }
            
            return newState;
        });
    };

    const handleImageChange = (e) => {
        setImage(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Clean empty strings for numeric/foreign keys
            const payload = { ...formData };
            payload.cost = payload.cost === '' || payload.cost === null || payload.cost === undefined ? 0 : parseFloat(payload.cost);
            payload.price = payload.price === '' || payload.price === null || payload.price === undefined ? 0 : parseFloat(payload.price);
            payload.weight = payload.weight === '' || payload.weight === null ? 0 : parseFloat(payload.weight);
            payload.profit_margin = payload.profit_margin === '' || payload.profit_margin === null ? 0 : parseFloat(payload.profit_margin);
            payload.max_discount_percentage = payload.max_discount_percentage === '' || payload.max_discount_percentage === null ? 0 : parseFloat(payload.max_discount_percentage);
            payload.commission_percentage = payload.commission_percentage === '' || payload.commission_percentage === null ? 0 : parseFloat(payload.commission_percentage);
            payload.wholesale_price = payload.wholesale_price === '' || payload.wholesale_price === null ? 0 : parseFloat(payload.wholesale_price);
            payload.wholesale_min_qty = payload.wholesale_min_qty === '' || payload.wholesale_min_qty === null ? 0 : parseInt(payload.wholesale_min_qty, 10);
            payload.bonus_percentage = payload.bonus_percentage === '' || payload.bonus_percentage === null ? 0 : parseFloat(payload.bonus_percentage);
            payload.pis_percentage = payload.pis_percentage === '' || payload.pis_percentage === null ? 0 : parseFloat(payload.pis_percentage);
            payload.cofins_percentage = payload.cofins_percentage === '' || payload.cofins_percentage === null ? 0 : parseFloat(payload.cofins_percentage);
            payload.icms_percentage = payload.icms_percentage === '' || payload.icms_percentage === null ? 0 : parseFloat(payload.icms_percentage);
            payload.icms_base = payload.icms_base === '' || payload.icms_base === null ? 100 : parseFloat(payload.icms_base);
            payload.icms_reduced_base = payload.icms_reduced_base === '' || payload.icms_reduced_base === null ? 0 : parseFloat(payload.icms_reduced_base);
            payload.purchase_packaging = payload.purchase_packaging === '' || payload.purchase_packaging === null ? 1 : parseInt(payload.purchase_packaging, 10);

            if (payload.min_stock === '') payload.min_stock = null;
            if (payload.category_id === '') payload.category_id = null;
            if (payload.default_supplier_id === '') payload.default_supplier_id = null;
            if (payload.promo_start_date === '') payload.promo_start_date = null;
            if (payload.promo_end_date === '') payload.promo_end_date = null;

            let product;
            if (initialData?.id) {
                const productRes = await api.put(`/products/${initialData.id}`, payload);
                product = productRes.data;
            } else {
                const productRes = await api.post('/products', payload);
                product = productRes.data;
                
                // Add Initial Batch if qty > 0 and it's a new product
                if (formData.initial_qty > 0) {
                    await api.post(`/products/${product.id}/batches`, {
                        batch_number: formData.initial_batch || 'LOTE-INICIAL',
                        expiry_date: formData.initial_expiry,
                        quantity: formData.initial_qty
                    });
                }
            }

            if (image) {
                const targetId = product?.id || initialData?.id;
                const imgData = new FormData();
                imgData.append('image', image);
                await api.post(`/products/${targetId}/image`, imgData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setImage(null);
            }

            if (onSuccess) await onSuccess();
            onClose();
        } catch (error) {
            alert('Erro ao salvar produto: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content glass" style={{ maxWidth: '800px' }}>
                <header className="modal-header">
                    <h2>{initialData ? 'Editar Produto' : 'Cadastrar Novo Produto'}</h2>
                    <button onClick={onClose} className="close-btn"><X size={24} /></button>
                </header>

                <div className="tabs-header" style={{ padding: '0 24px', marginTop: '16px' }}>
                    <button type="button" className={`tab-btn ${activeTab === 'geral' ? 'active' : ''}`} onClick={() => setActiveTab('geral')}>Geral</button>
                    <button type="button" className={`tab-btn ${activeTab === 'precificacao' ? 'active' : ''}`} onClick={() => setActiveTab('precificacao')}>Precificação & Comercial</button>
                    <button type="button" className={`tab-btn ${activeTab === 'tributacao' ? 'active' : ''}`} onClick={() => setActiveTab('tributacao')}>Tributação</button>
                    <button type="button" className={`tab-btn ${activeTab === 'estoque' ? 'active' : ''}`} onClick={() => setActiveTab('estoque')}>Estoque & Compras</button>
                </div>

                <form onSubmit={handleSubmit} className="product-form" style={{ padding: '0 24px 24px' }}>
                    
                    {activeTab === 'geral' && (
                        <div className="form-section" style={{ border: 'none', padding: 0 }}>
                            <div className="form-row">
                                <div className="form-group" style={{ flex: 2 }}>
                                    <label>Nome / Descrição</label>
                                    <input name="name" value={formData.name} onChange={handleChange} required />
                                </div>
                                <div className="form-group">
                                    <label>Cód. Barras (EAN)</label>
                                    <input name="ean" value={formData.ean} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label>Registro MS (ANVISA)</label>
                                    <input name="ms_registry" value={formData.ms_registry || ''} onChange={handleChange} />
                                </div>
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Fabricante</label>
                                    <input name="manufacturer" value={formData.manufacturer} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label>Marca</label>
                                    <input name="brand" value={formData.brand} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label>Linha</label>
                                    <input name="product_line" value={formData.product_line} onChange={handleChange} />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group" style={{ flex: 1.2 }}>
                                    <label style={{ fontWeight: 'bold', color: '#38bdf8' }}>Seção (Código | Nome)</label>
                                    <select name="section_code" value={formData.section_code || ''} onChange={handleChange} style={{ fontWeight: 'bold' }}>
                                        <option value="">Selecione a Seção...</option>
                                        {SECTIONS.map(sec => (
                                            <option key={sec.code} value={sec.code}>
                                                [{sec.code}] {sec.label} ({sec.default_icms}% ICMS)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Categoria Interna</label>
                                    <select name="category_id" value={formData.category_id || ''} onChange={handleChange}>
                                        <option value="">Selecione...</option>
                                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ flex: 0.8 }}>
                                    <label>Unidade</label>
                                    <select name="unit" value={formData.unit} onChange={handleChange}>
                                        <option value="UN">UN - Unidade</option>
                                        <option value="CX">CX - Caixa</option>
                                        <option value="FR">FR - Frasco</option>
                                        <option value="KG">KG - Quilograma</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ flex: 0.8 }}>
                                    <label>Peso (Kg)</label>
                                    <input type="number" step="0.001" name="weight" value={formData.weight} onChange={handleChange} />
                                </div>
                            </div>

                            <div className="form-row" style={{ alignItems: 'center' }}>
                                <div className="checkbox-group">
                                    <input type="checkbox" id="continuous_use" name="continuous_use" checked={formData.continuous_use} onChange={handleChange} />
                                    <label htmlFor="continuous_use">Uso Contínuo</label>
                                </div>
                                <div className="checkbox-group">
                                    <input type="checkbox" id="is_controlled" name="is_controlled" checked={formData.is_controlled} onChange={handleChange} />
                                    <label htmlFor="is_controlled">Controlado (Portaria)</label>
                                </div>
                                <div className="form-group">
                                    <input name="regulation_portaria" value={formData.regulation_portaria || ''} onChange={handleChange} placeholder="Ex: 344/98" disabled={!formData.is_controlled} />
                                </div>
                            </div>
                            
                            <div className="form-row" style={{ marginTop: '12px', alignItems: 'flex-end' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Upload de Arquivo</label>
                                    <input type="file" accept="image/*" onChange={handleImageChange} />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>URL da Imagem (Link Web)</label>
                                    <input name="image_url" value={formData.image_url || ''} onChange={handleChange} placeholder="https://exemplo.com/foto.jpg" />
                                </div>
                                <div className="form-group" style={{ flex: '0 0 auto' }}>
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary" 
                                        onClick={() => setIsWebSearchOpen(true)}
                                        style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '6px', background: '#0284c7', color: '#fff', border: 'none' }}
                                    >
                                        <Search size={16} /> Buscar Foto na Web
                                    </button>
                                </div>
                            </div>

                            <WebImageSearchModal 
                                isOpen={isWebSearchOpen}
                                onClose={() => setIsWebSearchOpen(false)}
                                initialQuery={formData.name}
                                initialEan={formData.ean}
                                onSelectImage={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
                            />

                            {(image || formData.image_url) && (
                                <div className="image-preview-container mb-3" style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px', textAlign: 'center', marginTop: '8px' }}>
                                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Pré-visualização da Imagem:</span>
                                    <img 
                                        src={image ? URL.createObjectURL(image) : formData.image_url} 
                                        alt="Preview" 
                                        style={{ maxHeight: '100px', objectFit: 'contain', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'precificacao' && (
                        <div className="form-section" style={{ border: 'none', padding: 0 }}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Preço Custo (R$)</label>
                                    <input type="number" step="0.01" name="cost" value={formData.cost} onChange={handleChange} required />
                                </div>
                                <div className="form-group">
                                    <label>Margem (%)</label>
                                    <input type="number" step="0.01" name="profit_margin" value={formData.profit_margin} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label>Preço Venda (R$)</label>
                                    <input type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} required />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Desc. Máximo (%)</label>
                                    <input type="number" step="0.01" name="max_discount_percentage" value={formData.max_discount_percentage} onChange={handleChange} />
                                </div>
                                <div className="checkbox-group" style={{ marginTop: '28px' }}>
                                    <input type="checkbox" id="pays_commission" name="pays_commission" checked={formData.pays_commission} onChange={handleChange} />
                                    <label htmlFor="pays_commission">Paga Comissão</label>
                                </div>
                                <div className="form-group">
                                    <label>Comissão (%)</label>
                                    <input type="number" step="0.01" name="commission_percentage" value={formData.commission_percentage} onChange={handleChange} disabled={!formData.pays_commission} />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Preço Atacado (R$)</label>
                                    <input type="number" step="0.01" name="wholesale_price" value={formData.wholesale_price} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label>Qtd. Mín. Atacado</label>
                                    <input type="number" name="wholesale_min_qty" value={formData.wholesale_min_qty} onChange={handleChange} />
                                </div>
                                <div className="checkbox-group" style={{ marginTop: '28px' }}>
                                    <input type="checkbox" id="free_price" name="free_price" checked={formData.free_price} onChange={handleChange} />
                                    <label htmlFor="free_price">Preço Livre no PDV</label>
                                </div>
                            </div>

                            <div className="form-row" style={{ alignItems: 'center' }}>
                                <div className="checkbox-group">
                                    <input type="checkbox" id="is_promotional" name="is_promotional" checked={formData.is_promotional} onChange={handleChange} />
                                    <label htmlFor="is_promotional">Em Promoção</label>
                                </div>
                                <div className="form-group">
                                    <label>Início Promoção</label>
                                    <input type="date" name="promo_start_date" value={formData.promo_start_date || ''} onChange={handleChange} disabled={!formData.is_promotional} />
                                </div>
                                <div className="form-group">
                                    <label>Fim Promoção</label>
                                    <input type="date" name="promo_end_date" value={formData.promo_end_date || ''} onChange={handleChange} disabled={!formData.is_promotional} />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'tributacao' && (
                        <div className="form-section" style={{ border: 'none', padding: 0 }}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>NCM</label>
                                    <input name="ncm" value={formData.ncm || ''} onChange={handleChange} placeholder="3004.90.19" />
                                </div>
                                <div className="form-group">
                                    <label>Tipo Tributação </label>
                                    <select name="tax_type" value={formData.tax_type || 'ST'} onChange={handleChange} style={{ fontWeight: 'bold', color: '#10b981' }}>
                                        <option value="TR">TR - Tributado Integralmente</option>
                                        <option value="ST">ST - Substituição Tributária / Monofásico</option>
                                        <option value="IS">IS - Isento</option>
                                        <option value="NT">NT - Não Tributado / Imune</option>
                                        <option value="SN">SN - Simples Nacional</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Lista Produtos (CMED / ANVISA)</label>
                                    <select name="fiscal_list" value={formData.fiscal_list || 'N'} onChange={handleChange}>
                                        <option value="N">N - Neutra (Outros Produtos / Suplementos)</option>
                                        <option value="P">P - Positiva (Alíquota Zero / Crédito Presumido)</option>
                                        <option value="M">M - Negativa (Tributação Normal PIS/COFINS)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>CST / CSOSN ICMS</label>
                                    <select name="cst_csosn" value={formData.cst_csosn || '500'} onChange={handleChange}>
                                        <option value="00">00 - Tributada integralmente</option>
                                        <option value="20">20 - Com redução de base de cálculo</option>
                                        <option value="40">40 - Isenta</option>
                                        <option value="41">41 - Não tributada</option>
                                        <option value="60">60 - ICMS cobrado anteriormente por ST</option>
                                        <option value="102">102 - Simples Nacional sem permissão de crédito</option>
                                        <option value="103">103 - Simples Nacional isenção do ICMS</option>
                                        <option value="500">500 - Simples Nacional ICMS cobrado por ST</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>CFOP Padrão Venda</label>
                                    <select name="cfop" value={formData.cfop || '5405'} onChange={handleChange}>
                                        <option value="5102">5102 - Venda Mercadoria Terceiros</option>
                                        <option value="5405">5405 - Venda Mercadoria ST Terceiros</option>
                                        <option value="5101">5101 - Venda Produção Estabelecimento</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>CEST (Substituição Tributária)</label>
                                    <input name="cest" value={formData.cest || ''} onChange={handleChange} placeholder="Ex: 13.001.00" />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Origem da Mercadoria</label>
                                    <select name="origin" value={formData.origin || '0'} onChange={handleChange}>
                                        <option value="0">0 - Nacional</option>
                                        <option value="1">1 - Estrangeira Importação Direta</option>
                                        <option value="2">2 - Estrangeira Adquirida no Mercado Interno</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>CST PIS</label>
                                    <select name="cst_pis" value={formData.cst_pis || '04'} onChange={handleChange}>
                                        <option value="01">01 - Tributável Alíquota Básica</option>
                                        <option value="04">04 - Monofásica (Alíquota Zero)</option>
                                        <option value="06">06 - Alíquota Zero</option>
                                        <option value="49">49 - Outras Operações Saída</option>
                                        <option value="99">99 - Outras Operações</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>CST COFINS</label>
                                    <select name="cst_cofins" value={formData.cst_cofins || '04'} onChange={handleChange}>
                                        <option value="01">01 - Tributável Alíquota Básica</option>
                                        <option value="04">04 - Monofásica (Alíquota Zero)</option>
                                        <option value="06">06 - Alíquota Zero</option>
                                        <option value="49">49 - Outras Operações Saída</option>
                                        <option value="99">99 - Outras Operações</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>ICMS (%)</label>
                                    <input type="number" step="0.01" name="icms_percentage" value={formData.icms_percentage} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label>Base ICMS (%)</label>
                                    <input type="number" step="0.01" name="icms_base" value={formData.icms_base} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label>Redução Base (%)</label>
                                    <input type="number" step="0.01" name="icms_reduced_base" value={formData.icms_reduced_base} onChange={handleChange} />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'estoque' && (
                        <div className="form-section" style={{ border: 'none', padding: 0 }}>
                            {initialData && (
                                <div className="form-row">
                                    <div className="form-group" style={{ maxWidth: '200px' }}>
                                        <label>Quantidade em Estoque</label>
                                        <input type="number" name="stock_qty" value={formData.stock_qty ?? 0} onChange={handleChange} style={{ borderColor: 'var(--primary)', fontWeight: 'bold' }} />
                                    </div>
                                </div>
                            )}
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Estoque Mínimo</label>
                                    <input type="number" name="min_stock" value={formData.min_stock} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label>Embalagem Compra (Qtd)</label>
                                    <input type="number" name="purchase_packaging" value={formData.purchase_packaging} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label>Localização Física</label>
                                    <input name="location" value={formData.location || ''} onChange={handleChange} placeholder="Ex: Corredor 3, Prat B" />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Distribuidor Preferencial</label>
                                    <select name="default_supplier_id" value={formData.default_supplier_id || ''} onChange={handleChange}>
                                        <option value="">Selecione...</option>
                                        {suppliers.map(sup => <option key={sup.id} value={sup.id}>{sup.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Código referencia</label>
                                    <input name="reference_code" value={formData.reference_code || ''} onChange={handleChange} />
                                </div>
                                <div className="checkbox-group" style={{ marginTop: '28px' }}>
                                    <input type="checkbox" id="print_label" name="print_label" checked={formData.print_label} onChange={handleChange} />
                                    <label htmlFor="print_label">Imprimir Etiqueta</label>
                                </div>
                            </div>
                            
                            {!initialData && (
                                <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                                    <h4 style={{ marginBottom: '16px', color: 'var(--text-main)' }}>Estoque Inicial</h4>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Nº do Lote</label>
                                            <input name="initial_batch" value={formData.initial_batch} onChange={handleChange} placeholder="ABC1234" />
                                        </div>
                                        <div className="form-group">
                                            <label>Data de Validade</label>
                                            <input type="date" name="initial_expiry" value={formData.initial_expiry} onChange={handleChange} />
                                        </div>
                                        <div className="form-group">
                                            <label>Quantidade</label>
                                            <input type="number" name="initial_qty" value={formData.initial_qty} onChange={handleChange} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="modal-actions" style={{ marginTop: '24px' }}>
                        <button type="button" onClick={onClose} className="btn-cancel">Cancelar</button>
                        <button type="submit" className="btn-save" disabled={loading}>
                            <Save size={18} />
                            {loading ? 'Salvando...' : 'Salvar Produto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProductModal;
