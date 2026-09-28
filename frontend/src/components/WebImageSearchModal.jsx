import React, { useState, useEffect } from 'react';
import { Search, X, Check, Image as ImageIcon, Loader, ExternalLink, Save, Link } from 'lucide-react';
import api from '../services/api';
import './WebImageSearchModal.css';

const WebImageSearchModal = ({ isOpen, onClose, onSelectImage, initialQuery = '', initialEan = '' }) => {
    const [query, setQuery] = useState(initialQuery);
    const [pastedUrl, setPastedUrl] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedUrl, setSelectedUrl] = useState('');

    const handleSearch = async (searchStr = query, eanStr = initialEan) => {
        if (!searchStr && !eanStr) return;
        setLoading(true);
        try {
            const response = await api.get('/products/search-image', {
                params: { q: searchStr, ean: eanStr }
            });
            setResults(response.data || []);
        } catch (error) {
            console.error('Error fetching web images:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setQuery(initialQuery);
            setPastedUrl('');
            setSelectedUrl('');
            handleSearch(initialQuery, initialEan);
        }
    }, [isOpen, initialQuery, initialEan]);

    if (!isOpen) return null;

    const handleConfirm = (url) => {
        onSelectImage(url);
        onClose();
    };

    return (
        <div className="web-search-modal-overlay" onClick={onClose}>
            <div className="web-search-modal-content glass" onClick={e => e.stopPropagation()}>
                <header className="web-search-header">
                    <div className="header-title-flex">
                        <ImageIcon size={22} className="header-icon" />
                        <div>
                            <h3>Buscar Foto no Google Imagens</h3>
                            <span className="subtitle">Pesquise, selecione ou cole o link direto da imagem</span>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </header>

                <div className="web-search-body">
                    {/* 1. Search Bar */}
                    <form className="search-bar-form" onSubmit={(e) => { e.preventDefault(); handleSearch(); }}>
                        <div className="input-with-icon">
                            <Search size={18} className="search-icon" />
                            <input 
                                type="text" 
                                placeholder="Digite o nome do produto ou produto para pesquisar..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="btn btn-primary btn-search" disabled={loading}>
                            {loading ? <Loader size={16} className="spin" /> : <Search size={16} />}
                            Buscar
                        </button>
                        <button 
                            type="button" 
                            className="btn btn-google-search"
                            title="Abrir pesquisa direta no Google Imagens em nova aba"
                            onClick={() => {
                                const googleUrl = `https://www.google.com/search?q=${encodeURIComponent((query || initialQuery) + ' produto embalagem')}&tbm=isch`;
                                window.open(googleUrl, '_blank');
                            }}
                        >
                            <ExternalLink size={16} /> Google Imagens
                        </button>
                    </form>

                    {/* 2. Dedicated Paste Link Bar */}
                    <div className="paste-link-bar-container" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', marginTop: '14px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <Link size={15} style={{ color: '#0284c7' }} /> Cole aqui o link da imagem do Google e clique em Salvar:
                        </label>
                        <form onSubmit={(e) => { e.preventDefault(); if (pastedUrl.trim()) handleConfirm(pastedUrl.trim()); }} style={{ display: 'flex', gap: '10px' }}>
                            <input 
                                type="text" 
                                placeholder="https://exemplo.com/foto.jpg ou link de imagem do Google..."
                                value={pastedUrl}
                                onChange={(e) => {
                                    setPastedUrl(e.target.value);
                                    if (e.target.value.trim()) setSelectedUrl(e.target.value.trim());
                                }}
                                style={{ flex: 1, padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#ffffff' }}
                            />
                            <button 
                                type="submit" 
                                className="btn btn-success" 
                                disabled={!pastedUrl.trim()}
                                style={{ padding: '0 20px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                            >
                                <Save size={16} /> Salvar Foto
                            </button>
                        </form>
                        {pastedUrl.trim() && (
                            <div style={{ marginTop: '12px', textAlign: 'center', background: '#ecfdf5', padding: '14px', borderRadius: '12px', border: '2px dashed #10b981' }}>
                                <span style={{ fontSize: '12px', color: '#047857', fontWeight: '700', display: 'block', marginBottom: '8px' }}>
                                    📸 Imagem Encontrada! Pré-visualização:
                                </span>
                                <img 
                                    src={pastedUrl.trim()} 
                                    alt="Pré-visualização" 
                                    style={{ maxHeight: '130px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', marginBottom: '12px' }}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                                <div>
                                    <button 
                                        type="button" 
                                        className="btn btn-success" 
                                        onClick={() => handleConfirm(pastedUrl.trim())}
                                        style={{ background: '#10b981', color: '#ffffff', padding: '10px 24px', fontWeight: '800', fontSize: '14px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)' }}
                                    >
                                        <Check size={18} /> Usar Esta Foto
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Image Candidates Grid */}
                    <div className="image-results-container">
                        {loading ? (
                            <div className="loading-state">
                                <Loader size={32} className="spin" />
                                <p>Pesquisando imagens na web...</p>
                            </div>
                        ) : results.length > 0 ? (
                            <div className="image-candidates-grid">
                                {results.map((item, index) => {
                                    const isSelected = selectedUrl === item.url;
                                    return (
                                        <div 
                                            key={index} 
                                            className={`candidate-card ${isSelected ? 'selected' : ''}`}
                                            onClick={() => setSelectedUrl(item.url)}
                                        >
                                            <div className="card-image-box">
                                                <img 
                                                    src={item.url} 
                                                    alt={item.title} 
                                                    onError={(e) => {
                                                        e.target.closest('.candidate-card').style.display = 'none';
                                                    }}
                                                />
                                                {isSelected && (
                                                    <div className="selected-badge">
                                                        <Check size={16} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="card-info">
                                                <span className="source-tag">{item.source}</span>
                                                <p className="image-title">{item.title}</p>
                                            </div>
                                            <button 
                                                type="button" 
                                                className="btn-select-image"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleConfirm(item.url);
                                                }}
                                            >
                                                Usar Esta Foto
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="empty-results">
                                <ImageIcon size={48} className="empty-icon" />
                                <p>Nenhuma imagem encontrada para esta busca.</p>
                                <span>Tente pesquisar por termos mais simples como "Dipirona" ou "Dipirona 500mg".</span>
                            </div>
                        )}
                    </div>
                </div>

                <footer className="web-search-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                    {selectedUrl && (
                        <button type="button" className="btn btn-success" onClick={() => handleConfirm(selectedUrl)}>
                            <Check size={16} /> Confirmar Foto Selecionada
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
};

export default WebImageSearchModal;
