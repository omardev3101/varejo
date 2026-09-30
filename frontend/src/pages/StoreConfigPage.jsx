import React, { useState, useEffect } from 'react';
import { Store, Plus, Edit, Trash2, Save, Image as ImageIcon, Search, Check, AlertCircle, Phone, Clock, Truck, ShieldCheck, ToggleLeft, ToggleRight, Sparkles, Layers, Filter } from 'lucide-react';
import api from '../services/api';
import WebImageSearchModal from '../components/WebImageSearchModal';
import { SECTIONS } from '../constants/sections';
import './StoreConfigPage.css';

const StoreConfigPage = () => {
    const [activeTab, setActiveTab] = useState('sections');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    // General Store Settings
    const [settings, setSettings] = useState({
        store_name: 'VarejoPro - Sua Loja Online',
        slogan: 'Produtos, Higiene e Beleza com Entrega Rápida',
        whatsapp: '(11) 99999-8888',
        announcement_text: '🚚 Frete Grátis em compras acima de R$ 50,00 | 💊 Produtos com até 50% de Desconto',
        free_shipping_min: '50.00',
        opening_hours: 'Segunda a Sábado: 07:00 às 22:00 | Domingos: 08:00 às 18:00',
        logo_url: '',
        primary_color: '#10b981',
        secondary_color: '#0f172a',
        system_name: 'REY DAS LOUÇAS ERP',
        support_email: ''
    });

    // Allowed Sections State (array of section codes/names)
    const [allowedSections, setAllowedSections] = useState([]);

    // Banners Array
    const [banners, setBanners] = useState([]);

    // Banner Edit Modal State
    const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
    const [editingBanner, setEditingBanner] = useState(null);
    const [bannerForm, setBannerForm] = useState({
        id: null,
        title: '',
        subtitle: '',
        badge: '',
        image_url: '',
        link: '',
        active: true
    });

    // Web Search Modal State
    const [isWebSearchOpen, setIsWebSearchOpen] = useState(false);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const response = await api.get('/storefront-config');
            const data = response.data || {};
            setSettings({
                store_name: data.store_name || 'VarejoPro - Sua Loja Online',
                slogan: data.slogan || 'Produtos, Higiene e Beleza com Entrega Rápida',
                whatsapp: data.whatsapp || '(11) 99999-8888',
                announcement_text: data.announcement_text || '🚚 Frete Grátis em compras acima de R$ 50,00 | 💊 Produtos com até 50% de Desconto',
                free_shipping_min: data.free_shipping_min || '50.00',
                opening_hours: data.opening_hours || 'Segunda a Sábado: 07:00 às 22:00 | Domingos: 08:00 às 18:00',
                logo_url: data.logo_url || '',
                primary_color: data.primary_color || '#10b981',
                secondary_color: data.secondary_color || '#0f172a',
                system_name: data.system_name || 'REY DAS LOUÇAS ERP',
                support_email: data.support_email || ''
            });
            setBanners(data.banners_json || []);
            setAllowedSections(data.allowed_sections_json || []);
        } catch (error) {
            console.error('Error fetching store settings:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 3500);
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            await api.put('/storefront-config', {
                ...settings,
                banners_json: banners,
                allowed_sections_json: allowedSections
            });
            showToast('✅ Configurações da Loja salvas com sucesso!');
        } catch (error) {
            console.error('Save settings error:', error);
            alert('Erro ao salvar configurações: ' + (error.response?.data?.error || error.message));
        } finally {
            setSaving(false);
        }
    };

    const handleToggleSection = (sectionCode) => {
        setAllowedSections(prev => {
            if (prev.includes(sectionCode)) {
                return prev.filter(c => c !== sectionCode);
            } else {
                return [...prev, sectionCode];
            }
        });
    };

    const handleSelectAllSections = () => {
        if (allowedSections.length === SECTIONS.length) {
            setAllowedSections([]);
        } else {
            setAllowedSections(SECTIONS.map(s => s.code));
        }
    };

    // Banner Modal Actions
    const handleOpenBannerModal = (banner = null) => {
        if (banner) {
            setEditingBanner(banner);
            setBannerForm({ ...banner });
        } else {
            setEditingBanner(null);
            setBannerForm({
                id: Date.now(),
                title: '',
                subtitle: '',
                badge: 'OFERTA DA SEMANA',
                image_url: '',
                link: '',
                active: true
            });
        }
        setIsBannerModalOpen(true);
    };

    const handleSaveBanner = (e) => {
        e.preventDefault();
        if (!bannerForm.title || !bannerForm.image_url) {
            alert('Por favor, preencha o Título e a URL da Imagem do Banner!');
            return;
        }

        if (editingBanner) {
            setBanners(prev => prev.map(b => b.id === bannerForm.id ? { ...bannerForm } : b));
        } else {
            setBanners(prev => [...prev, { ...bannerForm, id: Date.now() }]);
        }
        setIsBannerModalOpen(false);
        showToast('📌 Banner atualizado na lista! Lembre-se de clicar em Salvar Tudo.');
    };

    const handleDeleteBanner = (bannerId) => {
        if (window.confirm('Tem certeza que deseja excluir este banner promocional?')) {
            setBanners(prev => prev.filter(b => b.id !== bannerId));
            showToast('🗑️ Banner removido!');
        }
    };

    const handleToggleBannerActive = (bannerId) => {
        setBanners(prev => prev.map(b => b.id === bannerId ? { ...b, active: !b.active } : b));
    };

    return (
        <div className="store-config-page">
            {/* Header Ribbon */}
            <header className="page-header glass">
                <div className="header-title-flex">
                    <div className="icon-wrapper">
                        <Store size={26} className="text-emerald-500" />
                    </div>
                    <div>
                        <h2>Gestão & Configurações da Loja Virtual</h2>
                        <p>Administre banners do carrossel, avisos, horário e dados da sua loja online</p>
                    </div>
                </div>

                <div className="header-actions">
                    <button 
                        className="btn btn-emerald btn-save-main"
                        onClick={handleSaveSettings}
                        disabled={saving}
                    >
                        <Save size={18} />
                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </header>

            {toastMessage && (
                <div className="toast-notification">
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="tabs-container">
                <button 
                    className={`tab-btn ${activeTab === 'sections' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sections')}
                >
                    <Filter size={18} /> Seções Exibidas na Loja ({allowedSections.length === 0 ? 'Todas' : `${allowedSections.length} Selecionada(s)`})
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'banners' ? 'active' : ''}`}
                    onClick={() => setActiveTab('banners')}
                >
                    <Layers size={18} /> Carrossel de Promoções ({banners.length})
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
                    onClick={() => setActiveTab('general')}
                >
                    <Store size={18} /> Dados Institucionais & Contato
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'shipping' ? 'active' : ''}`}
                    onClick={() => setActiveTab('shipping')}
                >
                    <Truck size={18} /> Frete & Faixa de Avisos
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'whitelabel' ? 'active' : ''}`}
                    onClick={() => setActiveTab('whitelabel')}
                >
                    <Sparkles size={18} /> Aparência (Whitelabel)
                </button>
            </div>

            {/* Tab 0: Sections Filter */}
            {activeTab === 'sections' && (
                <div className="tab-content">
                    <div className="content-card glass">
                        <div className="card-header-flex">
                            <div>
                                <h3>Seções de Produtos Visíveis na Loja Virtual</h3>
                                <p>Selecione de quais seções os produtos devem ser exibidos no e-commerce. Se nenhuma seção for selecionada, **todas as seções serão exibidas por padrão**.</p>
                            </div>
                            <button className="btn btn-secondary btn-sm" onClick={handleSelectAllSections}>
                                <Check size={16} /> {allowedSections.length === SECTIONS.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                            </button>
                        </div>

                        <div className="sections-selector-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginTop: '20px' }}>
                            {SECTIONS.map((sec) => {
                                const isChecked = allowedSections.length === 0 || allowedSections.includes(sec.code) || allowedSections.includes(sec.name);
                                return (
                                    <div 
                                        key={sec.code} 
                                        onClick={() => handleToggleSection(sec.code)}
                                        style={{
                                            padding: '16px 20px',
                                            borderRadius: '12px',
                                            border: isChecked ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                                            background: isChecked ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.02)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <div>
                                            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>Código: {sec.code}</span>
                                            <strong style={{ fontSize: '16px', color: '#f8fafc' }}>{sec.label}</strong>
                                        </div>
                                        <div style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '6px',
                                            background: isChecked ? '#10b981' : 'rgba(255,255,255,0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff'
                                        }}>
                                            {isChecked && <Check size={16} />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ marginTop: '20px', padding: '12px 16px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', fontSize: '13px', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertCircle size={18} />
                            <span>Caso deseje restabelecer a exibição de <strong>todos os produtos de todas as seções</strong>, basta clicar em "Desmarcar Todos".</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 1: Promotional Banners */}
            {activeTab === 'banners' && (
                <div className="tab-content">
                    <div className="content-card glass">
                        <div className="card-header-flex">
                            <div>
                                <h3>Carrossel Promocional Superior</h3>
                                <p>Gerencie os destaques promocionais exibidos no topo da Loja Virtual</p>
                            </div>
                            <button className="btn btn-primary" onClick={() => handleOpenBannerModal()}>
                                <Plus size={18} /> Novo Banner Promocional
                            </button>
                        </div>

                        {banners.length > 0 ? (
                            <div className="banners-grid">
                                {banners.map((banner) => (
                                    <div key={banner.id} className={`banner-card ${!banner.active ? 'disabled' : ''}`}>
                                        <div className="banner-preview-box">
                                            <img src={banner.image_url} alt={banner.title} onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=600&auto=format&fit=crop&q=80'; }} />
                                            {banner.badge && <span className="banner-badge">{banner.badge}</span>}
                                            <div className="banner-overlay-info">
                                                <h4>{banner.title}</h4>
                                                <p>{banner.subtitle}</p>
                                            </div>
                                        </div>

                                        <div className="banner-card-body">
                                            <div className="status-flex">
                                                <span className={`status-tag ${banner.active ? 'active' : 'inactive'}`}>
                                                    {banner.active ? '• Exibindo na Loja' : '• Inativo'}
                                                </span>
                                                <button 
                                                    className="toggle-btn"
                                                    onClick={() => handleToggleBannerActive(banner.id)}
                                                    title={banner.active ? 'Desativar Banner' : 'Ativar Banner'}
                                                >
                                                    {banner.active ? <ToggleRight size={22} className="text-emerald" /> : <ToggleLeft size={22} className="text-muted" />}
                                                </button>
                                            </div>

                                            <div className="banner-card-actions">
                                                <button className="btn btn-secondary btn-sm" onClick={() => handleOpenBannerModal(banner)}>
                                                    <Edit size={14} /> Editar
                                                </button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteBanner(banner.id)}>
                                                    <Trash2 size={14} /> Excluir
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-banners-state">
                                <Sparkles size={48} className="empty-icon" />
                                <h4>Nenhum banner cadastrado</h4>
                                <p>Clique no botão acima para adicionar seu primeiro carrossel de promoções!</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Tab 2: Store Identity & Contact */}
            {activeTab === 'general' && (
                <div className="tab-content">
                    <div className="content-card glass">
                        <h3>Informações Institucionais da Loja</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Nome da Loja Virtual</label>
                                <input 
                                    type="text" 
                                    value={settings.store_name}
                                    onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Slogan da Loja</label>
                                <input 
                                    type="text" 
                                    value={settings.slogan}
                                    onChange={(e) => setSettings({ ...settings, slogan: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>WhatsApp de Atendimento & Pedidos</label>
                                <input 
                                    type="text" 
                                    value={settings.whatsapp}
                                    onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                                    placeholder="(11) 99999-8888"
                                />
                            </div>

                            <div className="form-group">
                                <label>Horário de Funcionamento</label>
                                <input 
                                    type="text" 
                                    value={settings.opening_hours}
                                    onChange={(e) => setSettings({ ...settings, opening_hours: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 4: Whitelabel Settings */}
            {activeTab === 'whitelabel' && (
                <div className="tab-content">
                    <div className="content-card glass">
                        <h3>Identidade Visual e Whitelabel</h3>
                        <p style={{marginBottom: '20px', color: '#94a3b8'}}>Altere as cores, logomarca e o nome do sistema para customizá-lo para a sua empresa.</p>
                        
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Nome do Sistema (Whitelabel)</label>
                                <input 
                                    type="text" 
                                    value={settings.system_name}
                                    onChange={(e) => setSettings({ ...settings, system_name: e.target.value })}
                                    placeholder="Ex: Meu ERP"
                                />
                            </div>

                            <div className="form-group">
                                <label>E-mail de Suporte / Contato</label>
                                <input 
                                    type="email" 
                                    value={settings.support_email}
                                    onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                                    placeholder="suporte@minhaempresa.com"
                                />
                            </div>

                            <div className="form-group full-width">
                                <label>URL da Logomarca do Sistema e Loja</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input 
                                        type="text" 
                                        value={settings.logo_url}
                                        onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                                        placeholder="https://sua-logo.com/logo.png"
                                        style={{ flex: 1 }}
                                    />
                                </div>
                                {settings.logo_url && (
                                    <div style={{ marginTop: '10px', background: '#fff', padding: '10px', borderRadius: '8px', display: 'inline-block' }}>
                                        <img src={settings.logo_url} alt="Logo Preview" style={{ maxHeight: '60px' }} onError={(e) => e.target.style.display='none'} />
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Cor Primária (Hexadecimal)</label>
                                <div style={{display: 'flex', gap: '10px'}}>
                                    <input 
                                        type="color" 
                                        value={settings.primary_color}
                                        onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                                        style={{width: '50px', padding: '2px'}}
                                    />
                                    <input 
                                        type="text" 
                                        value={settings.primary_color}
                                        onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Cor Secundária (Menu Lateral/Topo)</label>
                                <div style={{display: 'flex', gap: '10px'}}>
                                    <input 
                                        type="color" 
                                        value={settings.secondary_color}
                                        onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                                        style={{width: '50px', padding: '2px'}}
                                    />
                                    <input 
                                        type="text" 
                                        value={settings.secondary_color}
                                        onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 3: Shipping & Announcements */}
            {activeTab === 'shipping' && (
                <div className="tab-content">
                    <div className="content-card glass">
                        <h3>Avisos e Regras de Frete</h3>
                        <div className="form-grid">
                            <div className="form-group full-width">
                                <label>Texto da Faixa Superior de Avisos (Announcement Bar)</label>
                                <input 
                                    type="text" 
                                    value={settings.announcement_text}
                                    onChange={(e) => setSettings({ ...settings, announcement_text: e.target.value })}
                                />
                                <span className="input-hint">Exibido na faixa verde fixa no topo do e-commerce</span>
                            </div>

                            <div className="form-group">
                                <label>Valor Mínimo para Frete Grátis (R$)</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    value={settings.free_shipping_min}
                                    onChange={(e) => setSettings({ ...settings, free_shipping_min: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Banner Add/Edit Modal */}
            {isBannerModalOpen && (
                <div className="modal-overlay" onClick={() => setIsBannerModalOpen(false)}>
                    <div className="modal-content glass" onClick={(e) => e.stopPropagation()}>
                        <header className="modal-header">
                            <h3>{editingBanner ? 'Editar Banner Promocional' : 'Novo Banner Promocional'}</h3>
                            <button className="close-btn" onClick={() => setIsBannerModalOpen(false)}><X size={20} /></button>
                        </header>

                        <form onSubmit={handleSaveBanner} className="modal-body">
                            <div className="form-group">
                                <label>Título Principal do Banner</label>
                                <input 
                                    type="text" 
                                    value={bannerForm.title}
                                    onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                                    placeholder="Ex: Festival da Saúde VarejoPro"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Subtítulo / Descrição da Promoção</label>
                                <input 
                                    type="text" 
                                    value={bannerForm.subtitle}
                                    onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                                    placeholder="Ex: Até 50% OFF em Produtos Genéricos"
                                />
                            </div>

                            <div className="form-group">
                                <label>Selo / Destaque Promocional (Badge)</label>
                                <input 
                                    type="text" 
                                    value={bannerForm.badge}
                                    onChange={(e) => setBannerForm({ ...bannerForm, badge: e.target.value })}
                                    placeholder="Ex: FRETE GRÁTIS | 30% OFF | OFERTA DO DIA"
                                />
                            </div>

                            <div className="form-group">
                                <label>URL da Imagem de Fundo</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input 
                                        type="text" 
                                        value={bannerForm.image_url}
                                        onChange={(e) => setBannerForm({ ...bannerForm, image_url: e.target.value })}
                                        placeholder="https://exemplo.com/foto.jpg"
                                        required
                                        style={{ flex: 1 }}
                                    />
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary"
                                        onClick={() => setIsWebSearchOpen(true)}
                                        style={{ background: '#0284c7', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <Search size={16} /> Buscar Foto
                                    </button>
                                </div>
                            </div>

                            {bannerForm.image_url && (
                                <div className="banner-modal-preview">
                                    <span>Pré-visualização do Banner:</span>
                                    <div className="banner-preview-box">
                                        <img src={bannerForm.image_url} alt="Preview" onError={(e) => { e.target.style.display = 'none'; }} />
                                        {bannerForm.badge && <span className="banner-badge">{bannerForm.badge}</span>}
                                        <div className="banner-overlay-info">
                                            <h4>{bannerForm.title || 'Título da Promoção'}</h4>
                                            <p>{bannerForm.subtitle || 'Descrição da Oferta'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <footer className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setIsBannerModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">
                                    <Save size={16} /> Salvar Banner
                                </button>
                            </footer>
                        </form>
                    </div>
                </div>
            )}

            {/* Web Image Search Modal */}
            <WebImageSearchModal 
                isOpen={isWebSearchOpen}
                onClose={() => setIsWebSearchOpen(false)}
                initialQuery={bannerForm.title}
                onSelectImage={(url) => setBannerForm(prev => ({ ...prev, image_url: url }))}
            />
        </div>
    );
};

export default StoreConfigPage;
