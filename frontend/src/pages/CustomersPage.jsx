import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Users, Plus, Search, Edit, Trash2, X, Save, User, MapPin, Briefcase, CreditCard, Calendar, Upload } from 'lucide-react';
import './CustomersPage.css';

const CustomersPage = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importLoading, setImportLoading] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    
    const initialForm = {
        name: '',
        nickname: '',
        sex: 'M',
        birth_date: '',
        nationality: 'Brasileira',
        birth_city: '',
        mother_name: '',
        cpf: '',
        rg: '',
        rg_issuer: '',
        marital_status: '',
        zip_code: '',
        address: '',
        number: '',
        neighborhood: '',
        city: '',
        state: '',
        phone: '',
        email: '',
        profession: '',
        role: '',
        garage: '',
        admission_date: '',
        external_id: '',
        external_type: '',
        credit_limit: 0,
        status: 'ativo'
    };

    const [formData, setFormData] = useState(initialForm);

    const fetchCustomers = async () => {
        try {
            const response = await api.get('/customers');
            setCustomers(response.data);
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const handleOpenModal = (customer = null) => {
        if (customer) {
            setEditingCustomer(customer);
            setFormData({ ...initialForm, ...customer });
        } else {
            setEditingCustomer(null);
            setFormData(initialForm);
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingCustomer) {
                await api.put(`/customers/${editingCustomer.id}`, formData);
            } else {
                await api.post('/customers', formData);
            }
            alert('Cliente salvo com sucesso!');
            setIsModalOpen(false);
            fetchCustomers();
        } catch (error) {
            alert('Erro ao salvar cliente: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Excluir este cliente?')) return;
        try {
            await api.delete(`/customers/${id}`);
            fetchCustomers();
        } catch (error) {
            alert('Erro ao excluir cliente.');
        }
    };

    const handleImport = async (e) => {
        e.preventDefault();
        if (!importFile) return alert('Selecione um arquivo.');
        
        setImportLoading(true);
        const formData = new FormData();
        formData.append('file', importFile);

        try {
            const response = await api.post('/customers/import-spreadsheet', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            let msg = `Importação concluída!\nCadastrados: ${response.data.importedCount}\nAtualizados: ${response.data.updatedCount}`;
            if (response.data.errors && response.data.errors.length > 0) {
                msg += `\n\nErros Encontrados:\n` + response.data.errors.join('\n');
            }
            alert(msg);
            setIsImportModalOpen(false);
            setImportFile(null);
            fetchCustomers();
        } catch (error) {
            alert('Erro ao importar: ' + (error.response?.data?.error || error.message));
        } finally {
            setImportLoading(false);
        }
    };

    const filteredCustomers = customers.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.cpf?.includes(searchTerm)
    );

    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportStartDate, setReportStartDate] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    });
    const [reportEndDate, setReportEndDate] = useState(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    });
    const [selectedReportCustomer, setSelectedReportCustomer] = useState('all');
    const [reportViewMode, setReportViewMode] = useState('analitico'); // 'analitico' | 'resumido'
    const [reportData, setReportData] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);

    const fetchPurchaseReport = async () => {
        setReportLoading(true);
        try {
            const response = await api.get('/customers/purchase-report', {
                params: {
                    start_date: reportStartDate,
                    end_date: reportEndDate,
                    customer_id: selectedReportCustomer
                }
            });
            setReportData(response.data);
        } catch (error) {
            console.error('Erro ao gerar relatório de compras:', error);
            alert('Erro ao gerar relatório de compras.');
        } finally {
            setReportLoading(false);
        }
    };

    const handleOpenReportModal = () => {
        setIsReportModalOpen(true);
        fetchPurchaseReport();
    };

    const handlePrintReport = () => {
        const originalTitle = document.title;
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const modeLabel = reportViewMode === 'resumido' ? 'Resumido' : 'Analitico';

        document.title = `Relatorio_Compras_${modeLabel}_${day}-${month}-${year}_${hours}-${minutes}`;
        window.print();
        setTimeout(() => {
            document.title = originalTitle;
        }, 1000);
    };

    return (
        <div className="page-container glass">
            <header className="page-header">
                <div className="header-title">
                    <Users size={28} className="title-icon" />
                    <div>
                        <h1>Gestão de Clientes</h1>
                        <p className="subtitle">Cadastros, histórico de compras por período e relatórios ({customers.length} cadastrados)</p>
                    </div>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={handleOpenReportModal}>
                        <Calendar size={18} /> Relatório de Compras
                    </button>
                    <button className="btn btn-secondary" onClick={() => setIsImportModalOpen(true)}>
                        <Upload size={18} /> Importar Planilha
                    </button>
                    <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                        <Plus size={18} /> Novo Cliente
                    </button>
                </div>
            </header>

            <div className="table-filters glass">
                <div className="search-input">
                    <Search size={18} />
                    <input 
                        type="text" 
                        placeholder="Nome ou CPF..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="table-container glass">
                <table className="custom-table">
                    <thead>
                        <tr>
                            <th>Cliente</th>
                            <th>CPF</th>
                            <th>Cidade / UF</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" className="text-center">Carregando...</td></tr>
                        ) : filteredCustomers.map(customer => (
                            <tr key={customer.id}>
                                <td>
                                    <div className="customer-info-cell">
                                        <div className="customer-thumb placeholder">{customer.name[0]}</div>
                                        <div className="customer-name">
                                            <strong>{customer.name}</strong>
                                            <span>{customer.nickname || '---'}</span>
                                        </div>
                                    </div>
                                </td>
                                <td>{customer.cpf || '---'}</td>
                                <td>{customer.city} / {customer.state}</td>
                                <td><span className={`badge ${customer.status === 'ativo' ? 'normal' : 'controlled'}`}>{customer.status}</span></td>
                                <td className="actions">
                                    <button className="action-btn" onClick={() => handleOpenModal(customer)}><Edit size={16} /></button>
                                    <button className="action-btn delete" onClick={() => handleDelete(customer.id)}><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content glass customer-modal-content">
                        <div className="modal-header">
                            <h2>{editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}</h2>
                            <button className="btn-icon" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
                        </div>
                        
                        <form onSubmit={handleSave} className="customer-form-advanced">
                            <div className="form-section">
                                <h3 className="section-title"><User size={18} /> Dados Pessoais</h3>
                                <div className="form-grid">
                                    <div className="form-group full">
                                        <label>Nome Completo</label>
                                        <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label>Apelido</label>
                                        <input type="text" value={formData.nickname} onChange={e => setFormData({...formData, nickname: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label>Sexo</label>
                                        <select value={formData.sex} onChange={e => setFormData({...formData, sex: e.target.value})}>
                                            <option value="M">Masculino</option>
                                            <option value="F">Feminino</option>
                                            <option value="O">Outro</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Data Nascimento</label>
                                        <input type="date" value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label>Nacionalidade</label>
                                        <input type="text" value={formData.nationality} onChange={e => setFormData({...formData, nationality: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label>Cidade Natal</label>
                                        <input type="text" value={formData.birth_city} onChange={e => setFormData({...formData, birth_city: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label>Nome da Mãe</label>
                                        <input type="text" value={formData.mother_name} onChange={e => setFormData({...formData, mother_name: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <h3 className="section-title"><Calendar size={18} /> Documentação e Contato</h3>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>CPF</label>
                                        <input type="text" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label>RG</label>
                                        <input type="text" value={formData.rg} onChange={e => setFormData({...formData, rg: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label>Emissor RG</label>
                                        <input type="text" value={formData.rg_issuer} onChange={e => setFormData({...formData, rg_issuer: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label>Estado Civil</label>
                                        <input type="text" value={formData.marital_status} onChange={e => setFormData({...formData, marital_status: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label>Telefone</label>
                                        <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label>E-mail</label>
                                        <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <h3 className="section-title"><MapPin size={18} /> Endereço</h3>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>CEP</label>
                                        <input type="text" value={formData.zip_code} onChange={e => setFormData({...formData, zip_code: e.target.value})} />
                                    </div>
                                    <div className="form-group full">
                                        <label>Rua / Logradouro</label>
                                        <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label>Número</label>
                                        <input type="text" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label>Bairro</label>
                                        <input type="text" value={formData.neighborhood} onChange={e => setFormData({...formData, neighborhood: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label>Cidade</label>
                                        <input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label>Estado (UF)</label>
                                        <input type="text" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <h3 className="section-title"><Briefcase size={18} /> Profissional e Empresa</h3>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Empresa / Garagem</label>
                                        <input type="text" value={formData.garage} onChange={e => setFormData({...formData, garage: e.target.value})} placeholder="Ex: MOVEBUSS, SANTA BRÍGIDA" />
                                    </div>
                                    <div className="form-group">
                                        <label>Função / Cargo</label>
                                        <input type="text" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} placeholder="Ex: MOTORISTA, COBRADOR" />
                                    </div>
                                    <div className="form-group">
                                        <label>Profissão</label>
                                        <input type="text" value={formData.profession} onChange={e => setFormData({...formData, profession: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label>Data Admissão</label>
                                        <input type="date" value={formData.admission_date} onChange={e => setFormData({...formData, admission_date: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label>ID / Matrícula Externa</label>
                                        <input type="text" value={formData.external_id} onChange={e => setFormData({...formData, external_id: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label>Tipo Conveniado</label>
                                        <input type="text" value={formData.external_type} onChange={e => setFormData({...formData, external_type: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <h3 className="section-title"><CreditCard size={18} /> Financeiro e Status</h3>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Limite de Crédito</label>
                                        <input type="number" value={formData.credit_limit} onChange={e => setFormData({...formData, credit_limit: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label>Status do Cadastro</label>
                                        <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                            <option value="ativo">Ativo</option>
                                            <option value="inativo">Inativo</option>
                                            <option value="bloqueado">Bloqueado</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer sticky-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">
                                    <Save size={18} /> Finalizar Cadastro
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {isImportModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content glass" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h2>Importar Clientes</h2>
                            <button className="btn-icon" onClick={() => setIsImportModalOpen(false)}><X size={24} /></button>
                        </div>
                        
                        <form onSubmit={handleImport} className="customer-form-advanced">
                            <div className="form-section">
                                <p>Selecione a planilha (.xlsx, .xls ou .csv) contendo as colunas: <strong>N.REG, NOME DO FUNCIONARIO, FUNÇÃO, C.P.F., ADMISSÃO, CONDICAO</strong>.</p>
                                <div className="form-group full" style={{ marginTop: '20px' }}>
                                    <input 
                                        type="file" 
                                        accept=".xlsx, .xls, .csv" 
                                        onChange={(e) => setImportFile(e.target.files[0])} 
                                        required
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setIsImportModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={importLoading}>
                                    <Upload size={18} /> {importLoading ? 'Importando...' : 'Iniciar Importação'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isReportModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content glass" style={{ maxWidth: '950px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header no-print">
                            <h2>Relatório de Compras de Clientes por Período</h2>
                            <button className="btn-icon" onClick={() => setIsReportModalOpen(false)}><X size={24} /></button>
                        </div>

                        <div className="modal-body">
                            {/* Filter Bar */}
                            <div className="form-grid no-print" style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '10px', marginBottom: '20px', gridTemplateColumns: 'repeat(5, 1fr)' }}>
                                <div className="form-group">
                                    <label>Tipo de Relatório</label>
                                    <select 
                                        value={reportViewMode} 
                                        onChange={e => setReportViewMode(e.target.value)}
                                        style={{ fontWeight: 'bold' }}
                                    >
                                        <option value="analitico">📋 Analítico (Completo)</option>
                                        <option value="resumido">📄 Resumido (Matrícula, Nome e Valor)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Data Inicial</label>
                                    <input 
                                        type="date" 
                                        value={reportStartDate} 
                                        onChange={e => setReportStartDate(e.target.value)} 
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Data Final</label>
                                    <input 
                                        type="date" 
                                        value={reportEndDate} 
                                        onChange={e => setReportEndDate(e.target.value)} 
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Filtrar por Cliente</label>
                                    <select 
                                        value={selectedReportCustomer} 
                                        onChange={e => setSelectedReportCustomer(e.target.value)}
                                    >
                                        <option value="all">Todos os Clientes</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.cpf || 'Sem CPF'})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                                    <button className="btn btn-primary" style={{ width: '100%' }} onClick={fetchPurchaseReport} disabled={reportLoading}>
                                        <Search size={18} /> {reportLoading ? 'Filtrando...' : 'Gerar Relatório'}
                                    </button>
                                </div>
                            </div>

                            {reportData && (
                                <div className="printable-report-area">
                                    {reportViewMode === 'resumido' ? (
                                        /* RESUMIDO / SINTÉTICO VIEW */
                                        <div>
                                            <div style={{ textAlign: 'center', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #cbd5e1' }}>
                                                <h2 style={{ margin: 0, color: '#0f172a' }}>RELATÓRIO RESUMIDO DE COMPRAS POR CLIENTE</h2>
                                                <p style={{ margin: '4px 0', fontSize: '13px', color: '#475569' }}>
                                                    Período: {new Date(`${reportStartDate}T00:00:00`).toLocaleDateString('pt-BR')} até {new Date(`${reportEndDate}T00:00:00`).toLocaleDateString('pt-BR')}
                                                </p>
                                            </div>

                                            <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                                                <thead>
                                                    <tr style={{ background: '#f1f5f9', color: '#0f172a' }}>
                                                        <th style={{ textAlign: 'left', padding: '10px', border: '1px solid #cbd5e1' }}>Matrícula / Doc</th>
                                                        <th style={{ textAlign: 'left', padding: '10px', border: '1px solid #cbd5e1' }}>Nome do Cliente</th>
                                                        <th style={{ textAlign: 'right', padding: '10px', border: '1px solid #cbd5e1' }}>Valor Total Comprado (R$)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {reportData.customers_summary.map((c) => (
                                                        <tr key={c.customer_id}>
                                                            <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0' }}>
                                                                <strong>{c.registration || c.cpf || 'N/A'}</strong>
                                                            </td>
                                                            <td style={{ padding: '8px 10px', border: '1px solid #e2e8f0' }}>{c.name}</td>
                                                            <td style={{ textAlign: 'right', padding: '8px 10px', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>
                                                                R$ {Number(c.total_spent || 0).toFixed(2)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {reportData.customers_summary.length === 0 && (
                                                        <tr>
                                                            <td colSpan="3" style={{ textAlign: 'center', padding: '16px' }}>Nenhuma compra registrada no período.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                                <tfoot>
                                                    <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                                                        <td colSpan="2" style={{ textAlign: 'right', padding: '12px 10px', border: '1px solid #cbd5e1' }}>TOTAL GERAL DO PERÍODO:</td>
                                                        <td style={{ textAlign: 'right', padding: '12px 10px', border: '1px solid #cbd5e1', color: '#10b981', fontSize: '1.1rem' }}>
                                                            R$ {Number(reportData.summary.total_amount || 0).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    ) : (
                                        /* ANALÍTICO VIEW */
                                        <div>
                                            {/* KPI Summary Cards */}
                                            <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                                                <div className="kpi-card glass p-3 text-center">
                                                    <span style={{ fontSize: '12px', color: '#64748b' }}>Total Vendido / Comprado</span>
                                                    <h3 style={{ fontSize: '20px', margin: '4px 0', color: '#10b981' }}>R$ {reportData.summary.total_amount.toFixed(2)}</h3>
                                                </div>
                                                <div className="kpi-card glass p-3 text-center">
                                                    <span style={{ fontSize: '12px', color: '#64748b' }}>Qtd. de Vendas</span>
                                                    <h3 style={{ fontSize: '20px', margin: '4px 0' }}>{reportData.summary.total_sales_count}</h3>
                                                </div>
                                                <div className="kpi-card glass p-3 text-center">
                                                    <span style={{ fontSize: '12px', color: '#64748b' }}>Ticket Médio</span>
                                                    <h3 style={{ fontSize: '20px', margin: '4px 0', color: '#3b82f6' }}>R$ {reportData.summary.average_ticket.toFixed(2)}</h3>
                                                </div>
                                                <div className="kpi-card glass p-3 text-center">
                                                    <span style={{ fontSize: '12px', color: '#64748b' }}>Descontos Concedidos</span>
                                                    <h3 style={{ fontSize: '20px', margin: '4px 0', color: '#f59e0b' }}>R$ {reportData.summary.total_discount.toFixed(2)}</h3>
                                                </div>
                                            </div>

                                            {/* Ranking summary table */}
                                            <h4 style={{ marginBottom: '10px' }}>Resumo Agrupado por Cliente</h4>
                                            <table className="custom-table mb-4">
                                                <thead>
                                                    <tr>
                                                        <th># Pos.</th>
                                                        <th>Matrícula / Doc</th>
                                                        <th>Cliente</th>
                                                        <th>CPF</th>
                                                        <th>Qtd. Compras</th>
                                                        <th>Desconto Acum.</th>
                                                        <th>Total Comprado (R$)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {reportData.customers_summary.map((c, idx) => (
                                                        <tr key={c.customer_id}>
                                                            <td>#{idx + 1}</td>
                                                            <td><strong>{c.registration || 'N/A'}</strong></td>
                                                            <td><strong>{c.name}</strong></td>
                                                            <td>{c.cpf}</td>
                                                            <td>{c.purchases_count}</td>
                                                            <td className="text-warning">R$ {c.total_discount.toFixed(2)}</td>
                                                            <td className="fw-bold text-success">R$ {c.total_spent.toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>

                                            {/* Detailed Sales List */}
                                            <h4 style={{ marginBottom: '10px' }}>Histórico Detalhado das Vendas</h4>
                                            <table className="custom-table">
                                                <thead>
                                                    <tr>
                                                        <th># Venda</th>
                                                        <th>Data / Hora</th>
                                                        <th>Cliente</th>
                                                        <th>Forma Pagto</th>
                                                        <th>Desconto</th>
                                                        <th>Valor Final</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {reportData.sales.map((sale) => (
                                                        <tr key={sale.id}>
                                                            <td>#{sale.id}</td>
                                                            <td>{new Date(sale.createdAt).toLocaleString('pt-BR')}</td>
                                                            <td>{sale.customer ? sale.customer.name : 'Cliente Balcão'}</td>
                                                            <td><span className="badge badge-info">{sale.payment_method?.toUpperCase()}</span></td>
                                                            <td>R$ {Number(sale.discount_amount || 0).toFixed(2)}</td>
                                                            <td className="fw-bold text-success">R$ {Number(sale.final_amount || sale.total_amount).toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="modal-footer no-print">
                            <button className="btn btn-secondary" onClick={handlePrintReport}>Imprimir / Salvar PDF</button>
                            <button className="btn btn-primary" onClick={() => setIsReportModalOpen(false)}>Fechar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomersPage;
