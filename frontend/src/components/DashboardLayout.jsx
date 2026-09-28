import React from 'react';
import Sidebar from './Sidebar';
import './DashboardLayout.css';

const DashboardLayout = ({ children, onNavigate, currentPage }) => {
    return (
        <div className="dashboard-layout">
            <Sidebar onNavigate={onNavigate} currentPage={currentPage} />
            <main className="dashboard-content">
                <header className="dashboard-header">
                    <div className="search-bar">
                        <input type="text" placeholder="Pesquisar..." />
                    </div>
                    <div className="header-actions">
                        {/* Notifications, profile, etc. */}
                    </div>
                </header>
                <div className="page-container">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
