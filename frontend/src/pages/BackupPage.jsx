import React, { useState, useEffect } from 'react';
import { Database, Download, RotateCcw, Cpu, HardDrive, ShieldCheck, RefreshCw, Zap, AlertTriangle, FileCheck } from 'lucide-react';
import api from '../services/api';
import ManagerAuthModal from '../components/ManagerAuthModal';
import './BackupPage.css';

const BackupPage = () => {
    const [health, setHealth] = useState(null);
    const [backups, setBackups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    
    // Auth Modal state for restoring
    const [authModal, setAuthModal] = useState({
        isOpen: false,
        targetFile: null, // null means latest
        title: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [healthRes, listRes] = await Promise.all([
                api.get('/backup/status'),
                api.get('/backup/list')
            ]);
            setHealth(healthRes.data);
            setBackups(listRes.data);
        } catch (error) {
            console.error('Error fetching backup data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateBackup = async () => {
        setActionLoading(true);
        try {
            const res = await api.post('/backup/create');
            alert(res.data.message || 'Backup criado com sucesso!');
            fetchData();
        } catch (error) {
            alert('Erro ao criar backup: ' + (error.response?.data?.error || error.message));
        } finally {
            setActionLoading(false);
        }
    };

    const handleOptimizeSystem = async () => {
        setActionLoading(true);
        try {
            const res = await api.post('/backup/optimize');
            alert(res.data.message || 'Sistema otimizado com sucesso!');
            fetchData();
        } catch (error) {
            alert('Erro ao otimizar sistema: ' + (error.response?.data?.error || error.message));
        } finally {
            setActionLoading(false);
        }
    };

    const handleRestoreConfirm = async () => {
        const { targetFile } = authModal;
        setAuthModal({ isOpen: false, targetFile: null, title: '' });
        setActionLoading(true);

        try {
            let res;
            if (targetFile) {
                res = await api.post(`/backup/restore/${encodeURIComponent(targetFile)}`);
            } else {
                res = await api.post('/backup/restore-latest');
            }
            alert(`✅ RECONSTRUÇÃO CONCLUÍDA!\n\n${res.data.message}`);
            window.location.reload();
        } catch (error) {
            alert('Erro na restauração do backup: ' + (error.response?.data?.error || error.message));
        } finally {
            setActionLoading(false);
        }
    };

    const handleDownload = (filename) => {
        window.open(`/api/backup/download/${encodeURIComponent(filename)}`, '_blank');
    };

    return (
        <div className="backup-page-container">
            <header className="page-header">
                <div>
                    <h1><Database size={28} className="icon-header" /> Backup & Saúde do Sistema</h1>
                    <p className="subtitle">Gestão automática de backups, recuperação de desastres e integridade do banco de dados</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-secondary" onClick={fetchData} disabled={loading || actionLoading}>
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Atualizar
                    </button>
                    <button className="btn-primary" onClick={handleCreateBackup} disabled={actionLoading}>
                        <Database size={16} /> Criar Backup Agora
                    </button>
                </div>
            </header>

            {/* Health Overview Cards */}
            {health && (
                <div className="health-grid">
                    <div className="health-card glass">
                        <div className="card-icon ram"><HardDrive size={22} /></div>
                        <div className="card-info">
                            <span className="card-label">Uso de Memória RAM</span>
                            <span className="card-value">{health.memory?.usedPercent}</span>
                            <small>{health.memory?.processRssMB} processo / {health.memory?.totalMB} MB total</small>
                        </div>
                    </div>

                    <div className="health-card glass">
                        <div className="card-icon db"><Database size={22} /></div>
                        <div className="card-info">
                            <span className="card-label">Tamanho do Banco MySQL</span>
                            <span className="card-value">{health.database?.sizeMB}</span>
                            <small>Banco: {health.database?.name}</small>
                        </div>
                    </div>

                    <div className="health-card glass">
                        <div className="card-icon cpu"><Cpu size={22} /></div>
                        <div className="card-info">
                            <span className="card-label">CPUs & Uptime VPS</span>
                            <span className="card-value">{health.system?.cpus} Núcleos</span>
                            <small>{health.system?.uptimeHours}h ligado ({health.system?.platform})</small>
                        </div>
                    </div>

                    <div className="health-card glass">
                        <div className="card-icon backups"><ShieldCheck size={22} /></div>
                        <div className="card-info">
                            <span className="card-label">Backups Salvos</span>
                            <span className="card-value">{health.backups?.totalCount} Arquivos</span>
                            <small>Último: {health.backups?.latestBackup ? new Date(health.backups.latestBackup.createdAt).toLocaleDateString('pt-BR') : 'Nenhum'}</small>
                        </div>
                    </div>
                </div>
            )}

            {/* Hero Quick Recovery Action Card */}
            <div className="recovery-hero-card glass">
                <div className="hero-content">
                    <div className="hero-badge">
                        <AlertTriangle size={18} /> Mecanismo de Recuperação de Emergência
                    </div>
                    <h2>Restaurar Último Backup Válido</h2>
                    <p>
                        Caso ocorra corrupção de dados ou falha de sistema, utilize este mecanismo para restaurar a base de dados
                        imediatamente a partir do último arquivo de backup automático validado.
                    </p>
                </div>
                <div className="hero-actions">
                    <button 
                        className="btn-danger-hero"
                        disabled={actionLoading || backups.length === 0}
                        onClick={() => {
                            setAuthModal({
                                isOpen: true,
                                targetFile: null,
                                title: 'RESTAURAR ÚLTIMO BACKUP VÁLIDO'
                            });
                        }}
                    >
                        <RotateCcw size={20} /> Restaurar Último Backup Válido
                    </button>
                    <button 
                        className="btn-optimize"
                        disabled={actionLoading}
                        onClick={handleOptimizeSystem}
                    >
                        <Zap size={18} /> Otimizar Banco & RAM
                    </button>
                </div>
            </div>

            {/* Backups List Table */}
            <div className="table-section glass">
                <div className="table-header">
                    <h3><FileCheck size={20} /> Histórico de Backups Compactados (.sql.gz)</h3>
                    <span className="badge-count">{backups.length} backups disponíveis</span>
                </div>

                <div className="table-responsive">
                    <table className="backup-table">
                        <thead>
                            <tr>
                                <th>Arquivo de Backup</th>
                                <th>Data e Hora de Criação</th>
                                <th>Tamanho</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {backups.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="empty-row">
                                        Nenhum arquivo de backup encontrado. Clique em "Criar Backup Agora" acima.
                                    </td>
                                </tr>
                            ) : (
                                backups.map((b, idx) => (
                                    <tr key={b.filename} className={idx === 0 ? 'latest-row' : ''}>
                                        <td>
                                            <div className="filename-cell">
                                                <Database size={16} className="file-icon" />
                                                <strong>{b.filename}</strong>
                                                {idx === 0 && <span className="latest-tag">Mais Recente</span>}
                                            </div>
                                        </td>
                                        <td>{new Date(b.createdAt).toLocaleString('pt-BR')}</td>
                                        <td><span className="size-badge">{b.sizeMB}</span></td>
                                        <td>
                                            <div className="action-buttons">
                                                <button 
                                                    className="btn-action download"
                                                    title="Baixar Backup"
                                                    onClick={() => handleDownload(b.filename)}
                                                >
                                                    <Download size={15} /> Baixar
                                                </button>
                                                <button 
                                                    className="btn-action restore"
                                                    title="Restaurar este backup"
                                                    onClick={() => {
                                                        setAuthModal({
                                                            isOpen: true,
                                                            targetFile: b.filename,
                                                            title: `RESTAURAR BACKUP: ${b.filename}`
                                                        });
                                                    }}
                                                >
                                                    <RotateCcw size={15} /> Restaurar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Manager Security Authorization Modal */}
            <ManagerAuthModal 
                isOpen={authModal.isOpen}
                onClose={() => setAuthModal({ isOpen: false, targetFile: null, title: '' })}
                onConfirm={handleRestoreConfirm}
                title={authModal.title}
                actionDescription="ATENÇÃO: A restauração irá substituir todo o banco de dados atual pelas informações deste backup. Esta operação exige autorização de um gerente ou administrador."
            />
        </div>
    );
};

export default BackupPage;
