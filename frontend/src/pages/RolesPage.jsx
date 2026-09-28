import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Plus, Edit2, Trash2, CheckCircle2, Circle } from 'lucide-react';
import './RolesPage.css';

const MODULES = [
    { id: 'dashboard', name: 'Dashboard / Resumo' },
    { id: 'inventory', name: 'Estoque / Produtos' },
    { id: 'sales', name: 'Vendas / PDV' },
    { id: 'financial', name: 'Financeiro' },
    { id: 'customers', name: 'Clientes' },
    { id: 'suppliers', name: 'Fornecedores' },
    { id: 'config', name: 'Configurações / Sistema' }
];

const RolesPage = () => {
    const [roles, setRoles] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingRole, setEditingRole] = useState(null);

    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'superadmin';

    const [formData, setFormData] = useState({
        name: '',
        tenant_id: '',
        permissions: []
    });

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const requests = [api.get('/roles')];
            if (isSuperAdmin) {
                requests.push(api.get('/tenants'));
            }
            const [rolesRes, tenantsRes] = await Promise.all(requests);
            setRoles(rolesRes.data);
            if (isSuperAdmin && tenantsRes) {
                setTenants(tenantsRes.data);
            }
        } catch (error) {
            console.error('Error fetching roles:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    const handleOpenModal = (role = null) => {
        if (role) {
            setEditingRole(role);
            setFormData({
                name: role.name,
                tenant_id: role.tenant_id || '',
                permissions: Array.isArray(role.permissions) ? role.permissions : []
            });
        } else {
            setEditingRole(null);
            setFormData({ name: '', tenant_id: '', permissions: [] });
        }
        setShowModal(true);
    };

    const togglePermission = (moduleId) => {
        const current = [...formData.permissions];
        const index = current.indexOf(moduleId);
        if (index > -1) {
            current.splice(index, 1);
        } else {
            current.push(moduleId);
        }
        setFormData({ ...formData, permissions: current });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingRole) {
                await api.put(`/roles/${editingRole.id}`, formData);
            } else {
                await api.post('/roles', formData);
            }
            setShowModal(false);
            fetchRoles();
        } catch (error) {
            alert('Erro ao salvar perfil');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Excluir este perfil permanentemente?')) return;
        try {
            await api.delete(`/roles/${id}`);
            fetchRoles();
        } catch (error) {
            alert('Erro ao excluir perfil. Verifique se há usuários vinculados.');
        }
    };

    return (
        <div className="roles-page">
            <header className="page-header">
                <div className="header-title">
                    <Shield size={24} className="title-icon" />
                    <h1>Perfis de Acesso</h1>
                </div>
                <button className="btn btn-primary btn-icon" onClick={() => handleOpenModal()}>
                    <Plus size={18} /> Novo Perfil
                </button>
            </header>

            <div className="roles-grid">
                {loading ? (
                    <div className="loading-state">Carregando perfis...</div>
                ) : roles.map(role => (
                    <div key={role.id} className="role-card glass">
                        <div className="role-card-header">
                            <h3>{role.name}</h3>
                            <div className="card-actions">
                                <button onClick={() => handleOpenModal(role)} title="Editar"><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete(role.id)} className="delete" title="Excluir"><Trash2 size={16} /></button>
                            </div>
                        </div>
                        <div className="role-permissions-summary">
                            <label>Módulos Permitidos:</label>
                            <div className="perm-tags">
                                {Array.isArray(role.permissions) && role.permissions.map(p => (
                                    <span key={p} className="perm-tag">
                                        {MODULES.find(m => m.id === p)?.name || p}
                                    </span>
                                ))}
                                {(!role.permissions || role.permissions.length === 0) && (
                                    <span className="no-perms">Nenhum acesso definido</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content glass large">
                        <h2>{editingRole ? 'Editar Perfil' : 'Novo Perfil'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Nome do Perfil</label>
                                <input 
                                    type="text" 
                                    placeholder="Ex: Gerente, Balconista..."
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    required 
                                />
                            </div>

                            {isSuperAdmin && !editingRole && (
                                <div className="form-group">
                                    <label>Vincular à Unidade / Loja</label>
                                    <select 
                                        value={formData.tenant_id}
                                        onChange={e => setFormData({...formData, tenant_id: e.target.value})}
                                        required
                                    >
                                        <option value="">Selecione uma unidade...</option>
                                        {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            )}
                            
                            <div className="permissions-selector">
                                <label>Defina as permissões de acesso:</label>
                                <div className="perm-grid">
                                    {MODULES.map(module => (
                                        <div 
                                            key={module.id} 
                                            className={`perm-item ${formData.permissions.includes(module.id) ? 'selected' : ''}`}
                                            onClick={() => togglePermission(module.id)}
                                        >
                                            {formData.permissions.includes(module.id) ? 
                                                <CheckCircle2 size={20} className="success-text" /> : 
                                                <Circle size={20} color="rgba(255,255,255,0.2)" />
                                            }
                                            <span>{module.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Salvar Perfil</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RolesPage;
