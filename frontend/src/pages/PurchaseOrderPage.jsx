import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { ShoppingBasket, Plus, Trash2, Printer, Search, Package, AlertCircle, CheckCircle2 } from 'lucide-react';
import './PurchaseOrderPage.css';

const PurchaseOrderPage = () => {
    const [suggestions, setSuggestions] = useState([]);
    const [orderItems, setOrderItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const response = await api.get('/inventory/purchase-suggestions');
            setSuggestions(response.data);
            
            // Auto-add suggestions to the order initially
            const initialItems = response.data.map(p => ({
                id: p.id,
                name: p.name,
                stock_qty: p.stock_qty,
                min_stock: p.min_stock ?? (p.tenant?.default_min_stock || 5),
                suggested_qty: (p.min_stock ?? (p.tenant?.default_min_stock || 5)) * 2 - p.stock_qty, // Fill up logic
                order_qty: (p.min_stock ?? (p.tenant?.default_min_stock || 5)) * 2 - p.stock_qty,
                cost: p.cost || 0
            }));
            setOrderItems(initialItems);
        } catch (error) {
            console.error('Error fetching suggestions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const searchProducts = async (term) => {
        if (term.length < 3) {
            setSearchResults([]);
            return;
        }
        try {
            const response = await api.get(`/products?search=${term}`);
            setSearchResults(response.data);
        } catch (err) {
            console.error('Search error');
        }
    };

    const addToOrder = (product) => {
        if (orderItems.find(item => item.id === product.id)) return;
        
        setOrderItems([...orderItems, {
            id: product.id,
            name: product.name,
            stock_qty: product.stock_qty,
            min_stock: product.min_stock || 5,
            order_qty: 10, // Default for manual
            cost: product.cost || 0
        }]);
        setSearchTerm('');
        setSearchResults([]);
    };

    const removeItem = (id) => {
        setOrderItems(orderItems.filter(item => item.id !== id));
    };

    const updateQty = (id, qty) => {
        setOrderItems(orderItems.map(item => 
            item.id === id ? { ...item, order_qty: parseInt(qty) || 0 } : item
        ));
    };

    const totalEstimate = orderItems.reduce((acc, item) => acc + (item.order_qty * item.cost), 0);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="page-wrapper purchase-order-page">
            <header className="page-header no-print">
                <div className="header-title">
                    <ShoppingBasket size={24} className="title-icon" />
                    <h1>Cesta de Compras Sugerida</h1>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={handlePrint}>
                        <Printer size={18} /> Imprimir Pedido
                    </button>
                </div>
            </header>

            <div className="order-layout">
                {/* Column 1: The Order Builder */}
                <div className="order-builder glass">
                    <div className="builder-header">
                        <h2>Meu Pedido de Compra</h2>
                        <span className="badge normal">{orderItems.length} itens</span>
                    </div>

                    <div className="manual-search no-print">
                        <Search size={18} />
                        <input 
                            type="text" 
                            placeholder="Adicionar outros itens essenciais..." 
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                searchProducts(e.target.value);
                            }}
                        />
                        {searchResults.length > 0 && (
                            <div className="search-dropdown glass">
                                {searchResults.map(p => (
                                    <div key={p.id} className="search-result-item" onClick={() => addToOrder(p)}>
                                        <span>{p.name}</span>
                                        <small>Estoque: {p.stock_qty}</small>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="order-table-container">
                        <table className="order-table">
                            <thead>
                                <tr>
                                    <th>Produto</th>
                                    <th>Estoque Atual</th>
                                    <th>Qtd. Pedido</th>
                                    <th>Subtotal Est.</th>
                                    <th className="no-print"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {orderItems.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center py-8">Nenhum item na cesta.</td></tr>
                                ) : orderItems.map(item => (
                                    <tr key={item.id}>
                                        <td>
                                            <div className="item-name-cell">
                                                <strong>{item.name}</strong>
                                                {item.stock_qty < item.min_stock && (
                                                    <span className="crit-label"><AlertCircle size={10} /> Abaixo do Mínimo</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>{item.stock_qty} UN</td>
                                        <td>
                                            <input 
                                                type="number" 
                                                className="qty-input"
                                                value={item.order_qty} 
                                                onChange={(e) => updateQty(item.id, e.target.value)}
                                            />
                                        </td>
                                        <td>R$ {(item.order_qty * item.cost).toFixed(2)}</td>
                                        <td className="no-print">
                                            <button className="delete-btn" onClick={() => removeItem(item.id)}><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="order-summary">
                        <div className="summary-row">
                            <span>Estimativa de Custo:</span>
                            <strong>R$ {totalEstimate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                        </div>
                    </div>
                </div>

                {/* Column 2: Quick Suggestions Panel (No print) */}
                <div className="suggestions-panel no-print">
                    <div className="panel-header">
                        <h3>Sugestões do Sistema</h3>
                        <p>Itens que atingiram o estoque crítico</p>
                    </div>
                    <div className="suggestions-list">
                        {loading ? <p>Analisando estoque...</p> : suggestions.map(p => (
                            <div key={p.id} className="suggestion-card glass">
                                <div className="s-info">
                                    <strong>{p.name}</strong>
                                    <span>Estoque: {p.stock_qty} / Mín: {p.min_stock || 5}</span>
                                </div>
                                {!orderItems.find(item => item.id === p.id) ? (
                                    <button className="add-s-btn" onClick={() => addToOrder(p)}>
                                        <Plus size={16} />
                                    </button>
                                ) : (
                                    <CheckCircle2 size={18} color="var(--success)" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PurchaseOrderPage;
