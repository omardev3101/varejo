import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Tag, Plus, Edit, Trash2, X, Save } from 'lucide-react';
import './CategoriesPage.css';

const CategoriesPage = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCategory, setCurrentCategory] = useState({ id: null, name: '' });

    const fetchCategories = async () => {
        try {
            const response = await api.get('/categories');
            setCategories(response.data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (currentCategory.id) {
                await api.put(`/categories/${currentCategory.id}`, { 
                    name: currentCategory.name,
                    default_markup: currentCategory.default_markup,
                    default_min_stock: currentCategory.default_min_stock
                });
            } else {
                await api.post('/categories', { 
                    name: currentCategory.name,
                    default_markup: currentCategory.default_markup,
                    default_min_stock: currentCategory.default_min_stock
                });
            }
            fetchCategories();
            setIsModalOpen(false);
            setCurrentCategory({ id: null, name: '' });
        } catch (error) {
            alert('Erro ao salvar categoria');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Deseja excluir esta categoria?')) return;
        try {
            await api.delete(`/categories/${id}`);
            fetchCategories();
        } catch (error) {
            alert('Erro ao excluir categoria. Verifique se existem produtos vinculados.');
        }
    };

    return (
        <div className="page-wrapper">
            <header className="page-header">
                <div className="header-title">
                    <Tag size={24} className="title-icon" />
                    <h1>Categorias de Produtos</h1>
                </div>
                <button className="btn btn-primary" onClick={() => {
                    setCurrentCategory({ id: null, name: '' });
                    setIsModalOpen(true);
                }}>
                    <Plus size={18} />
                    Nova Categoria
                </button>
            </header>

            <div className="categories-grid">
                {loading ? <p>Carregando...</p> : categories.map(cat => (
                    <div key={cat.id} className="category-card glass">
                        <div className="cat-info">
                            <h3>{cat.name}</h3>
                            <span>ID: #{cat.id}</span>
                        </div>
                        <div className="cat-actions">
                            <button onClick={() => {
                                setCurrentCategory(cat);
                                setIsModalOpen(true);
                            }} className="action-btn"><Edit size={16} /></button>
                            <button onClick={() => handleDelete(cat.id)} className="action-btn delete"><Trash2 size={16} /></button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content glass" style={{ maxWidth: '400px' }}>
                        <header className="modal-header">
                            <h2>{currentCategory.id ? 'Editar Categoria' : 'Nova Categoria'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="close-btn"><X size={24} /></button>
                        </header>
                        <form onSubmit={handleSubmit} className="simple-form">
                            <div className="input-group full">
                                <label>Nome da Categoria</label>
                                <input 
                                    value={currentCategory.name} 
                                    onChange={(e) => setCurrentCategory({...currentCategory, name: e.target.value})}
                                    required 
                                    autoFocus
                                />
                            </div>
                            <div className="input-group full">
                                <label>Markup Padrão (%)</label>
                                <input 
                                    type="number"
                                    step="0.01"
                                    value={currentCategory.default_markup || 30} 
                                    onChange={(e) => setCurrentCategory({...currentCategory, default_markup: e.target.value})}
                                    required 
                                />
                            </div>
                            <div className="input-group full">
                                <label>Estoque Mínimo Padrão (UN)</label>
                                <input 
                                    type="number"
                                    value={currentCategory.default_min_stock || 5} 
                                    onChange={(e) => setCurrentCategory({...currentCategory, default_min_stock: e.target.value})}
                                    required 
                                />
                            </div>
                            <div className="modal-actions" style={{ marginTop: '20px' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-cancel">Cancelar</button>
                                <button type="submit" className="btn-save">
                                    <Save size={18} />
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoriesPage;
