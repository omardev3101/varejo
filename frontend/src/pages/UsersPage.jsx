import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Users, UserPlus, Mail, Shield, Edit2, Key, Check, X } from 'lucide-react';
import './UsersPage.css';

const UsersPage = () => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    const { user: currentUser } = useAuth();
    const isSuperAdmin = currentUser?.role === 'superadmin';

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role_id: '',
        role: 'seller', // Can be 'superadmin'
        tenant_id: '',
        active: true
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const requests = [
                api.get('/users'),
                api.get('/roles')
            ];
            if (isSuperAdmin) {
                requests.push(api.get('/tenants'));
            }

            const [usersRes, rolesRes, tenantsRes] = await Promise.all(requests);
            
            setUsers(usersRes.data);
            setRoles(rolesRes.data);
            if (isSuperAdmin && tenantsRes) {
                setTenants(tenantsRes.data);
            }
        } catch (error) {
            console.error('Error fetching users data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenModal = (user = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                name: user.name,
                email: user.email,
                password: '',
                role_id: user.role_id || '',
                role: user.role || 'seller',
                tenant_id: user.tenant_id || '',
                active: user.active
            });
        } else {
            setEditingUser(null);
            setFormData({ name: '', email: '', password: '', role_id: '', role: 'seller', tenant_id: '', active: true });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingUser) {
                await api.put(`/users/${editingUser.id}`, formData);
            } else {
                await api.post('/users', formData);
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            alert(error.response?.data?.error || 'Erro ao salvar usuário');
        }
    };

    return (
        <div className="users-page">
            <header className="page-header">
                <div className="header-title">
                    <Users size={24} className="title-icon" />
                    <h1>Gestão de Usuários</h1>
                </div>
                <button className="btn btn-primary btn-icon" onClick={() => handleOpenModal()}>
                    <UserPlus size={18} /> Novo Usuário
                </button>
            </header>

            <div className="table-container glass">
                <table className="custom-table">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Email</th>
                            <th>Perfil / Cargo</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" className="text-center">Carregando...</td></tr>
                        ) : users.map(user => (
                            <tr key={user.id}>
                                <td>
                                    <div className="user-cell">
                                        <div className="user-avatar">{user.name[0]}</div>
                                        <strong>{user.name}</strong>
                                    </div>
                                </td>
                                <td>
                                    <div className="email-cell">
                                        <Mail size={14} /> {user.email}
                                    </div>
                                </td>
                                <td>
                                    <span className="role-badge">
                                        <Shield size={12} /> {user.role === 'superadmin' ? 'Super Admin' : (user.role_rel?.name || 'Sem Perfil')}
                                    </span>
                                </td>
                                <td>
                                    <span className={`status-badge ${user.active ? 'active' : 'inactive'}`}>
                                        {user.active ? 'Ativo' : 'Inativo'}
                                    </span>
                                </td>
                                <td>
                                    <button className="btn-icon-only" onClick={() => handleOpenModal(user)}>
                                        <Edit2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content glass">
                        <h2>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Nome Completo</label>
                                <input 
                                    type="text" 
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label>Email (Login)</label>
                                <input 
                                    type="email" 
                                    value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label>Senha {editingUser && '(Deixe em branco para não alterar)'}</label>
                                <div className="password-input">
                                    <Key size={16} />
                                    <input 
                                        type="password" 
                                        value={formData.password}
                                        onChange={e => setFormData({...formData, password: e.target.value})}
                                        required={!editingUser}
                                    />
                                </div>
                            </div>
                            {isSuperAdmin && (
                                <div className="form-group" style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                        <input 
                                            type="checkbox" 
                                            id="is_superadmin" 
                                            checked={formData.role === 'superadmin'}
                                            onChange={(e) => setFormData({...formData, role: e.target.checked ? 'superadmin' : 'seller', tenant_id: e.target.checked ? '' : formData.tenant_id})}
                                            style={{ width: '18px', height: '18px' }}
                                        />
                                        <label htmlFor="is_superadmin" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>Acesso Global (Super Admin)</label>
                                    </div>
                                    {formData.role !== 'superadmin' && (
                                        <div className="form-group" style={{ marginBottom: 0 }}>
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
                                </div>
                            )}

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Perfil de Acesso {formData.role === 'superadmin' && '(Opcional para Super Admin)'}</label>
                                    <select 
                                        value={formData.role_id}
                                        onChange={e => setFormData({...formData, role_id: e.target.value})}
                                        required={formData.role !== 'superadmin'}
                                        disabled={formData.role === 'superadmin'}
                                    >
                                        <option value="">Selecione um perfil...</option>
                                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Status</label>
                                    <div className="toggle-group">
                                        <button 
                                            type="button" 
                                            className={formData.active ? 'active' : ''}
                                            onClick={() => setFormData({...formData, active: true})}
                                        >
                                            <Check size={16} /> Ativo
                                        </button>
                                        <button 
                                            type="button" 
                                            className={!formData.active ? 'active inactive' : ''}
                                            onClick={() => setFormData({...formData, active: false})}
                                        >
                                            <X size={16} /> Inativo
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Salvar Usuário</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersPage;
