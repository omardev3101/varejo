import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    ShoppingBag, Search, ShieldCheck, Truck, CreditCard, User, Lock, Mail, 
    Phone, MapPin, CheckCircle, AlertCircle, Plus, Minus, X, Copy, QrCode, 
    Building, ArrowRight, Heart, Sparkles, RefreshCw, KeyRound, UserCheck, Users,
    Thermometer, Stethoscope, Activity, Pill, Zap, ChevronRight, Check
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import './StorefrontPage.css';

const getSocioApiBase = () => {
    const isDev = import.meta.env.MODE === 'development';
    if (isDev) return 'http://localhost:3000/api/socio';
    if (window.location.pathname.includes('/varejo')) return '/varejo/api/socio';
    return '/api/socio';
};

const API_BASE = getSocioApiBase();

const GARAGES = [
    'Garagem Sambaíba',
    'Garagem Gato Preto',
    'Garagem Via Sudeste',
    'Garagem Express',
    'Garagem Metra',
    'Garagem KTT',
    'Garagem Santa Brígida',
    'Garagem Campo Belo',
    'Garagem Mobibrasil',
    'Outra Garagem / Base'
];

const CIRCULAR_CATEGORIES = [
    { id: 'all', name: 'Todos', icon: Pill, color: '#3b82f6' },
    { id: 'popular', name: 'Desconto Promocional', icon: Heart, color: '#f43f5e' },
    { id: 'dor', name: 'Dor e Febre', icon: Thermometer, color: '#eab308' },
    { id: 'gripe', name: 'Gripe e Alergia', icon: Activity, color: '#06b6d4' },
    { id: 'pressao', name: 'Pressão Alta', icon: Stethoscope, color: '#ef4444' },
    { id: 'higiene', name: 'Higiene e Cuidados', icon: Sparkles, color: '#10b981' },
    { id: 'vitaminas', name: 'Vitaminas', icon: Zap, color: '#8b5cf6' }
];

