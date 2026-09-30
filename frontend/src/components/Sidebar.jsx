import React, { useState } from 'react';
import { Pill, LayoutDashboard, Package, Users, Tag, ShoppingCart, FileText, Settings, LogOut, ChevronDown, ChevronRight, Shield, ShieldCheck, Truck, BarChart3, ShoppingBasket, Wallet, DollarSign, List, Globe, Unlock, ArrowUpCircle, ArrowDownCircle, Lock, Monitor, Store, RotateCcw, ArrowLeftRight, Database } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { APP_VERSION, APP_BUILD_DATE } from '../config/version';
import logo from '../assets/logo.jpg';
import './Sidebar.css';

const Sidebar = ({ onNavigate, currentPage }) => {
    const { logout, user } = useAuth();
    const [configOpen, setConfigOpen] = useState(false);
    const [inventoryOpen, setInventoryOpen] = useState(true);
    const [posOpen, setPosOpen] = useState(true);
    const [caixaOpen, setCaixaOpen] = useState(false);

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <img src={logo} alt="VarejoPro" className="sidebar-logo-img" />
                <div className="version-tag">
                    <span>{APP_VERSION} • {APP_BUILD_DATE}</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                {(user.role === 'admin' || user.role === 'superadmin') && (
                    <>
                        <div 
                            className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
                            onClick={() => onNavigate('dashboard')}
                        >
                            <LayoutDashboard size={20} />
                            <span>Dashboard Unidade</span>
                        </div>

                        <div 
                            className={`nav-item ${currentPage === 'admin-dashboard' ? 'active' : ''}`}
                            onClick={() => onNavigate('admin-dashboard')}
                        >
                            <Globe size={20} />
                            <span>Dashboard Central</span>
                        </div>
                    </>
                )}
                
                {/* Group: Inventory */}
                {(user.role === 'admin' || user.role === 'superadmin') && (
                    <div className="nav-group">
                        <div className="nav-item" onClick={() => setInventoryOpen(!inventoryOpen)}>
                            <Package size={20} />
                            <span>Inventário</span>
                            {inventoryOpen ? <ChevronDown size={16} className="chevron" /> : <ChevronRight size={16} className="chevron" />}
                        </div>
                        {inventoryOpen && (
                            <div className="sub-nav">
                                <div className={`sub-nav-item ${currentPage === 'products' ? 'active' : ''}`} onClick={() => onNavigate('products')}>
                                    <List size={16} /> <span>Lista de Produtos</span>
                                </div>
                                <div className={`sub-nav-item ${currentPage === 'stock-control' ? 'active' : ''}`} onClick={() => onNavigate('stock-control')}>
                                    <BarChart3 size={16} /> <span>Controle Estoque</span>
                                </div>
                                <div className={`sub-nav-item ${currentPage === 'inventory-import' ? 'active' : ''}`} onClick={() => onNavigate('inventory-import')}>
                                    <FileText size={16} /> <span>Entrada XML</span>
                                </div>
                                <div className={`sub-nav-item ${currentPage === 'purchase-order' ? 'active' : ''}`} onClick={() => onNavigate('purchase-order')}>
                                    <ShoppingBasket size={16} /> <span>Cesta de Compras</span>
                                </div>
                                <div className={`sub-nav-item ${currentPage === 'returns' ? 'active' : ''}`} onClick={() => onNavigate('returns')}>
                                    <RotateCcw size={16} /> <span>Devoluções & NF-e</span>
                                </div>
                                <div className={`sub-nav-item ${currentPage === 'transfers' ? 'active' : ''}`} onClick={() => onNavigate('transfers')}>
                                    <ArrowLeftRight size={16} /> <span>Transferências</span>
                                </div>
                                <div className={`sub-nav-item ${currentPage === 'fiscal' ? 'active' : ''}`} onClick={() => onNavigate('fiscal')}>
                                    <ShieldCheck size={16} /> <span>Central NF-e & Contingência</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div 
                    className={`nav-item pos-btn ${currentPage === 'pos' ? 'active' : ''}`}
                    onClick={() => onNavigate('pos')}
                >
                    <ShoppingCart size={20} />
                    <span>Vendas / Balcão</span>
                </div>

                {/* Group: Caixa (Conforme Micro-Farma) */}
                <div className="nav-group">
                    <div className="nav-item" onClick={() => setCaixaOpen(!caixaOpen)}>
                        <Wallet size={20} />
                        <span>Caixa</span>
                        {caixaOpen ? <ChevronDown size={16} className="chevron" /> : <ChevronRight size={16} className="chevron" />}
                    </div>
                    {caixaOpen && (
                        <div className="sub-nav">
                            <div className={`sub-nav-item ${currentPage === 'cashier' ? 'active' : ''}`} onClick={() => onNavigate('cashier')}>
                                <Unlock size={16} /> <span>Abertura</span>
                            </div>
                            <div className={`sub-nav-item ${currentPage === 'cashier_in' ? 'active' : ''}`} onClick={() => onNavigate('cashier')}>
                                <ArrowUpCircle size={16} /> <span>Entradas</span>
                            </div>
                            <div className={`sub-nav-item ${currentPage === 'cashier_out' ? 'active' : ''}`} onClick={() => onNavigate('cashier')}>
                                <ArrowDownCircle size={16} /> <span>Retiradas</span>
                            </div>
                            <div className={`sub-nav-item ${currentPage === 'cashier_close' ? 'active' : ''}`} onClick={() => onNavigate('cashier')}>
                                <Lock size={16} /> <span>Fechamentos</span>
                            </div>
                            <div className="nav-divider" style={{ margin: '4px 0', height: '1px', backgroundColor: '#e2e8f0' }}></div>
                            <div className={`sub-nav-item ${currentPage === 'cashier_reports' ? 'active' : ''}`} onClick={() => onNavigate('cashier')}>
                                <FileText size={16} /> <span>Relatórios</span>
                            </div>
                            <div className={`sub-nav-item ${currentPage === 'cashier_config' ? 'active' : ''}`} onClick={() => onNavigate('cashier')}>
                                <Settings size={16} /> <span>Configuração</span>
                            </div>
                            <div className={`sub-nav-item ${currentPage === 'fiscal_export' ? 'active' : ''}`} onClick={() => onNavigate('fiscal_export')}>
                                <FileText size={16} /> <span>Resumo NFC-e</span>
                            </div>
                            <div className={`sub-nav-item ${currentPage === 'cashier_prepaid' ? 'active' : ''}`} onClick={() => onNavigate('cashier')}>
                                <DollarSign size={16} /> <span>Extrato Pré-pago</span>
                            </div>
                            <div className="nav-divider" style={{ margin: '4px 0', height: '1px', backgroundColor: '#e2e8f0' }}></div>
                            <div className={`sub-nav-item ${currentPage === 'pos' ? 'active' : ''}`} onClick={() => onNavigate('pos')}>
                                <ShoppingCart size={16} /> <span>Pré-vendas</span>
                            </div>
                        </div>
                    )}
                </div>

                {(user.role === 'admin' || user.role === 'superadmin') && (
                    <>
                        <div 
                            className={`nav-item ${currentPage === 'expedition' ? 'active' : ''}`}
                            onClick={() => onNavigate('expedition')}
                        >
                            <Package size={20} />
                            <span>Expedição / Online</span>
                        </div>

                        <div 
                            className={`nav-item ${currentPage === 'storefront' ? 'active' : ''}`}
                            onClick={() => window.open('/varejo/loja', '_blank')}
                        >
                            <Store size={20} />
                            <span>🛍️ Loja do Sócio</span>
                        </div>

                        <div 
                            className={`nav-item ${currentPage === 'customers' ? 'active' : ''}`}
                            onClick={() => onNavigate('customers')}
                        >
                            <Users size={20} />
                            <span>Clientes</span>
                        </div>

                        <div 
                            className={`nav-item ${currentPage === 'suppliers' ? 'active' : ''}`}
                            onClick={() => onNavigate('suppliers')}
                        >
                            <Truck size={20} />
                            <span>Fornecedores</span>
                        </div>

                        <div 
                            className={`nav-item ${currentPage === 'sngpc' ? 'active' : ''}`}
                            onClick={() => onNavigate('sngpc')}
                        >
                            <Shield size={20} />
                            <span>SNGPC</span>
                        </div>

                        <div className="nav-divider">Administração</div>

                        <div 
                            className={`nav-item ${currentPage === 'financial' ? 'active' : ''}`}
                            onClick={() => onNavigate('financial')}
                        >
                            <DollarSign size={20} />
                            <span>Financeiro</span>
                        </div>

                        <div 
                            className={`nav-item ${currentPage === 'fiscal_export' ? 'active' : ''}`}
                            onClick={() => onNavigate('fiscal_export')}
                        >
                            <FileText size={20} />
                            <span>Fiscal / Arquivos</span>
                        </div>

                        <div 
                            className={`nav-item ${currentPage === 'backup_config' ? 'active' : ''}`}
                            onClick={() => onNavigate('backup_config')}
                        >
                            <Database size={20} />
                            <span>Backup & Restauração</span>
                        </div>
                        
                        <div className="nav-group">
                            <div className="nav-item" onClick={() => setConfigOpen(!configOpen)}>
                                <Settings size={20} />
                                <span>Configurações</span>
                                {configOpen ? <ChevronDown size={16} className="chevron" /> : <ChevronRight size={16} className="chevron" />}
                            </div>

                            {configOpen && (
                                <div className="sub-nav">
                                    <div 
                                        className={`sub-nav-item ${currentPage === 'categories' ? 'active' : ''}`}
                                        onClick={() => onNavigate('categories')}
                                    >
                                        <Tag size={16} />
                                        <span>Categorias</span>
                                    </div>
                                    <div 
                                        className={`sub-nav-item ${currentPage === 'pbm_config' ? 'active' : ''}`}
                                        onClick={() => onNavigate('pbm_config')}
                                    >
                                        <Shield size={16} />
                                        <span>PBM / Convênios</span>
                                    </div>
                                    <div className="sub-nav-item">
                                        <FileText size={16} />
                                        <span>Relatórios</span>
                                    </div>
                                    <div 
                                        className={`sub-nav-item ${currentPage === 'users' ? 'active' : ''}`}
                                        onClick={() => onNavigate('users')}
                                    >
                                        <Users size={16} />
                                        <span>Usuários</span>
                                    </div>
                                    <div 
                                        className={`sub-nav-item ${currentPage === 'roles' ? 'active' : ''}`}
                                        onClick={() => onNavigate('roles')}
                                    >
                                        <Shield size={16} />
                                        <span>Perfis / Permissões</span>
                                    </div>
                                    <div 
                                        className={`sub-nav-item ${currentPage === 'settings/terminals' ? 'active' : ''}`}
                                        onClick={() => onNavigate('settings/terminals')}
                                    >
                                        <Monitor size={16} />
                                        <span>Terminais de Caixa</span>
                                    </div>
                                    <div 
                                        className={`sub-nav-item ${currentPage === 'store_config' ? 'active' : ''}`}
                                        onClick={() => onNavigate('store_config')}
                                    >
                                        <Globe size={16} />
                                        <span>Aparência, Whitelabel & Loja</span>
                                    </div>
                                    <div 
                                        className={`sub-nav-item ${currentPage === 'pix_config' ? 'active' : ''}`}
                                        onClick={() => onNavigate('pix_config')}
                                    >
                                        <Wallet size={16} />
                                        <span>API PIX Banco Cora</span>
                                    </div>
                                    <div 
                                        className={`sub-nav-item ${currentPage === 'backup_config' ? 'active' : ''}`}
                                        onClick={() => onNavigate('backup_config')}
                                    >
                                        <Database size={16} />
                                        <span>Backup & Restauração</span>
                                    </div>
                                    <div 
                                        className={`sub-nav-item ${currentPage === 'settings/tenants' ? 'active' : ''}`}
                                        onClick={() => onNavigate('settings/tenants')}
                                    >
                                        <Store size={16} />
                                        <span>Lojas / Unidades</span>
                                    </div>
                                    <a 
                                        href="/varejo/downloads/VarejoPro-POS-Setup.exe"
                                        download
                                        className="sub-nav-item"
                                        style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}
                                    >
                                        <ArrowDownCircle size={16} />
                                        <span>Baixar PDV Desktop</span>
                                    </a>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </nav>

            <div className="sidebar-footer">
                <div className="user-info">
                    <div className="user-avatar">{user.name[0]}</div>
                    <div className="user-details">
                        <span className="user-name">{user.name}</span>
                        <span className="user-role">{user.role}</span>
                    </div>
                </div>
                <button onClick={logout} className="logout-btn" title="Sair">
                    <LogOut size={18} />
                </button>
            </div>
            <div className="sidebar-dev-footer">
                <span>Criado e Desenvolvido por <strong>PES TECNOLOGIA</strong></span>
            </div>
        </aside>
    );
};

export default Sidebar;
