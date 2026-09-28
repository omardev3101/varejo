import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import api from '../services/api';
import { Package, Search, Truck, CheckCircle, Printer, Loader2, ChevronRight, ClipboardList } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import './ExpeditionPage.css';

const ExpeditionPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [filter, setFilter] = useState('authorized'); // authorized, separating, packed, shipped
    const [labelData, setLabelData] = useState(null);

    useEffect(() => {
        fetchOrders();
    }, [filter]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/expedition/orders?status=${filter}`);
            setOrders(response.data);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmPix = async (orderId) => {
        try {
            await api.post(`/expedition/orders/${orderId}/confirm-pix`);
            alert('✅ Pagamento PIX confirmado com sucesso! O pedido avançou para Separação.');
            fetchOrders();
            setSelectedOrder(null);
        } catch (error) {
            alert('Erro ao confirmar PIX: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleCancelOrder = async (orderId) => {
        if (window.confirm('Tem certeza que deseja cancelar este pedido?')) {
            try {
                await api.post(`/expedition/orders/${orderId}/cancel`, { reason: 'Cancelado pelo operador' });
                alert('🚫 Pedido cancelado.');
                fetchOrders();
                setSelectedOrder(null);
            } catch (error) {
                alert('Erro ao cancelar pedido: ' + (error.response?.data?.error || error.message));
            }
        }
    };

    const handleUpdateStatus = async (orderId, newStatus) => {
        try {
            await api.patch(`/expedition/orders/${orderId}/status`, { status: newStatus });
            fetchOrders();
            if (selectedOrder?.id === orderId) {
                setSelectedOrder(null);
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handlePrintLabel = async (orderId) => {
        try {
            const response = await api.get(`/expedition/orders/${orderId}/label`);
            setLabelData(response.data);
            setTimeout(() => {
                window.print();
            }, 500);
        } catch (error) {
            console.error('Error fetching label data:', error);
        }
    };

    const getStatusLabel = (status) => {
        const labels = {
            'authorized': { text: 'Autorizado', color: 'blue' },
            'separating': { text: 'Em Separação', color: 'orange' },
            'packed': { text: 'Embalado', color: 'purple' },
            'shipped': { text: 'Enviado', color: 'green' }
        };
        return labels[status] || { text: status, color: 'gray' };
    };

    return (
        <div className="expedition-container">
            <header className="page-header">
                <div className="header-title">
                    <Package className="header-icon" />
                    <div>
                        <h1>Expedição</h1>
                        <p>Gestão de pedidos e logística de entrega</p>
                    </div>
                </div>
            </header>

            <div className="expedition-tabs">
                <button 
                    className={`tab ${filter === 'authorized' ? 'active' : ''}`}
                    onClick={() => setFilter('authorized')}
                >
                    ⚡ Validação PIX / Autorizados ({filter === 'authorized' ? orders.length : '...'})
                </button>
                <button 
                    className={`tab ${filter === 'separating' ? 'active' : ''}`}
                    onClick={() => setFilter('separating')}
                >
                    Separação ({filter === 'separating' ? orders.length : '...'})
                </button>
                <button 
                    className={`tab ${filter === 'packed' ? 'active' : ''}`}
                    onClick={() => setFilter('packed')}
                >
                    Pronto para Envio ({filter === 'packed' ? orders.length : '...'})
                </button>
                <button 
                    className={`tab ${filter === 'shipped' ? 'active' : ''}`}
                    onClick={() => setFilter('shipped')}
                >
                    Em Trânsito ({filter === 'shipped' ? orders.length : '...'})
                </button>
                <button 
                    className={`tab ${filter === 'delivered' ? 'active' : ''}`}
                    onClick={() => setFilter('delivered')}
                >
                    Entregues ({filter === 'delivered' ? orders.length : '...'})
                </button>
            </div>

            <div className="expedition-content">
                {loading ? (
                    <div className="loading-state">
                        <Loader2 className="animate-spin" />
                        <p>Carregando pedidos...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="empty-state">
                        <ClipboardList size={48} />
                        <p>Nenhum pedido encontrado nesta etapa.</p>
                    </div>
                ) : (
                    <div className="orders-grid">
                        {orders.map(order => (
                            <div key={order.id} className="order-card glass" onClick={() => setSelectedOrder(order)}>
                                <div className="order-card-header">
                                    <span className="order-num">#{order.order_number}</span>
                                    <span className={`status-badge ${getStatusLabel(order.status).color}`}>
                                        {getStatusLabel(order.status).text}
                                    </span>
                                </div>
                                <div className="order-info">
                                    <p className="assoc-name">{order.associate_name}</p>
                                    <p className="dest-name">{order.tenant?.name}</p>
                                    {order.garage && (
                                        <span className="badge badge-info" style={{ display: 'inline-block', marginTop: '4px', fontSize: '11px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '2px 8px', borderRadius: '8px' }}>
                                            🚌 {order.garage}
                                        </span>
                                    )}
                                </div>
                                <div className="order-footer">
                                    <span className="item-count">{order.items?.length || 0} itens &bull; R$ {Number(order.total_amount || 0).toFixed(2)}</span>
                                    <ChevronRight size={18} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {selectedOrder && (
                    <div className="order-details-overlay" onClick={() => setSelectedOrder(null)}>
                        <div className="order-details-modal glass" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Detalhes do Pedido #{selectedOrder.order_number}</h2>
                                <button className="close-btn" onClick={() => setSelectedOrder(null)}>×</button>
                            </div>
                            
                            <div className="modal-body">
                                <div className="timeline-grid">
                                    <div className="timeline-item">
                                        <label>Compra</label>
                                        <p>{new Date(selectedOrder.purchased_at).toLocaleString('pt-BR')}</p>
                                    </div>
                                    <div className="timeline-item">
                                        <label>Recebido</label>
                                        <p>{selectedOrder.received_at ? new Date(selectedOrder.received_at).toLocaleString('pt-BR') : '--:--'}</p>
                                    </div>
                                    <div className="timeline-item">
                                        <label>Início Separação</label>
                                        <p>{selectedOrder.separation_started_at ? new Date(selectedOrder.separation_started_at).toLocaleString('pt-BR') : '--:--'}</p>
                                    </div>
                                    <div className="timeline-item">
                                        <label>Fim Separação</label>
                                        <p>{selectedOrder.separation_finished_at ? new Date(selectedOrder.separation_finished_at).toLocaleString('pt-BR') : '--:--'}</p>
                                    </div>
                                    <div className="timeline-item">
                                        <label>Início Envio</label>
                                        <p>{selectedOrder.shipping_started_at ? new Date(selectedOrder.shipping_started_at).toLocaleString('pt-BR') : '--:--'}</p>
                                    </div>
                                    <div className="timeline-item">
                                        <label>Fim Envio (Entrega)</label>
                                        <p>{selectedOrder.delivered_at ? new Date(selectedOrder.delivered_at).toLocaleString('pt-BR') : '--:--'}</p>
                                    </div>
                                </div>

                                <div className="info-section">
                                    <label>Sócio</label>
                                    <p>{selectedOrder.associate_name} (CPF/Doc: {selectedOrder.associate_id})</p>
                                </div>
                                <div className="info-section">
                                    <label>Garagem / Destino de Envio</label>
                                    <p style={{ color: '#60a5fa', fontWeight: 'bold' }}>🚌 {selectedOrder.garage || 'Garagem Geral'}</p>
                                </div>
                                <div className="info-section">
                                    <label>Forma de Entrega / Endereço</label>
                                    <p>{selectedOrder.delivery_address || selectedOrder.tenant?.name || 'Retirada'}</p>
                                </div>
                                <div className="info-section">
                                    <label>Pagamento</label>
                                    <p style={{ color: '#10b981', fontWeight: 'bold' }}>⚡ {selectedOrder.payment_method?.toUpperCase() || 'PIX'} (R$ {Number(selectedOrder.total_amount || 0).toFixed(2)})</p>
                                </div>

                                <div className="items-list">
                                    <h3>📦 Itens para Separação ({selectedOrder.items?.length || 0})</h3>
                                    {(!selectedOrder.items || selectedOrder.items.length === 0) ? (
                                        <p style={{ color: '#94a3b8', fontStyle: 'italic', padding: '10px 0' }}>Nenhum item registrado neste pedido.</p>
                                    ) : (
                                        selectedOrder.items.map((item, idx) => (
                                            <div key={idx} className="item-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', marginBottom: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <span className="item-qty" style={{ background: '#3b82f6', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold' }}>{item.quantity}x</span>
                                                    <div className="item-details">
                                                        <p className="product-name" style={{ margin: 0, fontWeight: '700', color: '#f8fafc' }}>{item.product?.name || `Produto #${item.product_id || idx + 1}`}</p>
                                                        <p className="product-sku" style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>EAN: {item.product?.ean || 'N/A'} &bull; Valor Unit.: R$ {Number(item.price_at_order || item.product?.price || 0).toFixed(2)}</p>
                                                    </div>
                                                </div>
                                                <input type="checkbox" className="item-check" style={{ width: '20px', height: '20px', accentColor: '#10b981', cursor: 'pointer' }} />
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="modal-actions">
                                {selectedOrder.status === 'authorized' && (
                                    <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                                        <button 
                                            className="btn btn-success"
                                            style={{ flex: 1, background: '#10b981', color: '#ffffff', padding: '12px 18px', fontWeight: '800', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                            onClick={() => handleConfirmPix(selectedOrder.id)}
                                        >
                                            <CheckCircle size={18} /> ✅ Confirmar Pagamento PIX e Liberar
                                        </button>
                                        <button 
                                            className="btn btn-danger"
                                            style={{ background: '#ef4444', color: '#ffffff', padding: '12px 18px', fontWeight: '700', border: 'none', borderRadius: '10px', cursor: 'pointer' }}
                                            onClick={() => handleCancelOrder(selectedOrder.id)}
                                        >
                                            🚫 Recusar / Cancelar
                                        </button>
                                    </div>
                                )}
                                {selectedOrder.status === 'separating' && (
                                    <button 
                                        className="btn btn-primary"
                                        onClick={() => handleUpdateStatus(selectedOrder.id, 'packed')}
                                    >
                                        Finalizar Embalagem
                                    </button>
                                )}
                                {selectedOrder.status === 'packed' && (
                                    <>
                                        <button 
                                            className="btn btn-outline"
                                            onClick={() => handlePrintLabel(selectedOrder.id)}
                                        >
                                            <Printer size={18} /> Imprimir Etiqueta
                                        </button>
                                        <button 
                                            className="btn btn-success"
                                            onClick={() => handleUpdateStatus(selectedOrder.id, 'shipped')}
                                        >
                                            <Truck size={18} /> Despachar Pedido
                                        </button>
                                    </>
                                )}
                                {selectedOrder.status === 'shipped' && (
                                    <button 
                                        className="btn btn-success"
                                        onClick={() => handleUpdateStatus(selectedOrder.id, 'delivered')}
                                    >
                                        <CheckCircle size={18} /> Confirmar Entrega (Sócio Recebeu)
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Portal Label for Printing */}
            {labelData && ReactDOM.createPortal(
                <div className="print-label-area">
                    <div className="ml-label">
                        <div className="ml-header">
                            <div className="ml-logo">VarejoPro</div>
                            <div className="ml-order-info">
                                <p>PEDIDO: <strong>{labelData.order_number}</strong></p>
                                <p>DATA: {new Date(labelData.print_date).toLocaleDateString('pt-BR')}</p>
                            </div>
                        </div>
                        <div className="ml-body">
                            <div className="ml-dest">
                                <label>DESTINATÁRIO</label>
                                <h3>{labelData.associate_name}</h3>
                                <p>LOJA / GARAGEM: {labelData.destination}</p>
                            </div>
                            <div className="ml-qr">
                                <QRCodeSVG value={labelData.qr_content} size={160} />
                                <p>Aponte a câmera para confirmar entrega</p>
                            </div>
                        </div>
                        <div className="ml-footer">
                            <div className="ml-bar">|| ||| || |||| || ||| || ||||</div>
                            <p>EXPEDIÇÃO CENTRAL - VAREJOPRO ERP</p>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ExpeditionPage;
