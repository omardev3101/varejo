import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { ShoppingCart, Search, Plus, Minus, Trash2, CreditCard, Banknote, QrCode, X, User, FileText, ClipboardList, Receipt, CheckCircle, LayoutDashboard, Wifi, WifiOff, RefreshCw, LogOut, Clock } from 'lucide-react';
import FiscalReceipt from '../components/FiscalReceipt';
import ManagerAuthModal from '../components/ManagerAuthModal';
import { useAuth } from '../contexts/AuthContext';
import {
    searchProductsLocal,
    searchCustomersLocal,
    saveCashierSession,
    getCashierSessionLocal,
    queueSaleLocal,
    getQueuedSalesLocal,
    removeQueuedSaleLocal,
    saveProducts,
    saveCustomers,
    updateProductStockLocal
} from '../services/offlineDb';
import './POSPage.css';

const POSPage = ({ onNavigate }) => {
    const { logout } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [error, setError] = useState(null);
    
    // Offline / Sync State
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [queuedSalesCount, setQueuedSalesCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    // PBM States
    const [pbmAuth, setPbmAuth] = useState(null);
    const [isPbmModalOpen, setIsPbmModalOpen] = useState(false);
    const [pbmType, setPbmType] = useState('promocional');
    const [patientCpf, setPatientCpf] = useState('');
    const [doctorCrm, setDoctorCrm] = useState('');
    const [doctorUf, setDoctorUf] = useState('SP');
    const [prescriptionDate, setPrescriptionDate] = useState(new Date().toISOString().split('T')[0]);
    const [patientCns, setPatientCns] = useState('');
    const [forceRealApi, setForceRealApi] = useState(true);
    const [isPbmAuthorizing, setIsPbmAuthorizing] = useState(false);
    const [pbmConfigs, setPbmConfigs] = useState([]);
    const [pbmSearchResults, setPbmSearchResults] = useState(null);
    const [isSearchingPbm, setIsSearchingPbm] = useState(false);

    // Digital Clock State
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const [cart, setCart] = useState([]);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [discount, setDiscount] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastSale, setLastSale] = useState(null);
    const [isFiscalOpen, setIsFiscalOpen] = useState(false);
    const [fiscalData, setFiscalData] = useState(null);

    // Manager Auth State
    const [authModalConfig, setAuthModalConfig] = useState({ isOpen: false, type: null, meta: null });
    const [pendingDiscount, setPendingDiscount] = useState('');
    const [pendingVoidId, setPendingVoidId] = useState('');
    
    // Cashier Session
    const [session, setSession] = useState(null);
    const [loadingSession, setLoadingSession] = useState(true);
    
    // Customer selection
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerResults, setCustomerResults] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [cpfNota, setCpfNota] = useState('');

    const searchRef = useRef(null);

    // Network status listener
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOffline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Get number of offline queued sales
    const updateQueuedCount = async () => {
        const queue = await getQueuedSalesLocal();
        setQueuedSalesCount(queue.length);
    };

    useEffect(() => {
        updateQueuedCount();
    }, []);

    // Active session check
    useEffect(() => {
        const checkSession = async () => {
            try {
                const response = await api.get('/cashier/active');
                setSession(response.data);
                // Cache active session
                await saveCashierSession(response.data);
            } catch (err) {
                console.error('Sem sessão de caixa ativa online:', err);
                const cachedSession = await getCashierSessionLocal();
                if (cachedSession) {
                    setSession(cachedSession);
                }
            } finally {
                setLoadingSession(false);
            }
        };
        const fetchPbmConfigs = async () => {
            try {
                const response = await api.get('/pbm/configs');
                setPbmConfigs(response.data);
            } catch (err) {
                console.error('Erro ao buscar configurações de PBM:', err);
            }
        };
        checkSession();
        fetchPbmConfigs();
        searchRef.current?.focus();
    }, []);

    const searchTimeout = useRef(null);

    const handleSearch = (val) => {
        setSearchTerm(val);
        
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        if (!val) {
            setSearchResults([]);
            return;
        }

        searchTimeout.current = setTimeout(async () => {
            try {
                let products = [];
                if (isOnline) {
                    const response = await api.get(`/products?search=${val}`);
                    products = response.data.filter(p => p.stock_qty > 0);
                } else {
                    products = await searchProductsLocal(val);
                    products = products.filter(p => p.stock_qty > 0);
                }
                
                // If it's a barcode (numbers only and long enough) and we have exactly 1 match
                const isBarcode = /^\d+$/.test(val) && val.length >= 8;
                if (isBarcode && products.length === 1 && products[0].ean === val) {
                    addToCart(products[0]);
                    setSearchTerm('');
                    setSearchResults([]);
                } else {
                    setSearchResults(products);
                }
            } catch (error) {
                console.error('Search error, using offline database:', error);
                const products = await searchProductsLocal(val);
                setSearchResults(products.filter(p => p.stock_qty > 0));
            }
        }, 300); // 300ms debounce
    };

    const handleCustomerSearch = async (val) => {
        setCustomerSearch(val);
        if (val.length < 2) {
            setCustomerResults([]);
            return;
        }
        try {
            if (isOnline) {
                const response = await api.get(`/customers?search=${encodeURIComponent(val)}`);
                const termLower = val.toLowerCase();
                const filtered = (response.data || []).filter(c => 
                    (c.name && c.name.toLowerCase().includes(termLower)) || 
                    (c.cpf && c.cpf.includes(val)) || 
                    (c.external_id && String(c.external_id).includes(val))
                );
                setCustomerResults(filtered);
            } else {
                const results = await searchCustomersLocal(val);
                setCustomerResults(results);
            }
        } catch (error) {
            console.error('Customer search error, using offline database:', error);
            const results = await searchCustomersLocal(val);
            setCustomerResults(results);
        }
    };

    const selectCustomer = (customer) => {
        setSelectedCustomer(customer);
        if (customer.cpf) setPatientCpf(customer.cpf);
        if (customer.cns) setPatientCns(customer.cns);
        if (customer.cpf) setCpfNota(customer.cpf);
        setCustomerSearch('');
        setCustomerResults([]);
    };

    const addToCart = (product) => {
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            if (existing.quantity >= product.stock_qty) {
                alert('Estoque insuficiente!');
                return;
            }
            setCart(cart.map(item => 
                item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
            ));
        } else {
            setCart([...cart, { ...product, quantity: 1 }]);
        }
        setSearchTerm('');
        setSearchResults([]);
        searchRef.current?.focus();
    };

    const updateQty = (id, delta) => {
        setCart(cart.map(item => {
            if (item.id === id) {
                const newQty = item.quantity + delta;
                if (newQty > item.stock_qty) {
                    alert('Limite de estoque atingido!');
                    return item;
                }
                return newQty > 0 ? { ...item, quantity: newQty } : item;
            }
            return item;
        }));
    };

    const removeFromCart = (id) => {
        setCart(cart.filter(item => item.id !== id));
    };

    const isFarmaciaPopularActive = true;
    const isVidalinkActive = pbmConfigs.some(c => c.pbm_type === 'vidalink' && c.active);

    const subtotal = cart.reduce((acc, item) => acc + (parseFloat(item.unit_price || item.price) * item.quantity), 0);
    const pbmDiscount = pbmAuth ? pbmAuth.discountAmount : 0;
    const total = subtotal - discount - pbmDiscount;

    const handlePbmAuthorize = async () => {
        if (!patientCpf) return alert('Informe o CPF do paciente');
        if (cart.length === 0) return alert('Carrinho vazio');

        setIsPbmAuthorizing(true);
        try {
            const response = await api.post('/pbm/authorize', {
                pbm_type: pbmType,
                patient_cpf: patientCpf,
                doctor_crm: doctorCrm,
                doctor_uf: doctorUf,
                prescription_date: prescriptionDate,
                patient_cns: patientCns,
                force_real: forceRealApi,
                items: cart,
                total_amount: subtotal
            });

            if (response.data.authorized) {
                setPbmAuth(response.data);
                setIsPbmModalOpen(false);
                alert(`Autorização ${pbmType.toUpperCase()} realizada com sucesso!\nComprovante: ${response.data.authorizationCode || response.data.authorization_code}`);
            } else {
                alert(response.data.error || 'Erro na autorização');
            }
        } catch (error) {
            alert('Erro ao comunicar com PBM: ' + (error.response?.data?.error || error.message));
        } finally {
            setIsPbmAuthorizing(false);
        }
    };

    const handleSearchBestPbm = async () => {
        if (!patientCpf) return alert('Informe o CPF do paciente para buscar os descontos.');
        if (cart.length === 0) return alert('Carrinho vazio.');

        setIsSearchingPbm(true);
        try {
            const response = await api.post('/pbm/search-best', {
                patient_cpf: patientCpf,
                doctor_crm: doctorCrm,
                doctor_uf: doctorUf,
                prescription_date: prescriptionDate,
                patient_cns: patientCns,
                items: cart,
                total_amount: subtotal
            });

            setPbmSearchResults(response.data);
        } catch (error) {
            alert('Erro ao buscar descontos PBM: ' + (error.response?.data?.error || error.message));
        } finally {
            setIsSearchingPbm(false);
        }
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        
        if (paymentMethod === 'payroll' && !selectedCustomer) {
            alert('Selecione um cliente para venda em folha!');
            return;
        }

        setIsProcessing(true);
        const saleData = {
            items: cart.map(item => ({
                product_id: item.id,
                quantity: item.quantity,
                unit_price: item.unit_price || item.price,
                authorized_by: item.authorized_by || null
            })),
            payment_method: paymentMethod,
            discount_amount: discount + pbmDiscount,
            authorized_by: discount > 0 ? authModalConfig.meta?.authorized_by : null,
            customer_id: selectedCustomer?.id,
            cpf_nota: cpfNota || selectedCustomer?.cpf || null,
            pbm_transaction_id: pbmAuth?.transactionId,
            client_name: selectedCustomer?.name || 'Cliente Geral',
            created_at: new Date().toISOString()
        };

        if (isOnline) {
            try {
                const response = await api.post('/sales', saleData);
                setLastSale(response.data);
                
                openCashDrawer();
                alert('Venda finalizada com sucesso!');
                setCart([]);
                setDiscount(0);
                setPbmAuth(null);
                setSelectedCustomer(null);
                setCpfNota('');
                searchRef.current?.focus();
            } catch (error) {
                alert('Erro ao finalizar venda: ' + (error.response?.data?.error || error.message));
            } finally {
                setIsProcessing(false);
            }
        } else {
            // Fluxo offline
            try {
                await queueSaleLocal(saleData);
                for (const item of cart) {
                    await updateProductStockLocal(item.id, item.quantity);
                }

                const localSale = {
                    id: `OFFLINE-${Date.now()}`,
                    ...saleData,
                    final_amount: total,
                    isOffline: true
                };
                setLastSale(localSale);

                openCashDrawer();
                alert('Venda offline registrada com sucesso! Ela será enviada ao portal assim que a conexão retornar.');
                setCart([]);
                setDiscount(0);
                setPbmAuth(null);
                setSelectedCustomer(null);
                setCpfNota('');
                await updateQueuedCount();
                searchRef.current?.focus();
            } catch (error) {
                alert('Erro ao registrar venda offline: ' + error.message);
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const handleSync = async () => {
        if (!isOnline) {
            alert('Você precisa estar online para sincronizar.');
            return;
        }
        setIsSyncing(true);
        try {
            const queuedSales = await getQueuedSalesLocal();
            console.log('Sincronizando vendas offline:', queuedSales.length);

            for (const sale of queuedSales) {
                try {
                    await api.post('/sales', {
                        items: sale.items,
                        payment_method: sale.payment_method,
                        discount_amount: sale.discount_amount,
                        authorized_by: sale.authorized_by,
                        customer_id: sale.customer_id,
                        pbm_transaction_id: sale.pbm_transaction_id
                    });
                    await removeQueuedSaleLocal(sale.localId);
                } catch (saleErr) {
                    console.error('Erro ao sincronizar venda offline:', saleErr);
                }
            }

            // Atualiza produtos locais
            const productsRes = await api.get('/products');
            await saveProducts(productsRes.data);

            // Atualiza clientes locais
            const customersRes = await api.get('/customers');
            await saveCustomers(customersRes.data);

            // Atualiza sessão ativa local
            try {
                const sessionRes = await api.get('/cashier/active');
                setSession(sessionRes.data);
                await saveCashierSession(sessionRes.data);
            } catch (sessErr) {
                console.warn('Sem sessão de caixa ativa online na sincronização:', sessErr);
            }

            await updateQueuedCount();
            alert('Sincronização concluída com sucesso! Produtos, clientes e vendas atualizados.');
        } catch (err) {
            console.error('Erro na sincronização:', err);
            alert('Erro durante a sincronização: ' + err.message);
        } finally {
            setIsSyncing(false);
        }
    };

    // Auto-sync ao restabelecer a rede
    useEffect(() => {
        if (isOnline) {
            const autoSync = async () => {
                const queuedSales = await getQueuedSalesLocal();
                if (queuedSales.length > 0) {
                    console.log('Internet restaurada! Iniciando auto-sincronização de vendas...');
                    for (const sale of queuedSales) {
                        try {
                            await api.post('/sales', {
                                items: sale.items,
                                payment_method: sale.payment_method,
                                discount_amount: sale.discount_amount,
                                authorized_by: sale.authorized_by,
                                customer_id: sale.customer_id,
                                pbm_transaction_id: sale.pbm_transaction_id
                            });
                            await removeQueuedSaleLocal(sale.localId);
                        } catch (err) {
                            console.error('Erro no auto-sync da venda:', err);
                        }
                    }
                    await updateQueuedCount();
                }
            };
            autoSync();
        }
    }, [isOnline]);

    const handleEmitFiscal = async () => {
        if (!lastSale) return;
        setIsProcessing(true);
        try {
            const response = await api.post(`/nfe/${lastSale.id}/emit`);
            const fiscalResponse = await api.get(`/nfe/data/${lastSale.id}`);
            setFiscalData(fiscalResponse.data);
            setIsFiscalOpen(true);
            setLastSale(null); // Clear last sale after emission
        } catch (error) {
            alert('Erro ao emitir cupom: ' + (error.response?.data?.error || error.message));
        } finally {
            setIsProcessing(false);
        }
    };

    const openCashDrawer = () => {
        // Method 1: Silent print with pulse command (requires Generic/Text driver)
        const printWindow = window.open('', 'PRINT', 'height=100,width=100');
        printWindow.document.write('\x1b\x70\x00\x19\xfa');
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
        
        console.log('Comando de abertura de gaveta enviado.');
    };

    const handleAuthSuccess = async (manager) => {
        const { type, meta } = authModalConfig;
        
        if (type === 'discount') {
            setDiscount(parseFloat(pendingDiscount));
            setAuthModalConfig({ isOpen: false, type: null, meta: { authorized_by: manager.id } });
        } else if (type === 'price_override') {
            const { itemId, newPrice } = meta;
            setCart(cart.map(item => 
                item.id === itemId ? { ...item, unit_price: newPrice, authorized_by: manager.id } : item
            ));
            setAuthModalConfig({ isOpen: false, type: null, meta: null });
        } else if (type === 'void') {
            try {
                const targetSaleId = manager.sale_id || pendingVoidId;
                const response = await api.post(`/sales/${targetSaleId}/void`, { 
                    authorized_by: manager.authorized_by,
                    cancellation_reason: manager.cancellation_reason || 'Cancelamento no PDV'
                });
                alert(`Venda #${targetSaleId} cancelada e estornada com sucesso!\n${response.data.sefaz?.message || 'Evento de cancelamento SEFAZ registrado.'}`);
                setAuthModalConfig({ isOpen: false, type: null, meta: null });
                setPendingVoidId('');
            } catch (err) {
                alert('Erro ao estornar venda: ' + (err.response?.data?.error || err.message));
            }
        }
    };

    if (loadingSession) {
        return <div className="pos-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Carregando sessão...</div>;
    }

    if (!session) {
        return (
            <div className="pos-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
                <div className="glass" style={{ padding: '40px', textAlign: 'center', maxWidth: '500px', borderRadius: '12px' }}>
                    <LayoutDashboard size={64} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                    <h2 style={{ color: '#1e293b', marginBottom: '8px' }}>Caixa Fechado ou Sem PDV</h2>
                    <p style={{ color: '#64748b', marginBottom: '24px' }}>
                        Você precisa fazer a abertura do caixa e selecionar em qual PDV irá trabalhar antes de realizar vendas no balcão.
                    </p>
                    <button className="btn-primary" onClick={() => onNavigate && onNavigate('cashier')} style={{ width: '100%', padding: '12px', fontSize: '16px' }}>
                        Ir para Abertura de Caixa
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="pos-container">
            <div className="pos-main">
                <header className="pos-header glass">
                    <div className="pos-search">
                        <Search size={20} />
                        <input 
                            ref={searchRef}
                            type="text" 
                            placeholder="Escaneie o EAN ou digite o nome do produto..." 
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && searchResults.length > 0) {
                                    addToCart(searchResults[0]);
                                }
                            }}
                        />
                        {searchResults.length > 0 && (
                            <div className="search-dropdown glass">
                                {searchResults.map(p => (
                                    <div key={p.id} className="search-item" onClick={() => addToCart(p)}>
                                        <div className="p-info">
                                            <strong>{p.name}</strong>
                                            <span>Estoque: {p.stock_qty} | R$ {parseFloat(p.price).toFixed(2)}</span>
                                        </div>
                                        <Plus size={18} />
                                    </div>
                                ))}
                            </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
                            {isOnline ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#10b981', fontWeight: '500', background: 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', borderRadius: '20px' }}>
                                    <Wifi size={16} /> Online
                                </span>
                            ) : (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#ef4444', fontWeight: '500', background: 'rgba(239, 68, 68, 0.1)', padding: '6px 12px', borderRadius: '20px' }}>
                                    <WifiOff size={16} /> Offline
                                </span>
                            )}
                            <button 
                                className="btn-sync" 
                                style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '6px', 
                                    padding: '6px 12px', 
                                    fontSize: '14px', 
                                    backgroundColor: queuedSalesCount > 0 ? '#d97706' : '#2563eb', 
                                    color: 'white', 
                                    border: 'none', 
                                    borderRadius: '20px', 
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }} 
                                onClick={handleSync}
                                disabled={isSyncing}
                            >
                                <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                                {isSyncing ? 'Sincronizando...' : `Sincronizar ${queuedSalesCount > 0 ? `(${queuedSalesCount})` : ''}`}
                            </button>
                            {session?.terminal && (
                                <span style={{ fontSize: '14px', color: '#10b981', fontWeight: '500', background: 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', borderRadius: '20px' }}>
                                    {session.terminal.name}
                                </span>
                            )}
                            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '14px' }} onClick={() => setAuthModalConfig({ isOpen: true, type: 'void' })}>
                                Estornar Venda
                            </button>
                            <button className="btn-drawer" title="Abrir Gaveta" onClick={openCashDrawer}>
                                <LayoutDashboard size={20} />
                            </button>
                            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '14px', backgroundColor: '#ef4444', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }} onClick={logout}>
                                <LogOut size={16} /> Sair
                            </button>
                        </div>
                    </div>
                </header>

                <div className="cart-container glass">
                    <table className="cart-table">
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>Preço Un.</th>
                                <th>Qtd.</th>
                                <th>Subtotal</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {cart.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="empty-cart">
                                        <ShoppingCart size={48} />
                                        <p>Carrinho vazio. Comece bipando um produto!</p>
                                    </td>
                                </tr>
                            ) : cart.map(item => (
                                <tr key={item.id}>
                                    <td>
                                        <div className="cart-item-info">
                                            <strong>{item.name}</strong>
                                            <span>{item.ean}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            R$ 
                                            <input 
                                                type="number" 
                                                style={{ width: '70px', padding: '4px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                                                defaultValue={item.unit_price || item.price} 
                                                key={item.unit_price || item.price}
                                                onBlur={(e) => {
                                                    const newPrice = parseFloat(e.target.value);
                                                    if (newPrice !== parseFloat(item.price)) {
                                                        setAuthModalConfig({ isOpen: true, type: 'price_override', meta: { itemId: item.id, newPrice } });
                                                    }
                                                }}
                                            />
                                        </div>
                                    </td>
                                    <td>
                                        <div className="qty-controls">
                                            <button onClick={() => updateQty(item.id, -1)}><Minus size={14} /></button>
                                            <span>{item.quantity}</span>
                                            <button onClick={() => updateQty(item.id, 1)}><Plus size={14} /></button>
                                        </div>
                                    </td>
                                    <td className="subtotal">R$ {(parseFloat(item.unit_price || item.price) * item.quantity).toFixed(2)}</td>
                                    <td>
                                        <button className="remove-btn" onClick={() => removeFromCart(item.id)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <aside className="pos-sidebar glass">
                <div className="customer-selector">
                    {selectedCustomer ? (
                        <div className="selected-customer glass">
                            <div className="cust-meta">
                                <User size={20} />
                                <div>
                                    <strong>{selectedCustomer.name}</strong>
                                    <small>{selectedCustomer.cpf}</small>
                                </div>
                            </div>
                            <div className="cust-limit">
                                <span>Limite: R$ {selectedCustomer.credit_limit}</span>
                                <span className={selectedCustomer.current_debt > 0 ? 'debt' : ''}>
                                    Dívida: R$ {selectedCustomer.current_debt}
                                </span>
                            </div>
                            <button className="clear-cust" onClick={() => setSelectedCustomer(null)}>
                                <X size={14} />
                            </button>
                        </div>
                    ) : (
                        <div className="customer-search">
                            <Search size={16} />
                            <input 
                                type="text" 
                                placeholder="Identificar Cliente (CPF/Nome)..." 
                                value={customerSearch}
                                onChange={(e) => handleCustomerSearch(e.target.value)}
                            />
                            {customerResults.length > 0 && (
                                <div className="customer-dropdown glass">
                                    {customerResults.map(c => (
                                        <div key={c.id} className="cust-result-item" onClick={() => selectCustomer(c)}>
                                            <span>{c.name}</span>
                                            <small>{c.cpf}</small>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* CPF/CNPJ na Nota Paulista */}
                <div className="cpf-nota-panel glass" style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FileText size={15} /> CPF/CNPJ na Nota (Nota Paulista)
                        </span>
                        {cpfNota && (
                            <button 
                                type="button" 
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}
                                onClick={() => setCpfNota('')}
                            >
                                <X size={12} /> Limpar
                            </button>
                        )}
                    </div>
                    <input 
                        type="text" 
                        placeholder="Digite o CPF/CNPJ do Consumidor (Opcional)" 
                        value={cpfNota} 
                        onChange={(e) => setCpfNota(e.target.value)}
                        style={{ 
                            width: '100%', 
                            padding: '8px 10px', 
                            marginTop: '6px', 
                            borderRadius: '6px', 
                            border: '1px solid rgba(255, 255, 255, 0.2)', 
                            background: '#0f172a', 
                            color: '#ffffff', 
                            fontSize: '13px',
                            fontWeight: '500',
                            outline: 'none'
                        }}
                    />
                </div>

                <div className="pbm-panel glass" style={{ marginTop: '16px', padding: '12px' }}>
                    <h3 style={{ fontSize: '14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ClipboardList size={16} /> Convênios e PBM
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: isFarmaciaPopularActive && isVidalinkActive ? '1fr 1fr' : '1fr', gap: '8px' }}>
                        {isFarmaciaPopularActive && (
                            <button className={`btn-small ${pbmAuth && pbmType === 'promocional' ? 'active' : ''}`} onClick={() => { setPbmType('promocional'); setIsPbmModalOpen(true); }}>
                                F. Popular
                            </button>
                        )}
                        {isVidalinkActive && (
                            <button className={`btn-small ${pbmAuth && pbmType === 'vidalink' ? 'active' : ''}`} onClick={() => { setPbmType('vidalink'); setIsPbmModalOpen(true); }}>
                                Vidalink
                            </button>
                        )}
                        {!isFarmaciaPopularActive && !isVidalinkActive && (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', gridColumn: 'span 2', textAlign: 'center', padding: '4px 0' }}>
                                Nenhum PBM ativo
                            </span>
                        )}
                    </div>
                    {pbmAuth && (
                        <div className="pbm-status glass" style={{ marginTop: '8px', padding: '8px', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid var(--success)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '12px' }}>
                                <strong>AUT: {pbmAuth.authorizationCode}</strong>
                                <div style={{ color: 'var(--success)' }}>Desconto FP: R$ {pbmAuth.discountAmount.toFixed(2)}</div>
                            </div>
                            <button className="btn-icon" onClick={() => setPbmAuth(null)}><X size={14} /></button>
                        </div>
                    )}

                    {pbmAuth && pbmType === 'promocional' && (
                        <div className="gov-fp-badge-container" style={{
                            marginTop: '12px',
                            padding: '10px 14px',
                            background: 'linear-gradient(135deg, #007a33 0%, #002776 100%)',
                            color: '#ffffff',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0, 122, 51, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <div style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '50%',
                                background: '#ffdf00',
                                color: '#002776',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '900',
                                fontSize: '16px'
                            }}>
                                FP
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '0.05em', color: '#ffdf00' }}>
                                    GOVERNO FEDERAL • MINISTÉRIO DA SAÚDE
                                </div>
                                <div style={{ fontSize: '13px', fontWeight: '700' }}>
                                    LOJA POPULAR DO BRASIL
                                </div>
                                <div style={{ fontSize: '10px', opacity: 0.95 }}>
                                    SAÚDE NÃO TEM PREÇO • AUT: {pbmAuth.authorizationCode}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="summary-section">
                    <h2>Resumo da Venda</h2>
                    <div className="summary-row"><span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
                    {pbmAuth && (
                        <div className="summary-row text-success">
                            <span>Subsídio {pbmType === 'promocional' ? 'FP' : pbmType.toUpperCase()}</span>
                            <span>- R$ {pbmAuth.discountAmount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="summary-row">
                        <span>Desconto Manual {discount > 0 && <span style={{fontSize: '12px', color: 'var(--success)'}}>(Aplicado)</span>}</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <input 
                                type="number" 
                                className="discount-input" 
                                value={pendingDiscount || discount || ''} 
                                onChange={(e) => setPendingDiscount(e.target.value)}
                                placeholder="Valor"
                            />
                            <button className="btn-small" onClick={() => setAuthModalConfig({ isOpen: true, type: 'discount' })}>Aplicar</button>
                        </div>
                    </div>
                    <div className="total-box">
                        <span>TOTAL A PAGAR</span>
                        <strong>R$ {total.toFixed(2)}</strong>
                    </div>
                </div>

                <div className="payment-section">
                    <h3>Forma de Pagamento</h3>
                    <div className="payment-grid">
                        <button className={`pay-btn ${paymentMethod === 'cash' ? 'active' : ''}`} onClick={() => setPaymentMethod('cash')}><Banknote size={20} /> Dinheiro</button>
                        <button className={`pay-btn ${paymentMethod === 'payroll' ? 'active' : ''}`} onClick={() => setPaymentMethod('payroll')}><FileText size={20} /> Folha</button>
                        <button className={`pay-btn ${paymentMethod === 'pix' ? 'active' : ''}`} onClick={() => setPaymentMethod('pix')}><QrCode size={20} /> PIX</button>
                        <button className={`pay-btn ${paymentMethod === 'credit' ? 'active' : ''}`} onClick={() => setPaymentMethod('credit')}><CreditCard size={20} /> Crédito</button>
                    </div>
                </div>

                {/* Digital Clock Display (HH:mm:ss) */}
                <div className="pos-clock-display glass">
                    <div className="pos-clock-icon-wrapper">
                        <Clock size={20} className="clock-pulse" />
                    </div>
                    <div className="pos-clock-time-group">
                        <span className="pos-clock-time-digits">
                            {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span className="pos-clock-date-sub">
                            {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                        </span>
                    </div>
                </div>

                <button className="checkout-btn" disabled={cart.length === 0 || isProcessing} onClick={handleCheckout}>
                    {isProcessing ? 'PROCESSANDO...' : 'FINALIZAR VENDA (F10)'}
                </button>
            </aside>

            {isPbmModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content glass" style={{ maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <h2>Autorização PBM / Convênio</h2>
                            <button className="btn-icon" onClick={() => { setIsPbmModalOpen(false); setPbmSearchResults(null); }}><X size={20}/></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>CPF do Paciente / Beneficiário</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input 
                                        type="text" 
                                        value={patientCpf} 
                                        onChange={(e) => setPatientCpf(e.target.value)} 
                                        placeholder="000.000.000-00"
                                        style={{ flex: 1 }}
                                    />
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary"
                                        onClick={handleSearchBestPbm}
                                        disabled={isSearchingPbm}
                                        style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '0 14px', whiteSpace: 'nowrap' }}
                                    >
                                        {isSearchingPbm ? 'Buscando...' : '🔍 Buscar Melhor PBM'}
                                    </button>
                                </div>
                            </div>

                            {/* Multi-PBM Comparison Results */}
                            {pbmSearchResults && (
                                <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                                    <h3 style={{ fontSize: '14px', color: '#60a5fa', marginBottom: '10px' }}>
                                        📊 Comparativo de Descontos Encontrados para o CPF:
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {pbmSearchResults.options?.map((opt) => (
                                            <div 
                                                key={opt.pbmType}
                                                style={{
                                                    padding: '12px',
                                                    borderRadius: '8px',
                                                    border: opt.isBestOption ? '2px solid #22c55e' : '1px solid #334155',
                                                    background: opt.isBestOption ? 'rgba(34, 197, 94, 0.1)' : '#1e293b',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '4px'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <strong style={{ fontSize: '14px', color: opt.isBestOption ? '#4ade80' : '#f8fafc' }}>
                                                        {opt.providerName}
                                                    </strong>
                                                    {opt.isBestOption && (
                                                        <span style={{ fontSize: '11px', background: '#22c55e', color: '#000', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px' }}>
                                                            🏆 MELHOR DESCONTO
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '4px' }}>
                                                    <span>Desconto: <strong style={{ color: '#4ade80' }}>R$ {opt.discountAmount.toFixed(2)}</strong></span>
                                                    <span>Pagar: <strong>R$ {opt.patientCopay.toFixed(2)}</strong></span>
                                                </div>
                                                {opt.discountAmount > 0 && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-small"
                                                        style={{ marginTop: '8px', backgroundColor: '#3b82f6', color: '#fff' }}
                                                        onClick={() => {
                                                            setPbmAuth(opt.raw);
                                                            setIsPbmModalOpen(false);
                                                            setPbmSearchResults(null);
                                                            alert(`Aplicado desconto de R$ ${opt.discountAmount.toFixed(2)} via ${opt.providerName}`);
                                                        }}
                                                    >
                                                        Aplicar Este Desconto
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="form-group" style={{ marginTop: '16px' }}>
                                <label>Ou Escolha o Provedor PBM Manualmente</label>
                                <select 
                                    value={pbmType} 
                                    onChange={(e) => setPbmType(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#1e293b', color: '#fff' }}
                                >
                                    <option value="promocional">Desconto Promocional (Governo Federal)</option>
                                    <option value="portal_drogaria">Portal da Drogaria (Laboratórios EMS, Medley, Eurofarma, etc.)</option>
                                    <option value="vidalink">Vidalink PBM</option>
                                    <option value="epharma">e-Pharma</option>
                                </select>
                            </div>

                            {pbmType === 'promocional' && (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', marginTop: '12px' }}>
                                        <div className="form-group">
                                            <label>CRM do Médico</label>
                                            <input type="text" value={doctorCrm} onChange={(e) => setDoctorCrm(e.target.value)} placeholder="123456"/>
                                        </div>
                                        <div className="form-group">
                                            <label>UF CRM</label>
                                            <input type="text" value={doctorUf} onChange={(e) => setDoctorUf(e.target.value.toUpperCase())} placeholder="SP" maxLength={2}/>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                                        <div className="form-group">
                                            <label>Data da Receita</label>
                                            <input type="date" value={prescriptionDate} onChange={(e) => setPrescriptionDate(e.target.value)}/>
                                        </div>
                                        <div className="form-group">
                                            <label>Cartão SUS (CNS) (Opcional)</label>
                                            <input type="text" value={patientCns} onChange={(e) => setPatientCns(e.target.value)} placeholder="700000000000000"/>
                                        </div>
                                    </div>
                                    <div className="form-group" style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input type="checkbox" id="chkForceReal" checked={forceRealApi} onChange={(e) => setForceRealApi(e.target.checked)}/>
                                        <label htmlFor="chkForceReal" style={{ fontSize: '13px', cursor: 'pointer', margin: 0 }}>
                                            Usar Plataforma Real do Governo (MS REST API + Certificado A1)
                                        </label>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="modal-footer" style={{ marginTop: '20px' }}>
                            <button className="btn btn-secondary" onClick={() => { setIsPbmModalOpen(false); setPbmSearchResults(null); }}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handlePbmAuthorize} disabled={isPbmAuthorizing}>
                                {isPbmAuthorizing ? 'Autorizando...' : 'Solicitar Autorização Manual'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {lastSale && (
                <div className="modal-overlay">
                    <div className="modal-content glass" style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <CheckCircle size={48} color="var(--success)" style={{ margin: '0 auto 16px auto' }} />
                        <h2>Venda {lastSale.id} Finalizada!</h2>
                        {lastSale.isOffline ? (
                            <p>Esta venda foi salva offline. A emissão do Cupom Fiscal (NFC-e) será efetuada automaticamente após a sincronização com a internet.</p>
                        ) : (
                            <p>Deseja emitir o Cupom Fiscal (NFC-e) agora?</p>
                        )}
                        <div className="modal-footer" style={{ justifyContent: 'center', gap: '12px', marginTop: '24px' }}>
                            <button className="btn btn-secondary" onClick={() => setLastSale(null)}>Fechar</button>
                            {!lastSale.isOffline && (
                                <button className="btn btn-primary" onClick={handleEmitFiscal}>
                                    <Receipt size={18} /> Emitir Cupom Fiscal
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isFiscalOpen && (
                <FiscalReceipt 
                    data={fiscalData} 
                    onClose={() => setIsFiscalOpen(false)} 
                />
            )}

            <ManagerAuthModal 
                isOpen={authModalConfig.isOpen} 
                onClose={() => setAuthModalConfig({ isOpen: false, type: null, meta: null })}
                onConfirm={handleAuthSuccess}
                title={authModalConfig.type === 'void' ? 'Autorizar Estorno de Venda & NF-e' : 'Autorizar Alteração Gerencial'}
                actionDescription={
                    authModalConfig.type === 'void' 
                        ? 'Confira os dados, produtos e valores da venda abaixo antes de informar a senha do gerente para estornar.' 
                        : 'Esta ação exige a senha de um gerente ou administrador.'
                }
                showSaleInput={authModalConfig.type === 'void'}
                saleIdProp={pendingVoidId}
                onSaleIdChange={(val) => setPendingVoidId(val)}
            />
        </div>
    );
};

export default POSPage;
