import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Store, Plus, Edit2, TrendingUp, AlertTriangle, ArrowRight, X, CheckCircle2, Circle } from 'lucide-react';
import './TenantsPage.css';

const MODULES = [
    { id: 'dashboard', name: 'Dashboard / Resumo' },
    { id: 'inventory', name: 'Estoque / Produtos' },
    { id: 'sales', name: 'Vendas / PDV' },
    { id: 'financial', name: 'Financeiro' },
    { id: 'customers', name: 'Clientes' },
    { id: 'suppliers', name: 'Fornecedores' },
    { id: 'config', name: 'Configurações / Sistema' }
];

const TenantsPage = ({ onNavigate }) => {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTenant, setEditingTenant] = useState(null);
    const [activeTab, setActiveTab] = useState('geral');

    const [formData, setFormData] = useState({
        // Geral
        name: '', cnpj: '', address: '', phone: '', email: '', logo_url: '', status: 'active', 
        default_min_stock: 5, shared_stock_tenant_id: '',
        // Fiscal
        state_registration: '', municipal_registration: '', fiscal_regime: 'Simples Nacional',
        csc_token: '', csc_id: '', nfce_certificate_password: '', nfce_certificate_base64: '',
        nfce_certificate_filename: '', nfce_series: 1, 
        nfce_next_number: 1, fiscal_environment: 'homologation',
        // SNGPC
        sngpc_active: false, sngpc_technical_manager: '', sngpc_crf: '', 
        sngpc_email: '', sngpc_password: '',
        promocional_enabled: false,
        // Módulos
        allowed_modules: []
    });

    const handleCertificateFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            setFormData(prev => ({
                ...prev,
                nfce_certificate_base64: event.target.result,
                nfce_certificate_filename: file.name
            }));
        };
        reader.readAsDataURL(file);
    };

    const fetchTenants = async () => {
        setLoading(true);
        try {
            const response = await api.get('/tenants');
            setTenants(response.data);
        } catch (error) {
            console.error('Error fetching tenants:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTenants();
    }, []);

    const handleOpenModal = (tenant = null) => {
        setActiveTab('geral');
        if (tenant) {
            setEditingTenant(tenant);
            setFormData({
                name: tenant.name || '',
                cnpj: tenant.cnpj || '',
                address: tenant.address || '',
                phone: tenant.phone || '',
                email: tenant.email || '',
                logo_url: tenant.logo_url || '',
                status: tenant.status || 'active',
                default_min_stock: tenant.default_min_stock || 5,
                shared_stock_tenant_id: tenant.shared_stock_tenant_id || '',
                
                state_registration: tenant.state_registration || '',
                municipal_registration: tenant.municipal_registration || '',
                fiscal_regime: tenant.fiscal_regime || 'Simples Nacional',
                csc_token: tenant.csc_token || '',
                csc_id: tenant.csc_id || '',
                nfce_certificate_password: tenant.nfce_certificate_password || '',
                nfce_series: tenant.nfce_series || 1,
                nfce_next_number: tenant.nfce_next_number || 1,
                fiscal_environment: tenant.fiscal_environment || 'homologation',

                sngpc_active: tenant.sngpc_active || false,
                sngpc_technical_manager: tenant.sngpc_technical_manager || '',
                sngpc_crf: tenant.sngpc_crf || '',
                sngpc_email: tenant.sngpc_email || '',
                sngpc_password: tenant.sngpc_password || '',

                
                promocional_enabled: tenant.promocional_enabled || false,
                
                allowed_modules: tenant.allowed_modules || []
            });
        } else {
            setEditingTenant(null);
            setFormData({
                name: '', cnpj: '', address: '', phone: '', email: '', logo_url: '', status: 'active', default_min_stock: 5, shared_stock_tenant_id: '',
                state_registration: '', municipal_registration: '', fiscal_regime: 'Simples Nacional', csc_token: '', csc_id: '', nfce_certificate_password: '', nfce_series: 1, nfce_next_number: 1, fiscal_environment: 'homologation',
                sngpc_active: false, sngpc_technical_manager: '', sngpc_crf: '', sngpc_email: '', sngpc_password: '',
                
                promocional_enabled: false,
                allowed_modules: []
            });
        }
        setShowModal(true);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    };

    const toggleModule = (moduleId) => {
        const current = [...formData.allowed_modules];
        const index = current.indexOf(moduleId);
        if (index > -1) {
            current.splice(index, 1);
        } else {
            current.push(moduleId);
        }
        setFormData({ ...formData, allowed_modules: current });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData };
            if (payload.shared_stock_tenant_id === '') payload.shared_stock_tenant_id = null;

            if (editingTenant) {
                await api.put(`/tenants/${editingTenant.id}`, payload);
            } else {
                await api.post('/tenants', payload);
            }
            setShowModal(false);
            fetchTenants();
        } catch (error) {
            alert(error.response?.data?.error || 'Erro ao salvar unidade');
        }
    };

    return (
        <div className="tenants-page">
            <header className="page-header">
                <div className="header-title">
                    <Store size={28} className="title-icon" />
                    <div>
                        <h1>Lojas / Unidades</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Gerencie as unidades da rede e visualize o resumo de vendas</p>
                    </div>
                </div>
                <button className="btn btn-primary btn-icon" onClick={() => handleOpenModal()}>
                    <Plus size={18} /> Nova Unidade
                </button>
            </header>

            <div className="table-container glass">
                <table className="custom-table">
                    <thead>
                        <tr>
                            <th>Loja / Unidade</th>
                            <th>CNPJ</th>
                            <th>Indicadores de Hoje</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center' }}>Carregando unidades...</td></tr>
                        ) : tenants.map(tenant => (
                            <tr key={tenant.id}>
                                <td>
                                    <div className="tenant-cell">
                                        <div className="tenant-avatar">{tenant.name[0]}</div>
                                        <div className="tenant-info">
                                            <strong>{tenant.name}</strong>
                                            <span>ID: {tenant.id}</span>
                                        </div>
                                    </div>
                                </td>
                                <td>{tenant.cnpj}</td>
                                <td>
                                    <div className="stats-cell">
                                        <div className="stat-row positive" title="Total Vendido Hoje">
                                            <TrendingUp size={14} />
                                            <span>R$ {parseFloat(tenant.todaySales).toFixed(2)}</span>
                                        </div>
                                        <div className="stat-row negative" title="Dívida de Convênio Pendente">
                                            <AlertTriangle size={14} />
                                            <span>R$ {parseFloat(tenant.pendingDebt).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span className={`badge ${tenant.status === 'active' ? 'success' : 'inactive'}`}>
                                        {tenant.status === 'active' ? 'Ativa' : 'Inativa'}
                                    </span>
                                </td>
                                <td>
                                    <div className="actions-cell">
                                        <button className="btn-icon-only" onClick={() => handleOpenModal(tenant)} title="Editar Unidade">
                                            <Edit2 size={16} />
                                        </button>
                                        <button className="btn-dashboard" onClick={() => onNavigate && onNavigate('admin-dashboard')} title="Ver Dashboard Central">
                                            Dash <ArrowRight size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content glass" style={{ maxWidth: '800px', width: '100%' }}>
                        <header className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ margin: 0 }}>{editingTenant ? 'Editar Unidade' : 'Nova Unidade'}</h2>
                            <button type="button" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </header>

                        <div className="tabs-header" style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border)', marginBottom: '24px', paddingBottom: '8px' }}>
                            <button className={`tab-btn ${activeTab === 'geral' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('geral')}>Geral</button>
                            <button className={`tab-btn ${activeTab === 'fiscal' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('fiscal')}>Fiscal e NFC-e</button>
                            <button className={`tab-btn ${activeTab === 'sngpc' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('sngpc')}>SNGPC (Anvisa)</button>
                            
                            <button className={`tab-btn ${activeTab === 'acesso' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('acesso')}>Módulos de Acesso</button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {activeTab === 'geral' && (
                                <div>
                                    <div className="form-group">
                                        <label>Nome da Unidade</label>
                                        <input type="text" name="name" value={formData.name} onChange={handleChange} required />
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>CNPJ</label>
                                            <input type="text" name="cnpj" value={formData.cnpj} onChange={handleChange} required />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Telefone</label>
                                            <input type="text" name="phone" value={formData.phone} onChange={handleChange} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Endereço Completo</label>
                                        <input type="text" name="address" value={formData.address} onChange={handleChange} />
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>E-mail Padrão</label>
                                            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="contato@empresa.com" />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>URL da Logomarca (Logo)</label>
                                            <input type="text" name="logo_url" value={formData.logo_url} onChange={handleChange} placeholder="https://..." />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Status</label>
                                            <select name="status" value={formData.status} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                                <option value="active">Ativa</option>
                                                <option value="inactive">Inativa</option>
                                            </select>
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Estoque Mínimo Padrão</label>
                                            <input type="number" name="default_min_stock" value={formData.default_min_stock} onChange={handleChange} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Compartilhar Estoque Com (Matriz)</label>
                                        <select name="shared_stock_tenant_id" value={formData.shared_stock_tenant_id} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                            <option value="">-- Estoque Próprio --</option>
                                            {tenants.filter(t => t.id !== editingTenant?.id).map(t => (
                                                <option key={t.id} value={t.id}>{t.name} (CNPJ: {t.cnpj})</option>
                                            ))}
                                        </select>
                                        <small style={{ color: 'var(--text-muted)' }}>Se configurado, esta unidade lerá e venderá produtos do estoque da Matriz.</small>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'fiscal' && (
                                <div>
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Inscrição Estadual (IE)</label>
                                            <input type="text" name="state_registration" value={formData.state_registration} onChange={handleChange} />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Inscrição Municipal (IM)</label>
                                            <input type="text" name="municipal_registration" value={formData.municipal_registration} onChange={handleChange} />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Regime Tributário</label>
                                            <select name="fiscal_regime" value={formData.fiscal_regime} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                                <option value="Simples Nacional">Simples Nacional (CRT 1)</option>
                                                <option value="Simples Nacional - Excesso de Sublimite">Simples Nacional - Excesso Sublimite (CRT 2)</option>
                                                <option value="Lucro Presumido">Lucro Presumido (CRT 3)</option>
                                                <option value="Lucro Real">Lucro Real (CRT 3)</option>
                                                <option value="MEI">MEI - Microempreendedor Individual (CRT 4)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <div className="form-group" style={{ flex: 2 }}>
                                            <label>CSC Token (NFC-e)</label>
                                            <input type="text" name="csc_token" value={formData.csc_token} onChange={handleChange} />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>ID do CSC</label>
                                            <input type="text" name="csc_id" value={formData.csc_id} onChange={handleChange} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Certificado Digital (A1 PFX / P12)</label>
                                            <input 
                                                type="file" 
                                                accept=".pfx,.p12" 
                                                onChange={handleCertificateFileChange}
                                                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#1e293b' }}
                                            />
                                            {formData.nfce_certificate_filename && (
                                                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold', marginTop: '4px', display: 'block' }}>
                                                    ✓ Certificado Selecionado: {formData.nfce_certificate_filename}
                                                </span>
                                            )}
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Senha do Certificado</label>
                                            <input type="password" name="nfce_certificate_password" value={formData.nfce_certificate_password} onChange={handleChange} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Ambiente Sefaz</label>
                                            <select name="fiscal_environment" value={formData.fiscal_environment} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                                <option value="homologation">Homologação (Testes)</option>
                                                <option value="production">Produção (Real)</option>
                                            </select>
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Série da NFC-e</label>
                                            <input type="number" name="nfce_series" value={formData.nfce_series} onChange={handleChange} />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Próximo Número NFC-e</label>
                                            <input type="number" name="nfce_next_number" value={formData.nfce_next_number} onChange={handleChange} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'sngpc' && (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                        <input type="checkbox" id="sngpc_active" name="sngpc_active" checked={formData.sngpc_active} onChange={handleChange} style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }} />
                                        <label htmlFor="sngpc_active">Habilitar Transmissão SNGPC (Anvisa)</label>
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <div className="form-group" style={{ flex: 2 }}>
                                            <label>Farmacêutico Responsável</label>
                                            <input type="text" name="sngpc_technical_manager" value={formData.sngpc_technical_manager} onChange={handleChange} disabled={!formData.sngpc_active} />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>CRF</label>
                                            <input type="text" name="sngpc_crf" value={formData.sngpc_crf} onChange={handleChange} disabled={!formData.sngpc_active} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>E-mail de Acesso Anvisa</label>
                                            <input type="email" name="sngpc_email" value={formData.sngpc_email} onChange={handleChange} disabled={!formData.sngpc_active} />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Senha Anvisa</label>
                                            <input type="password" name="sngpc_password" value={formData.sngpc_password} onChange={handleChange} disabled={!formData.sngpc_active} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'pbm' && (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                        <input type="checkbox" id="pbm_active" name="pbm_active" checked={formData.pbm_active} onChange={handleChange} style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }} />
                                        <label htmlFor="pbm_active">Habilitar Convênios PBM</label>
                                    </div>
                                    <div className="form-group">
                                        <label>Provedor (Ex: Desconto Promocional, Vidalink)</label>
                                        <input type="text" name="pbm_provider" value={formData.pbm_provider} onChange={handleChange} disabled={!formData.pbm_active} />
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Usuário do PBM</label>
                                            <input type="text" name="pbm_username" value={formData.pbm_username} onChange={handleChange} disabled={!formData.pbm_active} />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Senha do PBM</label>
                                            <input type="password" name="pbm_password" value={formData.pbm_password} onChange={handleChange} disabled={!formData.pbm_active} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                                        <input type="checkbox" id="promocional_enabled" name="promocional_enabled" checked={formData.promocional_enabled} onChange={handleChange} style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }} />
                                        <label htmlFor="promocional_enabled" style={{ cursor: 'pointer' }}><strong>Liberar Integração Desconto Promocional (Governo)</strong></label>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'acesso' && (
                                <div>
                                    <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>Defina quais módulos do sistema esta unidade tem permissão de usar.</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        {MODULES.map(module => (
                                            <div 
                                                key={module.id} 
                                                onClick={() => toggleModule(module.id)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                                                    borderRadius: '8px', cursor: 'pointer',
                                                    backgroundColor: formData.allowed_modules.includes(module.id) ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255,255,255,0.05)',
                                                    border: formData.allowed_modules.includes(module.id) ? '1px solid var(--primary)' : '1px solid var(--border)'
                                                }}
                                            >
                                                {formData.allowed_modules.includes(module.id) ? 
                                                    <CheckCircle2 size={20} className="success-text" color="var(--primary)" /> : 
                                                    <Circle size={20} color="rgba(255,255,255,0.2)" />
                                                }
                                                <span style={{ fontWeight: formData.allowed_modules.includes(module.id) ? '600' : '400' }}>
                                                    {module.name}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="modal-actions" style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Salvar Unidade</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TenantsPage;
