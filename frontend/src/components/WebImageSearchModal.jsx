import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Check, Image as ImageIcon, Loader, ExternalLink, Save, Link } from 'lucide-react';
import api from '../services/api';
import './WebImageSearchModal.css';

const WebImageSearchModal = ({ isOpen, onClose, onSelectImage, initialQuery = '', initialEan = '' }) => {
    const [query, setQuery] = useState(initialQuery);
    const [pastedUrl, setPastedUrl] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedUrl, setSelectedUrl] = useState('');

    const handleSearch = useCallback(async (searchStr = query, eanStr = initialEan) => {
        if (!searchStr && !eanStr) return;
        setLoading(true);
        try {
            // Limpeza inteligente do termo de busca para evitar ruídos
            let cleanQuery = searchStr
                .toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, "") // Remove acentos
                .replace(/\b(kit|pacote|caixa|pct|unidade|pecas|pçs)\b/g, '') // Remove palavras comerciais
                .replace(/\b\d+\s*(unid|peças|pçs|ml|g|kg|l|m)\b/g, '') // Remove medidas/quantidades
                .replace(/[0-9]/g, '') // Remove números isolados
                .replace(/[^a-zA-Z\s]/g, '') // Mantém apenas letras e espaços
                .replace(/\s+/g, ' ')
                .trim();

            // Se a limpeza deixar a string muito curta, recorre ao termo original resumido
            const searchTermFinal = cleanQuery.length >= 3 ? cleanQuery : searchStr;

            // Define termos de contexto comercial seguros para produtos de utilidades/casa/mercado
            const refinedQuery = `${searchTermFinal} embalagem foto produto`;

            const response = await api.get('/products/search-image', {
                params: { q: refinedQuery, ean: eanStr }
            });
            setResults(response.data || []);
        } catch (error) {
            console.error('Erro ao buscar imagens na web:', error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, [query, initialEan]);

    useEffect(() => {
        if (isOpen) {
            setQuery(initialQuery);
            setPastedUrl('');
            setSelectedUrl('');
            setResults([]);
            if (initialQuery || initialEan) {
                handleSearch(initialQuery, initialEan);
            }
        }
    }, [isOpen, initialQuery, initialEan, handleSearch]);

    if (!isOpen) return null;

    const handleConfirm = (url) => {
        if (!url) return;
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
                            <h3>Buscar Foto do Produto</h3>
                            <span className="subtitle">Pesquise automaticamente, selecione dos resultados ou cole o link direto</span>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </header>

                <div className="web-search-body">
                    {/* 1. Barra de Pesquisa por Termo/EAN */}
                    <form className="search-bar-form" onSubmit={(e) => { e.preventDefault(); handleSearch(); }}>
                        <div className="input-with-icon">
                            <Search size={18} className="search-icon" />
                            <input 
                                type="text" 
                                placeholder="Nome do produto, marca ou EAN..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="btn btn-primary btn-search" disabled={loading}>
                            {loading ? <Loader size={16} className="spin" /> : <Search size={16} />}
                            Pesquisar
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

                    {/* 2. Área para colar URL direta */}
                    <div className="paste-link-bar-container" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', marginTop: '14px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <Link size={15} style={{ color: '#0284c7' }} /> Ou cole o link direto da imagem (URL terminada em .jpg/.png):
                        </label>
                        <form onSubmit={(e) => { e.preventDefault(); if (pastedUrl.trim()) handleConfirm(pastedUrl.trim()); }} style={{ display: 'flex', gap: '10px' }}>
                            <input 
                                type="url" 
                                placeholder="https://exemplo.com/foto-produto.jpg"
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
                                    📸 Pré-visualização do link inserido:
                                </span>
                                <img 
                                    src={pastedUrl.trim()} 
                                    alt="Pré-visualização" 
                                    style={{ maxHeight: '120px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', marginBottom: '10px' }}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                                <div>
                                    <button 
                                        type="button" 
                                        className="btn btn-success" 
                                        onClick={() => handleConfirm(pastedUrl.trim())}
                                        style={{ background: '#10b981', color: '#ffffff', padding: '8px 20px', fontWeight: '800', fontSize: '13px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <Check size={16} /> Usar Esta Foto
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Grade de Resultados */}
                    <div className="image-results-container" style={{ marginTop: '16px' }}>
                        {loading ? (
                            <div className="loading-state">
                                <Loader size={32} className="spin" />
                                <p>Buscando imagens correspondentes na web...</p>
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
                                                    alt={item.title || 'Produto'} 
                                                    onError={(e) => {
                                                        // Remove o card se a imagem quebrar
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
                                                <span className="source-tag">{item.source || 'Web'}</span>
                                                <p className="image-title">{item.title || 'Imagem do produto'}</p>
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
                                <p>Nenhuma imagem encontrada automaticamente.</p>
                                <span>Tente refinar o nome do produto ou utilize o botão do <strong>Google Imagens</strong> acima para copiar o link manualmente.</span>
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