const StorefrontPage = () => {
    // Socio Auth State
    const [socioToken, setSocioToken] = useState(localStorage.getItem('socioToken') || '');
    const [socio, setSocio] = useState(JSON.parse(localStorage.getItem('socioData') || 'null'));

    // Modal States
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authTab, setAuthTab] = useState('login'); // 'login', 'check', 'profile', 'activate'

    // Auth Form State
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [checkData, setCheckData] = useState(null);
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState('');
    const [authSuccess, setAuthSuccess] = useState('');

    // Registration Form State
    const [regPhone, setRegPhone] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regGarage, setRegGarage] = useState(GARAGES[0]);
    const [regAddress, setRegAddress] = useState('');
    const [regNumber, setRegNumber] = useState('');
    const [regNeighborhood, setRegNeighborhood] = useState('');
    const [regCity, setRegCity] = useState('');
    const [regState, setRegState] = useState('SP');
    const [regZip, setRegZip] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regConfirmPassword, setRegConfirmPassword] = useState('');
    const [authorizedPersons, setAuthorizedPersons] = useState([]);
    const [newPersonName, setNewPersonName] = useState('');
    const [newPersonRelation, setNewPersonRelation] = useState('');
    const [activationCode, setActivationCode] = useState('');
    const [codePreview, setCodePreview] = useState('');

    // Catalog & Filter State
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedCircleCat, setSelectedCircleCat] = useState('all');
    const [filterFarmaciaPopular, setFilterFarmaciaPopular] = useState(false);
    const [selectedGarageHeader, setSelectedGarageHeader] = useState(GARAGES[0]);
    const [loadingProducts, setLoadingProducts] = useState(true);

    // Cart & Dual Checkout State
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('pix'); // 'pix' or 'desconto_folha'
    const [deliveryType, setDeliveryType] = useState('address'); // 'address' or 'pickup'
    const [buyerName, setBuyerName] = useState('');
    const [buyerPhone, setBuyerPhone] = useState('');
    const [buyerGarage, setBuyerGarage] = useState(GARAGES[0]);
    const [buyerAddress, setBuyerAddress] = useState('');
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [orderResult, setOrderResult] = useState(null);
    const [copiedPix, setCopiedPix] = useState(false);

    const [storeConfig, setStoreConfig] = useState(null);

    useEffect(() => {
        fetchProducts();
        fetchStoreConfig();
    }, []);

    useEffect(() => {
        let interval = null;
        if (orderResult && orderResult.order_number) {
            interval = setInterval(async () => {
                try {
                    const res = await axios.get(`${API_BASE}/order-status/${orderResult.order_number}`);
                    if (res.data && res.data.status && res.data.status !== orderResult.status) {
                        setOrderResult(prev => ({ ...prev, status: res.data.status }));
                    }
                } catch (e) {
                    // Silent polling error
                }
            }, 3000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [orderResult]);

    const fetchStoreConfig = async () => {
        try {
            const res = await axios.get(`${API_BASE}/storefront-config`);
            setStoreConfig(res.data);
        } catch (err) {
            console.error('Error fetching storefront config:', err);
        }
    };

    const fetchProducts = async () => {
        try {
            setLoadingProducts(true);
            const res = await axios.get(`${API_BASE}/products`);
            setProducts(res.data);
            const cats = [...new Set(res.data.map(p => p.category ? p.category.name : 'Geral'))];
            setCategories(cats);
        } catch (err) {
            console.error('Error fetching public products:', err);
        } finally {
            setLoadingProducts(false);
        }
    };

    // --- CHECKOUT HANDLERS ---
    const handleCheckoutPix = async () => {
        if (cart.length === 0) return;

        if (!socio && deliveryType === 'address' && (!buyerName || !buyerPhone)) {
            alert('Por favor, preencha seu Nome e Telefone/WhatsApp para a entrega.');
            return;
        }

        try {
            setCheckoutLoading(true);
            const res = await axios.post(`${API_BASE}/checkout-pix`, {
                socioId: socio ? socio.id : null,
                buyer_name: socio ? socio.name : (buyerName || 'Cliente Online'),
                buyer_phone: socio ? socio.phone : buyerPhone,
                garage: socio ? socio.garage : (buyerGarage || selectedGarageHeader),
                items: cart,
                delivery_type: deliveryType,
                delivery_address: socio ? socio.address : buyerAddress,
                total_amount: cartTotal
            });

            setOrderResult(res.data);
            setCart([]);
            setIsCartOpen(false);
        } catch (err) {
            alert(err.response?.data?.error || 'Erro ao processar pedido via PIX.');
        } finally {
            setCheckoutLoading(false);
        }
    };

    const handleCheckoutPayroll = async () => {
        if (!socio) {
            setIsAuthModalOpen(true);
            setAuthTab('check');
            setAuthError('Você precisa estar logado com seu CPF/Matrícula para utilizar o Desconto em Folha.');
            return;
        }

        if (cart.length === 0) return;

        try {
            setCheckoutLoading(true);
            const res = await axios.post(`${API_BASE}/checkout-payroll`, {
                socioId: socio.id,
                items: cart,
                delivery_type: deliveryType,
                delivery_address: socio.address,
                total_amount: cartTotal
            }, {
                headers: { Authorization: `Bearer ${socioToken}` }
            });

            const updatedSocio = { ...socio, available_limit: res.data.remaining_limit };
            setSocio(updatedSocio);
            localStorage.setItem('socioData', JSON.stringify(updatedSocio));

            setOrderResult(res.data);
            setCart([]);
            setIsCartOpen(false);
        } catch (err) {
            alert(err.response?.data?.error || 'Erro ao processar Desconto em Folha.');
        } finally {
            setCheckoutLoading(false);
        }
    };

    // --- AUTH HANDLERS ---
    const handleCheckSocio = async (e) => {
        e.preventDefault();
        setAuthError('');
        setAuthSuccess('');

        if (!identifier) {
            setAuthError('Digite seu CPF ou Matrícula.');
            return;
        }

        try {
            setAuthLoading(true);
            const res = await axios.post(`${API_BASE}/check`, { identifier });
            setCheckData(res.data);

            if (res.data.has_password && res.data.email_verified) {
                setAuthTab('login');
                setAuthSuccess('Sócio localizado com cadastro ativo! Digite sua senha para entrar.');
            } else {
                setRegEmail(res.data.email || '');
                setRegPhone(res.data.phone || '');
                setRegGarage(res.data.garage || GARAGES[0]);
                setAuthTab('profile');
            }
        } catch (err) {
            setAuthError(err.response?.data?.error || 'Erro ao consultar sócio.');
        } finally {
            setAuthLoading(false);
        }
    };

    const handleAddPerson = () => {
        if (!newPersonName) return;
        setAuthorizedPersons([...authorizedPersons, { name: newPersonName, relation: newPersonRelation || 'Dependente' }]);
        setNewPersonName('');
        setNewPersonRelation('');
    };

    const handleRemovePerson = (index) => {
        setAuthorizedPersons(authorizedPersons.filter((_, i) => i !== index));
    };

    const handleRegisterProfile = async (e) => {
        e.preventDefault();
        setAuthError('');
        setAuthSuccess('');

        if (!regEmail || !regPassword) {
            setAuthError('E-mail e Senha são obrigatórios.');
            return;
        }

        if (regPassword !== regConfirmPassword) {
            setAuthError('As senhas não coincidem.');
            return;
        }

        try {
            setAuthLoading(true);
            const res = await axios.post(`${API_BASE}/register`, {
                identifier,
                phone: regPhone,
                email: regEmail,
                garage: regGarage,
                address: regAddress,
                number: regNumber,
                neighborhood: regNeighborhood,
                city: regCity,
                state: regState,
                zip_code: regZip,
                authorized_persons: authorizedPersons,
                password: regPassword
            });

            if (res.data.activation_code_preview) {
                setCodePreview(res.data.activation_code_preview);
            }
            setAuthSuccess(res.data.message);
            setAuthTab('activate');
        } catch (err) {
            setAuthError(err.response?.data?.error || 'Erro ao registrar informações.');
        } finally {
            setAuthLoading(false);
        }
    };

    const handleVerifyActivation = async (e) => {
        e.preventDefault();
        setAuthError('');
        setAuthSuccess('');

        if (!activationCode) {
            setAuthError('Digite o código de 6 dígitos enviado por e-mail.');
            return;
        }

        try {
            setAuthLoading(true);
            const res = await axios.post(`${API_BASE}/verify-email`, {
                identifier,
                code: activationCode
            });

            localStorage.setItem('socioToken', res.data.token);
            localStorage.setItem('socioData', JSON.stringify(res.data.socio));

            setSocioToken(res.data.token);
            setSocio(res.data.socio);

            setAuthSuccess('Sua conta de sócio foi ativada com sucesso!');
            setTimeout(() => {
                setIsAuthModalOpen(false);
            }, 1200);
        } catch (err) {
            setAuthError(err.response?.data?.error || 'Código incorreto ou expirado.');
        } finally {
            setAuthLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setAuthError('');
        setAuthSuccess('');

        try {
            setAuthLoading(true);
            const res = await axios.post(`${API_BASE}/login`, { identifier, password });

            localStorage.setItem('socioToken', res.data.token);
            localStorage.setItem('socioData', JSON.stringify(res.data.socio));

            setSocioToken(res.data.token);
            setSocio(res.data.socio);

            setIsAuthModalOpen(false);
        } catch (err) {
            if (err.response?.data?.needs_verification) {
                setRegEmail(err.response.data.email);
                setAuthTab('activate');
                setAuthError(err.response.data.error);
            } else {
                setAuthError(err.response?.data?.error || 'Erro ao efetuar login.');
            }
        } finally {
            setAuthLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('socioToken');
        localStorage.removeItem('socioData');
        setSocioToken('');
        setSocio(null);
    };

    // --- CART HANDLERS ---
    const addToCart = (product) => {
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
        } else {
            setCart([...cart, { ...product, quantity: 1 }]);
        }
        setIsCartOpen(true);
    };

    const updateQuantity = (productId, delta) => {
        setCart(cart.map(item => {
            if (item.id === productId) {
                const newQty = item.quantity + delta;
                return newQty > 0 ? { ...item, quantity: newQty } : null;
            }
            return item;
        }).filter(Boolean));
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopiedPix(true);
        setTimeout(() => setCopiedPix(false), 2000);
    };

const POPULAR_KEYWORDS = [
    'losartana', 'enalapril', 'captopril', 'atenolol', 'propranolol', 'hidroclorotiazida', 'furosemida',
    'metformina', 'gliclazida', 'glibenclamida', 'insulina', 'dapagliflozina',
    'salbutamol', 'beclometasona', 'budesonida',
    'dipirona', 'paracetamol', 'omeprazol', 'sinvastatina', 'amoxicilina', 'ibuprofeno'
];

const isPopularProduct = (p) => {
    if (p.is_promocional) return true;
    if (p.continuous_use) return true;
    const nameLower = (p.name || '').toLowerCase();
    const activeLower = (p.active_principle || '').toLowerCase();
    return POPULAR_KEYWORDS.some(kw => nameLower.includes(kw) || activeLower.includes(kw));
};

const DEFAULT_CATEGORY_IMAGES = {
    shampoo: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400&auto=format&fit=crop&q=80',
    desodorante: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&auto=format&fit=crop&q=80',
    sabonete: 'https://images.unsplash.com/photo-1607006482802-603b51680d28?w=400&auto=format&fit=crop&q=80',
    cremedental: 'https://images.unsplash.com/photo-1559598467-f8b76c8155d0?w=400&auto=format&fit=crop&q=80',
    alcool: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80',
    papel: 'https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=400&auto=format&fit=crop&q=80',
    dor: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80',
    gripe: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400&auto=format&fit=crop&q=80',
    pressao: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=400&auto=format&fit=crop&q=80',
    vitaminas: 'https://images.unsplash.com/photo-1577401239170-897942555fb3?w=400&auto=format&fit=crop&q=80',
    produtos: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400&auto=format&fit=crop&q=80'
};

const getProductImageUrl = (product) => {
    if (product && product.image_url) {
        let url = String(product.image_url).trim();
        if (url.startsWith('http://')) {
            url = url.replace('http://', 'https://');
        }
        if (url.includes('/varejo/uploads/')) {
            url = url.replace('/varejo/uploads/', '/varejo/api/uploads/');
        }
        if (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('data:')) {
            return url;
        }
        if (url.startsWith('/varejo/api/uploads/')) {
            return url;
        }
        if (url.startsWith('/api/uploads/')) {
            return `/varejo${url}`;
        }
        if (url.startsWith('/uploads/')) {
            return `/varejo/api${url}`;
        }
        return url;
    }
    const nameLower = (product?.name || '').toLowerCase();
    if (nameLower.includes('shampoo') || nameLower.includes('condicionador') || nameLower.includes('xampu')) return DEFAULT_CATEGORY_IMAGES.shampoo;
    if (nameLower.includes('desodorante') || nameLower.includes('rexona') || nameLower.includes('nivea')) return DEFAULT_CATEGORY_IMAGES.desodorante;
    if (nameLower.includes('sabonete') || nameLower.includes('protex') || nameLower.includes('dove')) return DEFAULT_CATEGORY_IMAGES.sabonete;
    if (nameLower.includes('creme dental') || nameLower.includes('colgate') || nameLower.includes('enxaguante') || nameLower.includes('listerine')) return DEFAULT_CATEGORY_IMAGES.cremedental;
    if (nameLower.includes('álcool') || nameLower.includes('gel')) return DEFAULT_CATEGORY_IMAGES.alcool;
    if (nameLower.includes('papel') || nameLower.includes('neve') || nameLower.includes('toalhas') || nameLower.includes('huggies')) return DEFAULT_CATEGORY_IMAGES.papel;
    if (nameLower.includes('vitamina') || nameLower.includes('cálcio') || nameLower.includes('suplemento')) return DEFAULT_CATEGORY_IMAGES.vitaminas;
    if (nameLower.includes('losartana') || nameLower.includes('enalapril') || nameLower.includes('captopril') || nameLower.includes('pressão')) return DEFAULT_CATEGORY_IMAGES.pressao;
    if (nameLower.includes('gripe') || nameLower.includes('alergia') || nameLower.includes('xarope')) return DEFAULT_CATEGORY_IMAGES.gripe;
    if (nameLower.includes('dipirona') || nameLower.includes('paracetamol') || nameLower.includes('ibuprofeno') || nameLower.includes('dor')) return DEFAULT_CATEGORY_IMAGES.dor;
    
    return DEFAULT_CATEGORY_IMAGES.produtos;
};

const matchesFilterCategory = (p, filterId) => {
    if (!filterId || filterId === 'all') return true;
    if (filterId === 'popular') return isPopularProduct(p);

    const nameLower = (p.name || '').toLowerCase();
    const activeLower = (p.active_principle || '').toLowerCase();
    const catNameLower = (p.category?.name || p.category || '').toLowerCase();

    if (filterId === 'dor') {
        return catNameLower.includes('dor') || catNameLower.includes('febre') ||
               ['dor', 'febre', 'dipirona', 'paracetamol', 'ibuprofeno', 'anador', 'dorflex', 'novalgina', 'tylenol', 'aspirina', 'anti-inflamatório'].some(kw => nameLower.includes(kw) || activeLower.includes(kw));
    }
    if (filterId === 'gripe') {
        return catNameLower.includes('gripe') || catNameLower.includes('alergia') ||
               ['gripe', 'alergia', 'xarope', 'cimegripe', 'resfenol', 'loratadina', 'desloratadina', 'allegra', 'histamin', 'descongestionante', 'vick'].some(kw => nameLower.includes(kw) || activeLower.includes(kw));
    }
    if (filterId === 'pressao') {
        return catNameLower.includes('pressão') || catNameLower.includes('cardio') ||
               ['pressão', 'losartana', 'enalapril', 'captopril', 'atenolol', 'propranolol', 'hidroclorotiazida', 'furosemida', 'anlodipino', 'hipertensão'].some(kw => nameLower.includes(kw) || activeLower.includes(kw));
    }
    if (filterId === 'higiene') {
        return catNameLower.includes('higiene') || catNameLower.includes('cuidados') || catNameLower.includes('limpeza') ||
               ['shampoo', 'xampu', 'condicionador', 'desodorante', 'sabonete', 'creme dental', 'listerine', 'álcool', 'toalhas', 'papel higiênico', 'higiene', 'cuidados', 'protex', 'dove', 'pantene', 'rexona', 'nivea', 'colgate', 'huggies', 'neve'].some(kw => nameLower.includes(kw) || activeLower.includes(kw));
    }
    if (filterId === 'vitaminas') {
        return catNameLower.includes('vitamina') || catNameLower.includes('suplemento') ||
               ['vitamina', 'cálcio', 'suplemento', 'multivitamínico', 'ômega', 'zinco', 'magnésio', 'lavitan', 'centrum'].some(kw => nameLower.includes(kw) || activeLower.includes(kw));
    }
    return true;
};

    const cartTotal = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);

    // --- PRODUCT FILTERING ---
    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                              (p.barcode && p.barcode.includes(search)) ||
                              (p.active_principle && p.active_principle.toLowerCase().includes(search.toLowerCase()));
        
        const matchesCategory = selectedCategory === 'all' || (p.category && (p.category.name === selectedCategory || p.category === selectedCategory));
        const matchesFarmaciaPopular = !filterFarmaciaPopular || isPopularProduct(p);
        const matchesCircle = matchesFilterCategory(p, selectedCircleCat);

        return matchesSearch && matchesCategory && matchesFarmaciaPopular && matchesCircle;
    });

    return (
        <div className="drogasil-storefront">
            {/* Top Announcement Bar */}
            <div className="top-nav-bar">
                <div className="container nav-banner-flex">
                    <span>{storeConfig?.announcement_text || '⚡ Entrega Expressa para Garagens • Desconto Exclusivo em Folha para Sócios do Sindimotoristas • 100% Seguro'}</span>
                    <div className="banner-links">
                        <a href="/login" className="link-item">Painel ERP &rarr;</a>
                    </div>
                </div>
            </div>

            {/* Drogasil Primary Red/Emerald Header */}
            <header className="main-drogasil-header">
                <div className="container header-grid">
                    {/* Brand Logo */}
                    <div className="brand-box" onClick={() => window.location.reload()}>
                        <div className="brand-badge">FB</div>
                        <div className="brand-text">
                            <h2>{storeConfig?.store_name ? storeConfig.store_name.split('-')[0] : 'VarejoPro'} <span className="highlight-tag">Drogaria</span></h2>
                            <p>{storeConfig?.slogan || 'Sua Loja Digital do Sindimotoristas'}</p>
                        </div>
                    </div>

                    {/* Big Drogasil Search Bar */}
                    <div className="drogasil-search-box">
                        <Search className="search-icon" size={20} />
                        <input 
                            type="text" 
                            placeholder="O que você procura hoje? Digite produto, princípio ativo..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        {search && <X className="clear-search" size={18} onClick={() => setSearch('')} />}
                    </div>

                    {/* Delivery Location Selector */}
                    <div className="location-selector-box">
                        <MapPin size={18} className="loc-icon" />
                        <div className="loc-text">
                            <span className="label">Entregar em:</span>
                            <select 
                                value={selectedGarageHeader} 
                                onChange={e => setSelectedGarageHeader(e.target.value)}
                                className="garage-select"
                            >
                                {GARAGES.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Account & Cart Actions */}
                    <div className="header-actions">
                        {socio ? (
                            <div className="socio-user-card">
                                <div className="user-avatar"><User size={16} /></div>
                                <div className="user-details">
                                    <span className="user-name">Olá, {socio.name.split(' ')[0]}</span>
                                    <span className="user-credit">Limite: <strong className="val">R$ {(socio.available_limit || 0).toFixed(2)}</strong></span>
                                </div>
                                <button className="btn-exit" onClick={handleLogout} title="Sair">Sair</button>
                            </div>
                        ) : (
                            <button className="btn-account-login" onClick={() => { setIsAuthModalOpen(true); setAuthTab('check'); }}>
                                <User size={18} />
                                <div>
                                    <strong className="block">Entre ou Cadastre-se</strong>
                                    <span className="sub">Entrar com CPF/Matrícula</span>
                                </div>
                            </button>
                        )}

                        <button className="drogasil-cart-btn" onClick={() => setIsCartOpen(true)}>
                            <div className="icon-wrap">
                                <ShoppingBag size={22} />
                                {cart.length > 0 && <span className="badge">{cart.reduce((a, c) => a + c.quantity, 0)}</span>}
                            </div>
                            <div className="cart-price-info">
                                <span className="cart-label">Meu Carrinho</span>
                                <strong className="cart-total">R$ {cartTotal.toFixed(2)}</strong>
                            </div>
                        </button>
                    </div>
                </div>
            </header>

            {/* Horizontal Category Nav Ribbon */}
            <nav className="category-ribbon-bar">
                <div className="container ribbon-flex">
                    <button 
                        className={`ribbon-item ${selectedCategory === 'all' && selectedCircleCat === 'all' ? 'active' : ''}`}
                        onClick={() => {
                            setSelectedCategory('all');
                            setSelectedCircleCat('all');
                            setFilterFarmaciaPopular(false);
                        }}
                    >
                        <Pill size={14} /> Todos os Produtos
                    </button>
                    {categories.map((catName) => (
                        <button
                            key={catName}
                            className={`ribbon-item ${selectedCategory === catName ? 'active' : ''}`}
                            onClick={() => {
                                setSelectedCategory(catName);
                                setSelectedCircleCat('all');
                                setFilterFarmaciaPopular(false);
                            }}
                        >
                            <Sparkles size={14} /> {catName}
                        </button>
                    ))}
                    {CIRCULAR_CATEGORIES.filter(c => c.id !== 'all').map(cat => {
                        const Icon = cat.icon;
                        const isSelected = selectedCircleCat === cat.id;
                        return (
                            <button 
                                key={cat.id}
                                className={`ribbon-item ${cat.id === 'popular' ? 'highlight-popular' : ''} ${isSelected ? 'active' : ''}`}
                                onClick={() => {
                                    setSelectedCircleCat(cat.id);
                                    setSelectedCategory('all');
                                    if (cat.id === 'popular') setFilterFarmaciaPopular(true);
                                    else setFilterFarmaciaPopular(false);
                                }}
                            >
                                <Icon size={14} /> {cat.name}
                            </button>
                        );
                    })}
                </div>
            </nav>

            {/* Hero Banners Section */}
            <section className="hero-banners-section">
                <div className="container hero-banners-grid">
                    {storeConfig?.banners_json && storeConfig.banners_json.filter(b => b.active).length > 0 ? (
                        storeConfig.banners_json.filter(b => b.active).map((b, idx) => (
                            <div 
                                key={b.id || idx} 
                                className={`hero-banner-card ${idx % 3 === 0 ? 'card-emerald' : idx % 3 === 1 ? 'card-rose' : 'card-blue'}`}
                                style={b.image_url ? { 
                                    backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.85)), url(${b.image_url})`, 
                                    backgroundSize: 'cover', 
                                    backgroundPosition: 'center' 
                                } : {}}
                            >
                                {b.badge && <div className="card-badge"><Sparkles size={14} /> {b.badge}</div>}
                                <h3>{b.title}</h3>
                                <p>{b.subtitle}</p>
                                <button className="btn-banner" onClick={() => { if (b.link) window.open(b.link, '_blank'); else setIsCartOpen(true); }}>
                                    Ver Ofertas &rarr;
                                </button>
                            </div>
                        ))
                    ) : (
                        <>
                            <div className="hero-banner-card card-emerald">
                                <div className="card-badge"><Sparkles size={14} /> Clube do Sócio</div>
                                <h3>Desconto Direto em Folha de Pagamento</h3>
                                <p>Associados possuem limite de crédito pré-aprovado sem burocracia.</p>
                                <button className="btn-banner" onClick={() => { setIsAuthModalOpen(true); setAuthTab('check'); }}>
                                    Ativar Meu Limite &rarr;
                                </button>
                            </div>

                            <div className="hero-banner-card card-rose">
                                <div className="card-badge"><Heart size={14} /> Governo Federal</div>
                                <h3>Desconto Promocional com Subsídio 100%</h3>
                                <p>Produtos para Pressão, Diabetes e Asma sem custo.</p>
                                <button className="btn-banner" onClick={() => setFilterFarmaciaPopular(true)}>
                                    Ver Produtos &rarr;
                                </button>
                            </div>

                            <div className="hero-banner-card card-blue">
                                <div className="card-badge"><Truck size={14} /> Logística Direta</div>
                                <h3>Entrega Rápida nas Garagens</h3>
                                <p>Receba seus produtos diretamente na sua base operacional.</p>
                                <button className="btn-banner" onClick={() => setIsCartOpen(true)}>
                                    Comprar Agora &rarr;
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </section>

            {/* Circular Category Bubbles (Drogasil Style) */}
            <section className="circular-categories-section">
                <div className="container">
                    <h3 className="section-title">Navegue por Sintomas e Cuidados</h3>
                    <div className="circle-bubbles-flex">
                        {CIRCULAR_CATEGORIES.map(cat => {
                            const Icon = cat.icon;
                            const isSelected = selectedCircleCat === cat.id;
                            return (
                                <div 
                                    key={cat.id}
                                    className={`bubble-item ${isSelected ? 'selected' : ''}`}
                                    onClick={() => {
                                        setSelectedCircleCat(cat.id);
                                        if (cat.id === 'popular') setFilterFarmaciaPopular(true);
                                        else setFilterFarmaciaPopular(false);
                                    }}
                                >
                                    <div className="bubble-icon-box" style={{ borderColor: cat.color }}>
                                        <Icon size={24} style={{ color: cat.color }} />
                                    </div>
                                    <span className="bubble-name">{cat.name}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Drogasil Product Catalog Grid */}
            <main className="drogasil-catalog-main">
                <div className="container">
                    <div className="catalog-header-bar">
                        <h2>
                            {filterFarmaciaPopular ? 'Produtos Desconto Promocional' : 'Catálogo de Produtos & Saúde'} 
                            <span className="count-tag">({filteredProducts.length} itens encontrados)</span>
                        </h2>
                    </div>

                    {loadingProducts ? (
                        <div className="loading-state-box">
                            <RefreshCw size={36} className="spin" />
                            <p>Carregando produtos do catálogo...</p>
                        </div>
                    ) : (
                        <div className="drogasil-products-grid">
                            {filteredProducts.map(product => {
                                const origPrice = Number(product.price) * 1.25; // Simulated list price
                                return (
                                    <div className="drogasil-product-card" key={product.id}>
                                        {/* Product Badges */}
                                        <div className="card-top-badges">
                                            {isPopularProduct(product) ? (
                                                <span className="badge-popular"><Heart size={10} /> LOJA POPULAR</span>
                                            ) : (
                                                <span className="badge-socio"><Sparkles size={10} /> DESCONTO SÓCIO</span>
                                            )}
                                        </div>

                                        {/* Product Image */}
                                        <div className="product-thumb-container">
                                            <img 
                                                src={getProductImageUrl(product)} 
                                                alt={product.name} 
                                                className="product-img"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = DEFAULT_CATEGORY_IMAGES.produtos;
                                                }}
                                            />
                                        </div>

                                        {/* Details */}
                                        <div className="product-card-body">
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                                                <span className="product-category">{product.category?.name || product.category || 'Geral'}</span>
                                                {(product.section || product.section_code) && (
                                                    <span className="product-category" style={{ background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }}>
                                                        {product.section || `Seção ${product.section_code}`}
                                                    </span>
                                                )}
                                                {product.brand && (
                                                    <span className="product-category" style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }}>
                                                        {product.brand}
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="product-title">{product.name}</h4>
                                            {product.active_principle && (
                                                <span className="active-principle">Princípio Ativo: {product.active_principle}</span>
                                            )}

                                            {/* Price Container */}
                                            <div className="price-container">
                                                <span className="old-price">R$ {origPrice.toFixed(2)}</span>
                                                <div className="current-price-row">
                                                    <span className="currency">R$</span>
                                                    <strong className="main-price">{Number(product.price).toFixed(2)}</strong>
                                                    <span className="pix-tag">via PIX / Sócio</span>
                                                </div>
                                            </div>

                                            {/* Buy Button */}
                                            <button 
                                                className="btn-drogasil-buy"
                                                onClick={() => addToCart(product)}
                                            >
                                                <ShoppingBag size={16} /> COMPRAR
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {filteredProducts.length === 0 && !loadingProducts && (
                        <div className="empty-results-box">
                            <Search size={48} />
                            <h3>Nenhum produto encontrado para sua busca</h3>
                            <p>Tente buscar por termos genéricos como "Dipirona", "Paracetamol" ou limpe o filtro de categorias.</p>
                            <button className="btn btn-primary mt-3" onClick={() => { setSearch(''); setSelectedCategory('all'); setSelectedCircleCat('all'); setFilterFarmaciaPopular(false); }}>
                                Limpar Todos os Filtros
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Cart Drawer Modal */}
            {isCartOpen && (
                <div className="cart-drawer-overlay" onClick={() => setIsCartOpen(false)}>
                    <div className="cart-drawer-content" onClick={e => e.stopPropagation()}>
                        <div className="drawer-header">
                            <h2><ShoppingBag size={22} /> Meu Carrinho de Compras</h2>
                            <X size={22} className="close-drawer" onClick={() => setIsCartOpen(false)} />
                        </div>

                        <div className="drawer-body">
                            {cart.length === 0 ? (
                                <div className="empty-drawer">
                                    <ShoppingBag size={56} />
                                    <h3>Seu carrinho está vazio</h3>
                                    <p>Navegue pelo catálogo e adicione produtos.</p>
                                </div>
                            ) : (
                                <div className="cart-items-wrapper">
                                    {cart.map(item => (
                                        <div className="cart-item-row" key={item.id}>
                                            <img src={getProductImageUrl(item)} alt={item.name} className="cart-thumb" />
                                            <div className="item-details">
                                                <h4>{item.name}</h4>
                                                <span className="unit-price">R$ {Number(item.price).toFixed(2)} cada</span>
                                            </div>
                                            <div className="qty-picker">
                                                <button onClick={() => updateQuantity(item.id, -1)}><Minus size={14} /></button>
                                                <span>{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.id, 1)}><Plus size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {cart.length > 0 && (
                                <div className="checkout-config-box">
                                    {/* Delivery Selector */}
                                    <div className="config-group mb-3">
                                        <label className="group-label"><Truck size={16} /> Forma de Entrega</label>
                                        <div className="radio-group-flex">
                                            <label className={`radio-card ${deliveryType === 'address' ? 'active' : ''}`}>
                                                <input 
                                                    type="radio" 
                                                    name="del_type" 
                                                    checked={deliveryType === 'address'} 
                                                    onChange={() => setDeliveryType('address')} 
                                                />
                                                <MapPin size={16} /> Entrega na Garagem / Endereço
                                            </label>
                                            <label className={`radio-card ${deliveryType === 'pickup' ? 'active' : ''}`}>
                                                <input 
                                                    type="radio" 
                                                    name="del_type" 
                                                    checked={deliveryType === 'pickup'} 
                                                    onChange={() => setDeliveryType('pickup')} 
                                                />
                                                <Building size={16} /> Retirar na Loja
                                            </label>
                                        </div>
                                    </div>

                                    {/* Payment Selector */}
                                    <div className="config-group mb-3">
                                        <label className="group-label"><CreditCard size={16} /> Forma de Pagamento</label>
                                        <div className="radio-group-flex col">
                                            <label className={`radio-card ${paymentMethod === 'pix' ? 'active' : ''}`}>
                                                <input 
                                                    type="radio" 
                                                    name="pay_method" 
                                                    checked={paymentMethod === 'pix'} 
                                                    onChange={() => setPaymentMethod('pix')} 
                                                />
                                                <span>⚡ <strong>PIX Instantâneo</strong> (Livre para Todos - Sem Login)</span>
                                            </label>

                                            <label className={`radio-card ${paymentMethod === 'desconto_folha' ? 'active' : ''}`}>
                                                <input 
                                                    type="radio" 
                                                    name="pay_method" 
                                                    checked={paymentMethod === 'desconto_folha'} 
                                                    onChange={() => setPaymentMethod('desconto_folha')} 
                                                />
                                                <span>💳 <strong>Desconto em Folha</strong> (Exclusivo para Sócios)</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Non-Socio Buyer Details Form */}
                                    {!socio && paymentMethod === 'pix' && deliveryType === 'address' && (
                                        <div className="non-socio-form-card mb-3">
                                            <h4>Dados para Entrega do Pedido</h4>
                                            <div className="form-group mb-2">
                                                <label>Seu Nome Completo</label>
                                                <input type="text" placeholder="Digite seu nome" value={buyerName} onChange={e => setBuyerName(e.target.value)} required />
                                            </div>
                                            <div className="form-group mb-2">
                                                <label>Telefone / WhatsApp</label>
                                                <input type="text" placeholder="(11) 99999-9999" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} required />
                                            </div>
                                            <div className="form-group mb-2">
                                                <label>Garagem de Entrega</label>
                                                <select value={buyerGarage} onChange={e => setBuyerGarage(e.target.value)}>
                                                    {GARAGES.map(g => <option key={g} value={g}>{g}</option>)}
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label>Endereço de Entrega</label>
                                                <input type="text" placeholder="Rua, número, bairro..." value={buyerAddress} onChange={e => setBuyerAddress(e.target.value)} />
                                            </div>
                                        </div>
                                    )}

                                    {/* Logged Socio Info Banner */}
                                    {socio && (
                                        <div className="socio-active-banner">
                                            <span className="socio-title">Sócio Logado: <strong>{socio.name}</strong></span>
                                            <span className="socio-garage">Garagem: {socio.garage}</span>
                                            <span className="socio-limit">Limite Disponível: <strong className="highlight">R$ {(socio.available_limit || 0).toFixed(2)}</strong></span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div className="drawer-footer">
                                <div className="total-summary-row">
                                    <span>Total do Pedido:</span>
                                    <strong className="summary-val">R$ {cartTotal.toFixed(2)}</strong>
                                </div>

                                {paymentMethod === 'pix' ? (
                                    <button 
                                        className="btn-checkout-drogasil" 
                                        onClick={handleCheckoutPix}
                                        disabled={checkoutLoading}
                                    >
                                        {checkoutLoading ? 'Gerando PIX...' : '⚡ FINALIZAR COM PIX'}
                                    </button>
                                ) : (
                                    socio ? (
                                        <button 
                                            className="btn-checkout-drogasil blue" 
                                            onClick={handleCheckoutPayroll}
                                            disabled={checkoutLoading}
                                        >
                                            {checkoutLoading ? 'Autorizando...' : '💳 AUTORIZAR DESCONTO EM FOLHA'}
                                        </button>
                                    ) : (
                                        <button 
                                            className="btn-login-prompt"
                                            onClick={() => { setIsCartOpen(false); setIsAuthModalOpen(true); setAuthTab('check'); }}
                                        >
                                            <Lock size={16} /> Entrar como Sócio para Desconto em Folha
                                        </button>
                                    )
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* PIX / Order Confirmation Result Modal Window */}
            {orderResult && (
                <div className="pix-result-overlay" onClick={() => setOrderResult(null)}>
                    <div className="pix-result-card" onClick={e => e.stopPropagation()}>
                        <button className="modal-close-icon" onClick={() => setOrderResult(null)} title="Fechar Janela">
                            <X size={20} />
                        </button>
                        <CheckCircle size={56} className="success-icon" />
                        <h2>Pedido Confirmado e Enviado!</h2>
                        <p className="order-proto">Protocolo: <strong>{orderResult.order_number}</strong></p>

                        {orderResult.payment_method === 'pix' ? (
                            <div className="pix-qr-container">
                                <h3>Escaneie o QR Code PIX para Pagar</h3>
                                <div className="qr-wrapper">
                                    <QRCodeSVG value={orderResult.pix_code} size={190} />
                                </div>
                                <div className="copia-cola-box mt-3">
                                    <span className="label">Chave PIX Copia e Cola:</span>
                                    <input type="text" readOnly value={orderResult.pix_code} onClick={e => e.target.select()} />
                                    <button className="btn-copy-pix" onClick={() => copyToClipboard(orderResult.pix_code)}>
                                        <Copy size={18} /> {copiedPix ? '✓ Chave Copiada com Sucesso!' : '📋 Copiar Chave PIX'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="payroll-approved-box">
                                <Sparkles size={32} />
                                <h3>Desconto em Folha Autorizado!</h3>
                                <p>Sua compra foi debitada com sucesso do seu limite de crédito.</p>
                                <span className="rem-limit">Saldo Restante: <strong>R$ {orderResult.remaining_limit?.toFixed(2)}</strong></span>
                            </div>
                        )}

                        <div className="expedition-info-box">
                            <p>🚚 <strong>Garagem de Destino:</strong> {orderResult.garage}</p>
                            <p>📦 <strong>Status:</strong> {
                                (orderResult.status === 'separating' || orderResult.status === 'packed' || orderResult.status === 'shipped' || orderResult.status === 'delivered') ? (
                                    <span style={{ color: '#10b981', fontWeight: '800' }}>✅ Pagamento Confirmado! Em Separação e Embalagem</span>
                                ) : (
                                    'Aguardando liberação do financeiro, enviando para separação'
                                )
                            }</p>
                        </div>

                        <button className="btn-close-result" onClick={() => setOrderResult(null)}>
                            ← Voltar para a Loja
                        </button>
                    </div>
                </div>
            )}

            {/* Socio Auth / Registration Wizard Modal */}
            {isAuthModalOpen && (
                <div className="auth-wizard-overlay" onClick={() => setIsAuthModalOpen(false)}>
                    <div className="auth-wizard-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2><UserCheck size={22} /> Portal de Acesso do Sócio</h2>
                            <X size={20} className="close-btn" onClick={() => setIsAuthModalOpen(false)} />
                        </div>

                        <div className="modal-body p-4">
                            {authError && <div className="alert-box error">{authError}</div>}
                            {authSuccess && <div className="alert-box success">{authSuccess}</div>}

                            {authTab === 'check' && (
                                <form onSubmit={handleCheckSocio}>
                                    <p className="form-desc">Informe seu CPF ou N° de Matrícula do Sindicato para prosseguir.</p>
                                    <div className="form-group mb-3">
                                        <label>CPF ou Matrícula do Sócio</label>
                                        <input 
                                            type="text" 
                                            placeholder="Digite seu CPF ou Matrícula" 
                                            value={identifier}
                                            onChange={e => setIdentifier(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <button className="btn-drogasil-submit" type="submit" disabled={authLoading}>
                                        {authLoading ? 'Verificando...' : 'Avançar'}
                                    </button>
                                </form>
                            )}

                            {authTab === 'login' && (
                                <form onSubmit={handleLogin}>
                                    <div className="form-group mb-3">
                                        <label>CPF ou Matrícula</label>
                                        <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} required />
                                    </div>
                                    <div className="form-group mb-3">
                                        <label>Sua Senha de Acesso</label>
                                        <input type="password" placeholder="Sua senha secreta" value={password} onChange={e => setPassword(e.target.value)} required />
                                    </div>
                                    <button className="btn-drogasil-submit" type="submit" disabled={authLoading}>
                                        {authLoading ? 'Entrando...' : 'Entrar no Portal do Sócio'}
                                    </button>
                                    <button type="button" className="btn-switch-tab" onClick={() => setAuthTab('check')}>
                                        Primeiro Acesso ou Ativar Cadastro
                                    </button>
                                </form>
                            )}

                            {authTab === 'profile' && (
                                <form onSubmit={handleRegisterProfile}>
                                    <h3>Primeiro Acesso: Cadastre sua Senha</h3>
                                    <p className="form-desc">Sócio: <strong>{checkData?.name}</strong> ({checkData?.cpf})</p>

                                    <div className="form-grid-2">
                                        <div className="form-group">
                                            <label>Garagem de Pertencimento</label>
                                            <select value={regGarage} onChange={e => setRegGarage(e.target.value)}>
                                                {GARAGES.map(g => <option key={g} value={g}>{g}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Telefone / WhatsApp</label>
                                            <input type="text" placeholder="(11) 99999-9999" value={regPhone} onChange={e => setRegPhone(e.target.value)} required />
                                        </div>
                                    </div>

                                    <div className="form-group mb-2">
                                        <label>E-mail (Receberá o código de ativação)</label>
                                        <input type="email" placeholder="seuemail@exemplo.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} required />
                                    </div>

                                    <div className="form-group mb-2">
                                        <label>Endereço Residencial</label>
                                        <input type="text" placeholder="Rua, número, complemento..." value={regAddress} onChange={e => setRegAddress(e.target.value)} />
                                    </div>

                                    {/* Dependents list */}
                                    <div className="dependents-box">
                                        <label><Users size={14} /> Pessoas Autorizadas a Retirar Produtos</label>
                                        <div className="add-dep-flex mt-1">
                                            <input type="text" placeholder="Nome do dependente" value={newPersonName} onChange={e => setNewPersonName(e.target.value)} />
                                            <input type="text" placeholder="Parentesco" value={newPersonRelation} onChange={e => setNewPersonRelation(e.target.value)} />
                                            <button type="button" onClick={handleAddPerson}>+ Add</button>
                                        </div>
                                        <div className="dep-tags-flex mt-2">
                                            {authorizedPersons.map((p, idx) => (
                                                <span key={idx} className="dep-tag">
                                                    {p.name} ({p.relation}) <X size={12} onClick={() => handleRemovePerson(idx)} />
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="form-grid-2 mb-3">
                                        <div className="form-group">
                                            <label>Crie uma Senha</label>
                                            <input type="password" placeholder="Mínimo 6 caracteres" value={regPassword} onChange={e => setRegPassword(e.target.value)} required />
                                        </div>
                                        <div className="form-group">
                                            <label>Confirme a Senha</label>
                                            <input type="password" placeholder="Repita a senha" value={regConfirmPassword} onChange={e => setRegConfirmPassword(e.target.value)} required />
                                        </div>
                                    </div>

                                    <button className="btn-drogasil-submit" type="submit" disabled={authLoading}>
                                        {authLoading ? 'Salvando...' : 'Salvar e Enviar Código de Ativação'}
                                    </button>
                                </form>
                            )}

                            {authTab === 'activate' && (
                                <form onSubmit={handleVerifyActivation}>
                                    <div className="text-center mb-3">
                                        <Mail size={40} className="mail-icon" />
                                        <h3>Confirmação de E-mail</h3>
                                        <p className="form-desc">Enviamos um código de 6 dígitos para o e-mail: <strong>{regEmail}</strong></p>
                                    </div>

                                    {codePreview && (
                                        <div className="code-preview-box">
                                            <span>Código de Ativação de Teste:</span>
                                            <strong>{codePreview}</strong>
                                        </div>
                                    )}

                                    <div className="form-group mb-3 text-center">
                                        <label>Digite o Código de 6 Dígitos</label>
                                        <input 
                                            type="text" 
                                            maxLength="6"
                                            placeholder="123456" 
                                            className="pin-input"
                                            value={activationCode}
                                            onChange={e => setActivationCode(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <button className="btn-drogasil-submit" type="submit" disabled={authLoading}>
                                        {authLoading ? 'Ativando...' : 'Ativar Conta e Entrar'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Drogasil Footer */}
            <footer className="drogasil-footer">
                <div className="container footer-grid">
                    <div className="footer-col">
                        <h4>VarejoPro Drogaria</h4>
                        <p>A loja oficial dos sócios e colaboradores do transporte. Produtos com descontos exclusivos e entrega direta nas garagens.</p>
                    </div>

                    <div className="footer-col">
                        <h4>Atendimento ao Sócio</h4>
                        <ul>
                            <li>📞 Telefone: (11) 3300-0000</li>
                            <li>💬 WhatsApp: (11) 99999-8888</li>
                            <li>✉️ E-mail: atendimento@varejo.com.br</li>
                        </ul>
                    </div>

                    <div className="footer-col">
                        <h4>Formas de Pagamento</h4>
                        <div className="pay-badges flex-gap">
                            <span className="pay-badge">⚡ PIX</span>
                            <span className="pay-badge">💳 Folha de Pagamento</span>
                            <span className="pay-badge">💳 Cartão de Crédito</span>
                        </div>
                    </div>

                    <div className="footer-col">
                        <h4>Informações Técnicas</h4>
                        <p className="tech-info">
                            Razão Social: VarejoPro Produtos Ltda<br />
                            CNPJ: 00.000.000/0001-00<br />
                            Farmacêutico Responsável: Dra. Maria Silva - CRF/SP 123456
                        </p>
                    </div>
                </div>

                <div className="footer-bottom">
                    <div className="container bottom-flex">
                        <span>© 2026 VarejoPro Drogaria. Todos os direitos reservados.</span>
                        <span>Parceria Oficial Sindicato & Transporte</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default StorefrontPage;
