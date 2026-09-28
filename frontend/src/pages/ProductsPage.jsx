import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Package, Plus, FileUp, Search, MoreVertical, Edit, Trash2, Image, Tag } from 'lucide-react';
import './ProductsPage.css';

import ProductModal from '../components/ProductModal';
import WebImageSearchModal from '../components/WebImageSearchModal';
import { SECTIONS } from '../constants/sections';

const ProductsPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSectionFilter, setSelectedSectionFilter] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    const [isWebSearchOpen, setIsWebSearchOpen] = useState(false);
    const [searchProduct, setSearchProduct] = useState(null);

    const handleSelectWebImage = async (url) => {
        if (!searchProduct) return;
        try {
            await api.put(`/products/${searchProduct.id}`, { image_url: url });
            fetchProducts();
        } catch (err) {
            alert('Erro ao salvar foto: ' + err.message);
        }
    };

    const fetchProducts = async () => {
        try {
            const response = await api.get('/products');
            setProducts(response.data);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleXMLImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('xml', file);

        try {
            setLoading(true);
            await api.post('/inventory/import-xml', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            fetchProducts();
            alert('XML importado com sucesso!');
        } catch (error) {
            alert('Erro ao importar XML: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja excluir este produto?')) {
            try {
                await api.delete(`/products/${id}`);
                fetchProducts();
            } catch (error) {
                alert('Erro ao excluir produto.');
            }
        }
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.ean?.includes(searchTerm);
        const matchesSection = !selectedSectionFilter || p.section_code === selectedSectionFilter || p.section === selectedSectionFilter;
        return matchesSearch && matchesSection;
    });

    return (
        <div className="page-wrapper">
            <header className="page-header">
                <div className="header-title">
                    <Package size={24} className="title-icon" />
                    <h1>Gestão de Produtos</h1>
                </div>
                <div className="header-actions">
                    <label className="btn btn-secondary">
                        <FileUp size={18} />
                        Importar XML
                        <input type="file" accept=".xml" onChange={handleXMLImport} hidden />
                    </label>
                    <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                        <Plus size={18} />
                        Novo Produto
                    </button>
                </div>
            </header>

            <ProductModal 
                isOpen={isModalOpen} 
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingProduct(null);
                }} 
                onSuccess={fetchProducts} 
                initialData={editingProduct}
            />

            <div className="table-filters glass" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div className="search-input" style={{ flex: 2 }}>
                    <Search size={18} />
                    <input 
                        type="text" 
                        placeholder="Pesquisar por nome ou EAN..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <select 
                        value={selectedSectionFilter}
                        onChange={(e) => setSelectedSectionFilter(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', background: 'rgba(15,23,42,0.8)', border: '1px solid #334155', color: '#fff', borderRadius: '8px', fontSize: '13px' }}
                    >
                        <option value="">Todas as Seções</option>
                        {SECTIONS.map(sec => (
                            <option key={sec.code} value={sec.code}>
                                [{sec.code}] {sec.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="table-container glass">
                <table className="custom-table">
                    <thead>
                        <tr>
                            <th>Produto</th>
                            <th>Seção / Imposto</th>
                            <th>EAN / NCM</th>
                            <th>Estoque</th>
                            <th>Preço de Venda</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="7" className="text-center">Carregando...</td></tr>
                        ) : filteredProducts.map(product => (
                            <tr key={product.id}>
                                <td>
                                    <div className="product-info-cell">
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.name} className="product-thumb" />
                                        ) : (
                                            <div className="product-thumb placeholder">
                                                <Package size={16} />
                                            </div>
                                        )}
                                        <div className="product-name">
                                            <strong>{product.name}</strong>
                                            <span>{product.category_rel?.name || 'Sem categoria'}</span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        {product.section ? (
                                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 6px', borderRadius: '4px', width: 'fit-content' }}>
                                                [{product.section_code || '---'}] {product.section}
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Não definida</span>
                                        )}
                                        <small style={{ fontSize: '10px', color: '#10b981' }}>ICMS: {product.icms_percentage || 0}%</small>
                                    </div>
                                </td>
                                <td>
                                    <div className="product-codes">
                                        <span>{product.ean || 'SEM EAN'}</span>
                                        <small>{product.ncm || 'NCM não inf.'}</small>
                                    </div>
                                </td>
                                <td>
                                    <span className={`stock-badge ${product.stock_qty < 10 ? 'low' : ''}`}>
                                        {product.stock_qty} unid.
                                    </span>
                                </td>
                                <td>
                                    <span className="price-tag">
                                        R$ {parseFloat(product.price).toFixed(2)}
                                    </span>
                                </td>
                                <td>
                                    {product.is_controlled ? (
                                        <span className="badge controlled">Controlado</span>
                                    ) : (
                                        <span className="badge normal">Livre</span>
                                    )}
                                </td>
                                <td className="actions">
                                    <button className="action-btn" title="Buscar Foto na Web" onClick={() => { setSearchProduct(product); setIsWebSearchOpen(true); }} style={{ color: '#0284c7' }}>
                                        <Image size={16} />
                                    </button>
                                    <button className="action-btn" title="Editar Produto" onClick={() => handleEdit(product)}><Edit size={16} /></button>
                                    <button className="action-btn delete" title="Excluir Produto" onClick={() => handleDelete(product.id)}><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <WebImageSearchModal 
                isOpen={isWebSearchOpen}
                onClose={() => { setIsWebSearchOpen(false); setSearchProduct(null); }}
                initialQuery={searchProduct?.name || ''}
                initialEan={searchProduct?.ean || ''}
                onSelectImage={handleSelectWebImage}
            />
        </div>
    );
};

export default ProductsPage;
