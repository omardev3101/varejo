import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Package, Search, Filter, AlertTriangle, Calendar, ChevronDown, ChevronUp, DollarSign, List, BarChart3 } from 'lucide-react';
import './StockControlPage.css';

const StockControlPage = () => {
    const [stockData, setStockData] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFormData] = useState({
        search: '',
        category_id: '',
        stock_status: 'all',
        expiry_status: 'all'
    });
    const [expandedRows, setExpandedRows] = useState([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams(filters).toString();
            const [stockRes, catResponse] = await Promise.all([
                api.get(`/inventory/stock?${query}`),
                api.get('/categories')
            ]);
            setStockData(stockRes.data);
            setCategories(catResponse.data);
        } catch (error) {
            console.error('Error fetching stock data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filters.category_id, filters.stock_status, filters.expiry_status]);

    const handleSearch = (e) => {
        if (e.key === 'Enter') fetchData();
    };

    const toggleRow = (id) => {
        setExpandedRows(prev => 
            prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
        );
    };

    const calculateValuation = () => {
        return stockData.reduce((acc, p) => {
            let productCost = p.batches?.reduce((sum, b) => sum + (parseFloat(b.cost_price) * b.quantity), 0) || 0;
            // Fallback to product.cost if batches don't have cost or are empty
            if (productCost === 0 && p.cost > 0) {
                productCost = parseFloat(p.cost) * p.stock_qty;
            }
            const productValue = parseFloat(p.price) * p.stock_qty;
            return {
                totalCost: acc.totalCost + productCost,
                totalValue: acc.totalValue + productValue
            };
        }, { totalCost: 0, totalValue: 0 });
    };

    const { totalCost, totalValue } = calculateValuation();

    return (
        <div className="page-wrapper">
            <header className="page-header">
                <div className="header-title">
                    <BarChart3 size={24} className="title-icon" />
                    <h1>Controle de Estoque Total</h1>
                </div>
            </header>

            <div className="stats-grid">
                <div className="stat-card glass primary">
                    <DollarSign size={24} />
                    <div className="stat-info">
                        <span>Valor em Estoque (Venda)</span>
                        <strong>R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                    </div>
                </div>
                <div className="stat-card glass secondary">
                    <DollarSign size={24} />
                    <div className="stat-info">
                        <span>Custo em Estoque</span>
                        <strong>R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                    </div>
                </div>
                <div className="stat-card glass warning">
                    <AlertTriangle size={24} />
                    <div className="stat-info">
                        <span>Itens Críticos</span>
                        <strong>{stockData.filter(p => p.stock_qty < (p.min_stock ?? (p.tenant?.default_min_stock || 5))).length} produtos</strong>
                    </div>
                </div>
            </div>

            <div className="filters-section glass">
                <div className="filter-group main">
                    <Search size={18} />
                    <input 
                        type="text" 
                        placeholder="Pesquisar por nome ou EAN (Pressione Enter)..." 
                        value={filters.search}
                        onChange={e => setFormData({...filters, search: e.target.value})}
                        onKeyDown={handleSearch}
                    />
                </div>
                <div className="filter-group">
                    <label>Categoria</label>
                    <select value={filters.category_id} onChange={e => setFormData({...filters, category_id: e.target.value})}>
                        <option value="">Todas</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Status Estoque</label>
                    <select value={filters.stock_status} onChange={e => setFormData({...filters, stock_status: e.target.value})}>
                        <option value="all">Todos</option>
                        <option value="low">Estoque Baixo</option>
                        <option value="zero">Sem Estoque</option>
                    </select>
                </div>
                <div className="filter-group">
                    <label>Validade</label>
                    <select value={filters.expiry_status} onChange={e => setFormData({...filters, expiry_status: e.target.value})}>
                        <option value="all">Todas</option>
                        <option value="expired">Vencidos</option>
                    </select>
                </div>
            </div>

            <div className="table-container glass">
                <table className="custom-table stock-table">
                    <thead>
                        <tr>
                            <th width="40"></th>
                            <th>Produto</th>
                            <th>Categoria</th>
                            <th>EAN</th>
                            <th>Estoque Atual</th>
                            <th>Preço Venda</th>
                            <th>Valor Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="7" className="text-center">Carregando...</td></tr>
                        ) : stockData.map(product => (
                            <React.Fragment key={product.id}>
                                <tr className={expandedRows.includes(product.id) ? 'expanded-header' : ''} onClick={() => toggleRow(product.id)}>
                                    <td>
                                        {expandedRows.includes(product.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </td>
                                    <td>
                                        <strong>{product.name}</strong>
                                    </td>
                                    <td>{product.category_rel?.name || '---'}</td>
                                    <td>{product.ean || '---'}</td>
                                    <td>
                                        <span className={`stock-badge ${product.stock_qty < (product.min_stock ?? (product.tenant?.default_min_stock || 5)) ? 'low' : ''}`}>
                                            {product.stock_qty} UN
                                        </span>
                                        <small style={{display: 'block', fontSize: '10px', color: 'var(--text-muted)'}}>
                                            Mín: {product.min_stock ?? (product.tenant?.default_min_stock || 5)}
                                        </small>
                                    </td>
                                    <td>R$ {parseFloat(product.price).toFixed(2)}</td>
                                    <td><strong>R$ {(parseFloat(product.price) * product.stock_qty).toFixed(2)}</strong></td>
                                </tr>
                                {expandedRows.includes(product.id) && (
                                    <tr className="batch-row">
                                        <td colSpan="7">
                                            <div className="batch-details">
                                                <h4>Lotes em Estoque</h4>
                                                <div className="batch-grid">
                                                    {product.batches?.length > 0 ? product.batches.map(batch => (
                                                        <div key={batch.id} className="batch-card">
                                                            <div className="b-header">
                                                                <Package size={14} />
                                                                <span>{batch.batch_number}</span>
                                                            </div>
                                                            <div className="b-body">
                                                                <div className="b-stat">
                                                                    <small>Quantidade</small>
                                                                    <span>{batch.quantity} UN</span>
                                                                </div>
                                                                <div className="b-stat">
                                                                    <small>Custo Un.</small>
                                                                    <span>R$ {parseFloat(batch.cost_price).toFixed(2)}</span>
                                                                </div>
                                                                <div className="b-stat">
                                                                    <small>Validade</small>
                                                                    <span className={new Date(batch.expiry_date) < new Date() ? 'expired-text' : ''}>
                                                                        {batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString('pt-BR') : 'N/A'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )) : <p>Nenhum lote registrado.</p>}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StockControlPage;
