import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Monitor, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import './TerminalsPage.css';

const TerminalsPage = () => {
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'superadmin';

    const [terminals, setTerminals] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [selectedTenantId, setSelectedTenantId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingTerminal, setEditingTerminal] = useState(null);
    const [formData, setFormData] = useState({ name: '', status: 'active', tenant_id: '' });

    useEffect(() => {
        if (isSuperAdmin) {
            fetchTenants();
        }
    }, [isSuperAdmin]);

    useEffect(() => {
        fetchTerminals();
    }, [selectedTenantId]);

    const fetchTenants = async () => {
        try {
            const response = await api.get('/tenants');
            setTenants(response.data);
        } catch (err) {
            console.error('Erro ao carregar unidades:', err);
        }
    };

    const fetchTerminals = async () => {
        try {
            setLoading(true);
            const params = {};
            if (isSuperAdmin && selectedTenantId) {
                params.tenant_id = selectedTenantId;
            }
            const response = await api.get('/terminals', { params });
            setTerminals(response.data);
            setError(null);
        } catch (err) {
            setError('Erro ao carregar terminais');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (terminal = null) => {
        if (terminal) {
            setEditingTerminal(terminal);
            setFormData({ 
                name: terminal.name, 
                status: terminal.status,
                tenant_id: terminal.tenant_id || ''
            });
        } else {
            setEditingTerminal(null);
            setFormData({ 
                name: '', 
                status: 'active',
                tenant_id: selectedTenantId || ''
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingTerminal(null);
        setFormData({ name: '', status: 'active', tenant_id: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingTerminal) {
                await api.put(`/terminals/${editingTerminal.id}`, formData);
            } else {
                await api.post('/terminals', formData);
            }
            fetchTerminals();
            handleCloseModal();
        } catch (err) {
            alert(err.response?.data?.error || 'Erro ao salvar terminal');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja excluir este terminal?')) {
            try {
                await api.delete(`/terminals/${id}`);
                fetchTerminals();
            } catch (err) {
                alert(err.response?.data?.error || 'Erro ao excluir terminal');
            }
        }
    };

    return (
        <div className="page-wrapper">
            <header className="page-header">
                <div className="header-title">
                    <Monitor size={28} className="title-icon" />
                    <div>
                        <h1>Terminais (PDV)</h1>
                        <p className="page-subtitle">Gerencie os caixas disponíveis na sua unidade</p>
                    </div>
                </div>
                
                <div className="header-actions-wrapper">
                    {isSuperAdmin && (
                        <div className="tenant-filter">
                            <select
                                value={selectedTenantId}
                                onChange={(e) => setSelectedTenantId(e.target.value)}
                                className="tenant-select-input"
                            >
                                <option value="">Todas as Unidades</option>
                                {tenants.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                        <Plus size={18} />
                        Novo Terminal
                    </button>
                </div>
            </header>

            {error && <div className="error-message">{error}</div>}

            {loading ? (
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <span>Carregando terminais...</span>
                </div>
            ) : (
                <div className="terminals-grid">
                    {terminals.map(terminal => (
                        <div key={terminal.id} className={`terminal-card glass ${terminal.status}`}>
                            <div className="terminal-card-header">
                                <div className={`terminal-icon-wrapper ${terminal.status}`}>
                                    <Monitor size={24} />
                                </div>
                                <span className={`status-badge ${terminal.status}`}>
                                    {terminal.status === 'active' ? 'Ativo' : 'Inativo'}
                                </span>
                            </div>
                            <div className="terminal-card-body">
                                <h3>{terminal.name}</h3>
                                <p className="terminal-id">ID: #{terminal.id}</p>
                                {isSuperAdmin && terminal.tenant && (
                                    <p className="terminal-tenant-name">Unidade: {terminal.tenant.name}</p>
                                )}
                            </div>
                            <div className="terminal-card-actions">
                                <button onClick={() => handleOpenModal(terminal)} className="btn-action edit" title="Editar">
                                    <Edit2 size={15} />
                                    <span>Editar</span>
                                </button>
                                <button onClick={() => handleDelete(terminal.id)} className="btn-action delete" title="Excluir">
                                    <Trash2 size={15} />
                                    <span>Excluir</span>
                                </button>
                            </div>
                        </div>
                    ))}
                    {terminals.length === 0 && (
                        <div className="no-terminals glass">
                            <div className="empty-icon-wrapper">
                                <Monitor size={40} />
                            </div>
                            <h3>Nenhum terminal cadastrado</h3>
                            <p>Esta unidade ainda não possui caixas de venda (PDV) cadastrados.</p>
                            <button className="btn btn-primary" onClick={() => handleOpenModal()} style={{ marginTop: '20px' }}>
                                <Plus size={18} /> Cadastrar Primeiro Terminal
                            </button>
                        </div>
                    )}
                </div>
            )}

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content glass">
                        <div className="modal-header">
                            <h2>{editingTerminal ? 'Editar Terminal' : 'Novo Terminal'}</h2>
                            <button className="close-btn" onClick={handleCloseModal}>
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="simple-form">
                            {isSuperAdmin && (
                                <div className="form-group">
                                    <label>Unidade / Tenant</label>
                                    <select
                                        value={formData.tenant_id}
                                        onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Selecione uma unidade</option>
                                        {tenants.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="form-group">
                                <label>Nome / Identificação do Terminal</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ex: Caixa 01"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="active">Ativo</option>
                                    <option value="inactive">Inativo</option>
                                </select>
                            </div>
                            <div className="modal-actions" style={{ marginTop: '24px' }}>
                                <button type="button" className="btn-cancel" onClick={handleCloseModal}>Cancelar</button>
                                <button type="submit" className="btn-save">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TerminalsPage;
