import React from 'react';
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
    const [currentPage, setCurrentPage] = React.useState('dashboard');

    const isStorefrontPath = window.location.pathname.includes('/loja') || window.location.pathname.includes('/store');

    React.useEffect(() => {
        if (signed && user) {
            if (user.role !== 'admin' && user.role !== 'superadmin') {
                setCurrentPage('pos');
            } else {
                setCurrentPage('dashboard');
            }
        }
    }, [signed, user]);

    if (isStorefrontPath) {
        return <StorefrontPage />;
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
        <DashboardLayout onNavigate={setCurrentPage} currentPage={currentPage}>
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
