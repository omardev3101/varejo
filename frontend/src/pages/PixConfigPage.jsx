import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Save, Key, FileText, CheckCircle, AlertCircle, Copy, Loader, ExternalLink, Zap, Lock, Upload } from 'lucide-react';
import api from '../services/api';
import './PixConfigPage.css';

const PixConfigPage = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [copiedWebhook, setCopiedWebhook] = useState(false);
    const [testResult, setTestResult] = useState(null);

    const certFileInputRef = useRef(null);
    const keyFileInputRef = useRef(null);

    const [form, setForm] = useState({
        provider: 'cora',
        environment: 'sandbox',
        client_id: '',
        pix_key: '',
        cert_pem: '',
        key_pem: '',
        webhook_url: 'https://pessistemas.vps-kinghost.net/varejo/api/pix/webhook/cora',
        active: false
    });

    const handleCertFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            setForm(prev => ({ ...prev, cert_pem: event.target.result }));
            showToast('📄 Arquivo de certificado .pem carregado com sucesso!');
        };
        reader.readAsText(file);
    };

    const handleKeyFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            setForm(prev => ({ ...prev, key_pem: event.target.result }));
            showToast('🔐 Arquivo de chave privada .key carregado com sucesso!');
        };
        reader.readAsText(file);
    };

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const response = await api.get('/pix/config');
            if (response.data) {
                setForm({
                    provider: response.data.provider || 'cora',
                    environment: response.data.environment || 'sandbox',
                    client_id: response.data.client_id || '',
                    pix_key: response.data.pix_key || '',
                    cert_pem: response.data.cert_pem || '',
                    key_pem: response.data.key_pem || '',
                    webhook_url: response.data.webhook_url || 'https://pessistemas.vps-kinghost.net/varejo/api/pix/webhook/cora',
                    active: !!response.data.active
                });
            }
        } catch (error) {
            console.error('Error fetching PIX config:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 3500);
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            await api.put('/pix/config', form);
            showToast('✅ Credenciais e Certificados mTLS do Banco Cora salvos com sucesso!');
        } catch (error) {
            console.error('Error saving PIX config:', error);
            alert('Erro ao salvar configurações PIX: ' + (error.response?.data?.error || error.message));
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await api.post('/pix/test-connection');
            setTestResult({ success: true, message: res.data.message });
        } catch (error) {
            setTestResult({ success: false, message: error.response?.data?.error || error.message });
        } finally {
            setTesting(false);
        }
    };

    const copyWebhookUrl = () => {
        navigator.clipboard.writeText(form.webhook_url);
        setCopiedWebhook(true);
        setTimeout(() => setCopiedWebhook(false), 2500);
    };

    return (
        <div className="pix-config-page">
            <header className="page-header glass">
                <div className="header-title-flex">
                    <div className="icon-wrapper">
                        <Zap size={26} className="text-emerald-500" />
                    </div>
                    <div>
                        <h2>Integração API PIX Banco Cora (Padrão Bacen mTLS)</h2>
                        <p>Configure a emissão dinâmica de cobranças PIX e a liquidação automática por Webhook</p>
                    </div>
                </div>

                <div className="header-actions">
                    <button className="btn btn-emerald" onClick={handleSave} disabled={saving}>
                        <Save size={18} /> {saving ? 'Salvando...' : 'Salvar Credenciais'}
                    </button>
                </div>
            </header>

            {toastMessage && (
                <div className="toast-notification">
                    <span>{toastMessage}</span>
                </div>
            )}

            <div className="pix-config-grid">
                {/* Main Credentials Card */}
                <form className="config-card glass" onSubmit={handleSave}>
                    <h3>🔑 Credenciais & Parâmetros de Autenticação</h3>
                    
                    <div className="form-group mb-3">
                        <label>Status da Integração PIX Cora</label>
                        <div className="toggle-switch-box">
                            <input 
                                type="checkbox" 
                                id="active_toggle"
                                checked={form.active}
                                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                            />
                            <label htmlFor="active_toggle" className="switch-label">
                                {form.active ? '🟢 Integração Ativa (Usar API Cora mTLS no Checkout)' : '⚪ Inativa (Usar Emissor de QR Code Nativo)'}
                            </label>
                        </div>
                    </div>

                    <div className="form-grid-2">
                        <div className="form-group">
                            <label>Ambiente de Operação</label>
                            <select 
                                value={form.environment} 
                                onChange={(e) => setForm({ ...form, environment: e.target.value })}
                            >
                                <option value="sandbox">🧪 Sandbox (Ambiente de Testes)</option>
                                <option value="production">🚀 Produção (Banco Cora Oficial)</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Chave PIX Cadastrada no Cora</label>
                            <input 
                                type="text" 
                                placeholder="CNPJ, E-mail ou Chave EVP (ex: 12.345.678/0001-90)"
                                value={form.pix_key}
                                onChange={(e) => setForm({ ...form, pix_key: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Client ID da Aplicação Cora</label>
                        <input 
                            type="text" 
                            placeholder="Insira o Client ID gerado no painel da Cora..."
                            value={form.client_id}
                            onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <div className="field-label-flex">
                            <label><FileText size={15} /> Certificado Digital Público (.pem / .crt)</label>
                            <input 
                                type="file" 
                                ref={certFileInputRef} 
                                accept=".pem,.crt,.cer,.txt" 
                                onChange={handleCertFileUpload} 
                                style={{ display: 'none' }} 
                            />
                            <button 
                                type="button" 
                                className="btn-upload-file" 
                                onClick={() => certFileInputRef.current && certFileInputRef.current.click()}
                            >
                                <Upload size={14} /> Selecionar Arquivo .pem
                            </button>
                        </div>
                        <textarea 
                            rows={4}
                            placeholder="Faça upload acima ou cole o conteúdo do arquivo -----BEGIN CERTIFICATE----- ..."
                            value={form.cert_pem}
                            onChange={(e) => setForm({ ...form, cert_pem: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <div className="field-label-flex">
                            <label><Lock size={15} /> Chave Privada (.key / .pem)</label>
                            <input 
                                type="file" 
                                ref={keyFileInputRef} 
                                accept=".key,.pem,.txt" 
                                onChange={handleKeyFileUpload} 
                                style={{ display: 'none' }} 
                            />
                            <button 
                                type="button" 
                                className="btn-upload-file" 
                                onClick={() => keyFileInputRef.current && keyFileInputRef.current.click()}
                            >
                                <Upload size={14} /> Selecionar Arquivo .key
                            </button>
                        </div>
                        <textarea 
                            rows={4}
                            placeholder="Faça upload acima ou cole o conteúdo do arquivo -----BEGIN RSA PRIVATE KEY----- ..."
                            value={form.key_pem}
                            onChange={(e) => setForm({ ...form, key_pem: e.target.value })}
                            required
                        />
                    </div>

                    <div className="card-actions">
                        <button type="button" className="btn btn-secondary" onClick={handleTestConnection} disabled={testing}>
                            {testing ? <Loader size={16} className="spin" /> : <ShieldCheck size={16} />}
                            {testing ? 'Testando Conexão...' : 'Testar Conexão mTLS'}
                        </button>
                        <button type="submit" className="btn btn-emerald" disabled={saving}>
                            <Save size={16} /> Salvar Alterações
                        </button>
                    </div>

                    {testResult && (
                        <div className={`test-result-box ${testResult.success ? 'success' : 'error'}`}>
                            {testResult.success ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                            <span>{testResult.message}</span>
                        </div>
                    )}
                </form>

                {/* Side Instructions & Webhook Card */}
                <div className="info-side-column">
                    <div className="config-card glass">
                        <h3>🔔 Webhook de Liquidação Automática</h3>
                        <p className="card-desc">Cole esta URL de Webhook no painel do Banco Cora para receber notificações instantâneas de pagamento:</p>

                        <div className="webhook-box">
                            <input type="text" readOnly value={form.webhook_url} />
                            <button className="btn-copy" onClick={copyWebhookUrl}>
                                <Copy size={16} /> {copiedWebhook ? 'Copiado!' : 'Copiar URL'}
                            </button>
                        </div>

                        <div className="cora-steps-box">
                            <h4>📌 Passo a Passo de Configuração no Cora:</h4>
                            <ol>
                                <li>Acesse o <strong>Painel do Banco Cora</strong> &rarr; <em>Configurações / API</em>.</li>
                                <li>Crie uma nova aplicação e copie o <strong>Client ID</strong>.</li>
                                <li>Gere os arquivos do certificado <strong>mTLS (.pem e .key)</strong> e cole nos campos ao lado.</li>
                                <li>Cadastre a <strong>URL do Webhook</strong> acima para eventos de PIX recebidos.</li>
                                <li>Clique em <strong>Testar Conexão mTLS</strong> para validar o ambiente!</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PixConfigPage;
