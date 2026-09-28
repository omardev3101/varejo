import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Truck, Plus, Search, Edit, Trash2, X, Save, Phone, MapPin, Hash } from 'lucide-react';
import './SuppliersPage.css';

const SuppliersPage = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        cnpj: '',
        ie: '',
        address: '',
        city: '',
        state: '',
        phone: ''
    });

    const fetchSuppliers = async () => {
        try {
            const response = await api.get('/inventory/suppliers');
            setSuppliers(response.data);
        } catch (error) {
            console.error('Error fetching suppliers:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const handleOpenModal = (supplier = null) => {
        if (supplier) {
            setEditingSupplier(supplier);
            setFormData(supplier);
        } else {
            setEditingSupplier(null);
            setFormData({ name: '', cnpj: '', ie: '', address: '', city: '', state: '', phone: '' });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingSupplier) {
                await api.put(`/inventory/suppliers/${editingSupplier.id}`, formData);
            } else {
                await api.post('/inventory/suppliers', formData);
            }
            alert('Fornecedor salvo com sucesso!');
            setIsModalOpen(false);
            fetchSuppliers();
        } catch (error) {
            alert('Erro ao salvar fornecedor.');
        }
    };

    const filteredSuppliers = suppliers.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.cnpj.includes(searchTerm)
    );

    return (
        <div className="page-wrapper">
            <header className="page-header">
                <div className="header-title">
                    <Truck size={24} className="title-icon" />
                    <h1>Gestão de Fornecedores</h1>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                        <Plus size={18} /> Novo Fornecedor
                    </button>
                </div>
            </header>

            <div className="table-filters glass">
                <div className="search-input">
                    <Search size={18} />
                    <input 
                        type="text" 
                        placeholder="Nome ou CNPJ..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="table-container glass">
                <table className="custom-table">
                    <thead>
                        <tr>
                            <th>Fornecedor</th>
                            <th>CNPJ / IE</th>
                            <th>Contato</th>
                            <th>Localização</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" className="text-center">Carregando...</td></tr>
                        ) : filteredSuppliers.map(supplier => (
                            <tr key={supplier.id}>
                                <td>
                                    <div className="supplier-info-cell">
                                        <div className="supplier-avatar"><Truck size={20} /></div>
                                        <strong>{supplier.name}</strong>
                                    </div>
                                </td>
                                <td>
                                    <div className="sub-info">
                                        <span>{supplier.cnpj}</span>
                                        <small>IE: {supplier.ie || 'ISENTO'}</small>
                                    </div>
                                </td>
                                <td>{supplier.phone || '---'}</td>
                                <td>{supplier.city} - {supplier.state}</td>
                                <td className="actions">
                                    <button className="action-btn" onClick={() => handleOpenModal(supplier)}><Edit size={16} /></button>
                                    <button className="action-btn delete"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content glass" style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h2>{editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
                            <button className="btn-icon" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSave} className="supplier-form">
                            <div className="form-grid">
                                <div className="form-group full">
                                    <label>Razão Social</label>
                                    <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>CNPJ</label>
                                    <input type="text" required value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>Inscrição Estadual</label>
                                    <input type="text" value={formData.ie} onChange={e => setFormData({...formData, ie: e.target.value})} />
                                </div>
                                <div className="form-group full">
                                    <label>Endereço</label>
                                    <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>Cidade</label>
                                    <input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>Estado (UF)</label>
                                    <input type="text" maxLength="2" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>Telefone</label>
                                    <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">
                                    <Save size={18} /> Salvar Fornecedor
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuppliersPage;
