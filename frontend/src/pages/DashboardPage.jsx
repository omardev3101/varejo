import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { TrendingUp, ShoppingBag, AlertTriangle, Wallet, Users, Package, ArrowUpRight, ArrowDownRight, Pill } from 'lucide-react';
import './DashboardPage.css';

const DashboardPage = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchStats = async () => {
        try {
            const response = await api.get('/dashboard/stats');
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    if (loading) return <div className="loading-state glass">Carregando Painel Gerencial...</div>;
    if (error) return (
        <div className="error-state glass" style={{ padding: '40px', textAlign: 'center' }}>
            <AlertTriangle size={48} color="var(--danger)" style={{ marginBottom: '16px' }} />
            <h2>Erro ao carregar Dashboard</h2>
            <p style={{ color: 'var(--text-muted)', margin: '16px 0' }}>{error}</p>
            <button className="btn btn-primary" onClick={fetchStats}>Tentar Novamente</button>
        </div>
    );

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div>
                    <h1>Painel Gerencial</h1>
                    <p>Bem-vindo ao centro de controle da VarejoPro.</p>
                </div>
                <div className="date-badge glass">
                    {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
            </header>

            <div className="stats-cards">
                <div className="stat-card glass">
                    <div className="card-header">
                        <div className="icon-box primary">
                            <TrendingUp size={20} />
                        </div>
                        <span className="trend positive"><ArrowUpRight size={14} /> 12%</span>
                    </div>
                    <div className="card-body">
                        <h3>Vendas Hoje</h3>
                        <strong>R$ {parseFloat(stats?.today?.total || 0).toFixed(2)}</strong>
                        <span>{stats?.today?.count || 0} transações realizadas</span>
                    </div>
                </div>

                <div className="stat-card glass">
                    <div className="card-header">
                        <div className="icon-box secondary">
                            <Wallet size={20} />
                        </div>
                    </div>
                    <div className="card-body">
                        <h3>Dívida em Folha</h3>
                        <strong className="debt-text">R$ {parseFloat(stats?.totalDebt || 0).toFixed(2)}</strong>
                        <span>Total a receber dos convênios</span>
                    </div>
                </div>

                <div className="stat-card glass">
                    <div className="card-header">
                        <div className="icon-box danger">
                            <AlertTriangle size={20} />
                        </div>
                    </div>
                    <div className="card-body">
                        <h3>Estoque Crítico</h3>
                        <strong className={(stats?.lowStock || 0) > 0 ? 'warning-text' : ''}>
                            {stats?.lowStock || 0}
                        </strong>
                        <span>Produtos abaixo do limite mínimo</span>
                    </div>
                </div>

                <div className="stat-card glass">
                    <div className="card-header">
                        <div className="icon-box warning">
                            <Pill size={20} />
                        </div>
                    </div>
                    <div className="card-body">
                        <h3>Lojas</h3>
                        <strong>{stats?.tenantCount || 0}</strong>
                        <span>Unidades cadastradas no sistema</span>
                    </div>
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="grid-item glass">
                    <div className="item-header">
                        <h3>Top 5 Produtos (Mais Vendidos)</h3>
                        <Package size={18} />
                    </div>
                    <div className="top-list">
                        {(stats?.topProducts || []).map((item, index) => (
                            <div key={index} className="list-item">
                                <div className="item-rank">{index + 1}</div>
                                <div className="item-name">{item.product_sale?.name}</div>
                                <div className="item-val">{item.total_qty} un.</div>
                            </div>
                        ))}
                        {(!stats?.topProducts || stats.topProducts.length === 0) && <p className="empty-msg">Sem vendas registradas.</p>}
                    </div>
                </div>

                <div className="grid-item glass">
                    <div className="item-header">
                        <h3>Vendas por Meio de Pagamento</h3>
                        <ShoppingBag size={18} />
                    </div>
                    <div className="payment-distribution">
                        {(stats?.salesByMethod || []).map((item, index) => {
                            const methodLabels = {
                                'cash': 'Dinheiro',
                                'credit_card': 'Cartão de Crédito',
                                'debit_card': 'Cartão de Débito',
                                'payroll': 'Folha de Pagamento',
                                'pix': 'PIX'
                            };
                            return (
                                <div key={index} className="payment-row">
                                    <div className="pay-meta">
                                        <span className={`dot ${item.payment_method}`}></span>
                                        <span className="pay-name">{methodLabels[item.payment_method] || item.payment_method.toUpperCase()}</span>
                                    </div>
                                    <div className="pay-val">R$ {parseFloat(item.total).toFixed(2)}</div>
                                </div>
                            );
                        })}
                        {(!stats?.salesByMethod || stats.salesByMethod.length === 0) && <p className="empty-msg">Nenhuma transação registrada.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
