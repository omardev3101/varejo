import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Pill, Lock, Mail, Loader2, ArrowRight } from 'lucide-react';
import logo from '../assets/logo.jpg';
import { saveUserLocal, verifyUserLocal } from '../services/offlineDb';
import './LoginPage.css';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/login', { email, password });
            const { user, token } = response.data;
            await saveUserLocal(user, password);
            login(user, token);
        } catch (err) {
            // Se falhar a rede, tenta login offline
            if (!err.response || err.code === 'ERR_NETWORK' || err.message.includes('Network Error')) {
                const offlineUser = await verifyUserLocal(email, password);
                if (offlineUser) {
                    login(offlineUser, 'offline-token-bypass');
                    return;
                }
            }
            setError(err.response?.data?.error || 'Erro ao realizar login. Verifique suas credenciais.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-blob"></div>
            <div className="login-blob blob-2"></div>
            
            <div className="login-card glass">
                <div className="login-header">
                    <img src={logo} alt="VarejoPro Logo" className="login-logo-img" />
                    <p>Gestão comercial inteligente e modular</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && <div className="error-message">{error}</div>}
                    
                    <div className="input-group">
                        <label>E-mail</label>
                        <div className="input-wrapper">
                            <Mail size={18} className="input-icon" />
                            <input 
                                type="email" 
                                placeholder="exemplo@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Senha</label>
                        <div className="input-wrapper">
                            <Lock size={18} className="input-icon" />
                            <input 
                                type="password" 
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" /> : (
                            <>
                                Acessar Sistema
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <p>Esqueceu sua senha? <span>Recuperar acesso</span></p>
                    <p style={{ marginTop: '12px', fontSize: '11px', color: '#94a3b8' }}>
                        Criado e Desenvolvido por <strong style={{ color: '#cbd5e1' }}>PES TECNOLOGIA</strong>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
