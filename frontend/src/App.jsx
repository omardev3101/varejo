import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';

import ProductsPage from './pages/ProductsPage';
import CategoriesPage from './pages/CategoriesPage';
import POSPage from './pages/POSPage';
import CashierPage from './pages/CashierPage';
import CustomersPage from './pages/CustomersPage';

import InventoryImportPage from './pages/InventoryImportPage';
import SuppliersPage from './pages/SuppliersPage';
import StockControlPage from './pages/StockControlPage';
import PurchaseOrderPage from './pages/PurchaseOrderPage';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import FinancialPage from './pages/FinancialPage';
import DashboardLayout from './components/DashboardLayout';
import UsersPage from './pages/UsersPage';
import RolesPage from './pages/RolesPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import ExpeditionPage from './pages/ExpeditionPage';
import FiscalPage from './pages/FiscalPage';
import TerminalsPage from './pages/TerminalsPage';
import TenantsPage from './pages/TenantsPage';
import ReturnsPage from './pages/ReturnsPage';
import StorefrontPage from './pages/StorefrontPage';
import StoreConfigPage from './pages/StoreConfigPage';
import PixConfigPage from './pages/PixConfigPage';
import TransfersPage from './pages/TransfersPage';
import BackupPage from './pages/BackupPage';

const AppContent = () => {
    const { signed, loading, user } = useAuth();
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [globalConfig, setGlobalConfig] = useState(null);

    const isStorefrontPath = window.location.pathname.includes('/loja') || window.location.pathname.includes('/store');

    // Fetch and apply whitelabel settings globally
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                // Determine if we are in admin or public to fetch config (public doesn't need token for /api/storefront-config GET)
                const res = await fetch(window.location.origin + '/varejo/api/storefront-config');
                if (res.ok) {
                    const data = await res.json();
                    setGlobalConfig(data);

                    // Inject CSS Variables
                    const root = document.documentElement;
                    if (data.primary_color) {
                        root.style.setProperty('--primary', data.primary_color);
                        root.style.setProperty('--emerald-500', data.primary_color); // Many tailwind classes use emerald
                        root.style.setProperty('--emerald-600', data.primary_color);
                    }
                    if (data.secondary_color) {
                        root.style.setProperty('--sidebar-bg', data.secondary_color);
                        root.style.setProperty('--slate-800', data.secondary_color);
                        root.style.setProperty('--slate-900', data.secondary_color);
                    }

                    // Update Favicon
                    if (data.logo_url) {
                        let link = document.querySelector("link[rel~='icon']");
                        if (!link) {
                            link = document.createElement('link');
                            link.rel = 'icon';
                            document.getElementsByTagName('head')[0].appendChild(link);
                        }
                        link.href = data.logo_url;
                    }

                    // Update Title
                    if (data.system_name && !isStorefrontPath) {
                        document.title = data.system_name;
                    } else if (data.store_name && isStorefrontPath) {
                        document.title = data.store_name;
                    }
                }
            } catch (err) {
                console.error("Failed to load whitelabel config", err);
            }
        };
        fetchConfig();
    }, [isStorefrontPath]);

    useEffect(() => {
        if (signed && user) {
            if (user.role !== 'admin' && user.role !== 'superadmin') {
                setCurrentPage('pos');
            } else {
                setCurrentPage('dashboard');
            }
        }
    }, [signed, user]);

    if (isStorefrontPath) {
        return <StorefrontPage globalConfig={globalConfig} />;
    }

    if (loading) {
        return (
            <div style={{ 
                height: '100vh', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: '#0f172a',
                color: 'white'
            }}>
                Carregando...
            </div>
        );
    }

    if (!signed) {
        return <LoginPage />;
    }

    const renderPage = () => {
        switch (currentPage) {
            case 'storefront':
                return <StorefrontPage />;
            case 'products':
                return <ProductsPage />;
            case 'categories':
                return <CategoriesPage />;
            case 'pos':
                return <POSPage onNavigate={setCurrentPage} />;
            case 'customers':
                return <CustomersPage />;

            case 'inventory-import':
                return <InventoryImportPage />;
            case 'suppliers':
                return <SuppliersPage />;
            case 'stock-control':
                return <StockControlPage />;
            case 'purchase-order':
                return <PurchaseOrderPage />;
            case 'returns':
                return <ReturnsPage />;
            case 'transfers':
                return <TransfersPage />;
            case 'cashier':
                return <CashierPage />;
            case 'financial':
                return <FinancialPage />;
            case 'fiscal':
            case 'fiscal_export':
                return <FiscalPage />;
            case 'users':
                return <UsersPage />;
            case 'roles':
                return <RolesPage />;
            case 'dashboard':
                return <DashboardPage />;
            case 'admin-dashboard':
                return <AdminDashboardPage />;
            case 'settings/terminals':
                return <TerminalsPage />;
            case 'settings/tenants':
                return <TenantsPage onNavigate={setCurrentPage} />;
            case 'store_config':
                return <StoreConfigPage />;
            case 'pix_config':
                return <PixConfigPage />;
            case 'backup_config':
                return <BackupPage />;
            case 'expedition':
                return <ExpeditionPage />;
            default:
                return <DashboardPage />;
        }
    };

    return (
        <DashboardLayout onNavigate={setCurrentPage} currentPage={currentPage} globalConfig={globalConfig}>
            {renderPage()}
        </DashboardLayout>
    );
};

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;
