import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Globe, TrendingUp, Wallet, AlertTriangle, Building2, ArrowUpRight, ShoppingBag, DollarSign } from 'lucide-react';
import './AdminDashboardPage.css';

const AdminDashboardPage = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchGlobalStats = async () => {
        try {
            const response = await api.get('/admin/stats');
            setData(response.data);
        } catch (error) {
            console.error('Error fetching global stats:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGlobalStats();
    }, []);

    if (loading) return <div className="loading-state glass">Consolidando dados da rede (42 unidades)...</div>;
    if (!data) return <div className="error-state glass">Erro ao carregar dados consolidados.</div>;

    return (
        <div className="admin-dashboard">
            <header className="dashboard-header">
                <div className="header-title">
                    <Globe size={28} className="title-icon" />
                    <div>
                        <h1>Dashboard Central (Master)</h1>
                        <p>Visão consolidada das {data.totalStores} lojas da rede.</p>
                    </div>
                </div>
            </header>

            <div className="stats-cards master">
                <div className="stat-card glass primary">
                    <div className="card-header">
                        <TrendingUp size={24} />
                        <span className="badge">Global</span>
                    </div>
                    <div className="card-body">
                        <h3>Faturamento Total Hoje</h3>
                        <strong>R$ {parseFloat(data.globalTodaySales).toFixed(2)}</strong>
                        <span>Soma de todas as unidades</span>
                    </div>
                </div>

                <div className="stat-card glass secondary">
                    <div className="card-header">
                        <Wallet size={24} />
                        <span className="badge">Rede</span>
                    </div>
                    <div className="card-body">
                        <h3>Dívida Global (Convênios)</h3>
                        <strong>R$ {parseFloat(data.globalPayrollDebt).toFixed(2)}</strong>
                        <span>Total pendente em toda a rede</span>
                    </div>
                </div>

                <div className="stat-card glass info">
                    <div className="card-header">
                        <Building2 size={24} />
                    </div>
                    <div className="card-body">
                        <h3>Unidades Ativas</h3>
                        <strong>{data.totalStores} / 42</strong>
                        <span>Lojas monitoradas</span>
                    </div>
                </div>
            </div>

            <div className="dashboard-grid admin">
                <div className="grid-item glass">
                    <div className="item-header">
                        <h3>Ranking de Vendas por Loja</h3>
                        <ShoppingBag size={18} />
                    </div>
                    <div className="store-list">
                        {data.salesPerStore?.map((store, index) => (
                            <div key={index} className="store-row">
                                <div className="store-rank">{index + 1}</div>
                                <div className="store-info">
                                    <span className="store-name">{store.tenant?.name || `Loja #${store.tenant_id}`}</span>
                                    <span className="store-meta">{store.total_count} vendas realizadas</span>
                                </div>
                                <div className="store-val">
                                    <strong>R$ {parseFloat(store.total_sales).toFixed(2)}</strong>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid-item glass">
                    <div className="item-header">
                        <h3>Inadimplência / Folha por Unidade</h3>
                        <AlertTriangle size={18} />
                    </div>
                    <div className="store-list">
                        {data.debtPerStore?.map((store, index) => (
                            <div key={index} className="store-row debt">
                                <div className="store-info">
                                    <span className="store-name">{store.tenant?.name || `Loja #${store.tenant_id}`}</span>
                                </div>
                                <div className="store-val">
                                    <strong className="danger-text">R$ {parseFloat(store.total_debt).toFixed(2)}</strong>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardPage;
