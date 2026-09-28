import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Printer, Download, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../services/api';
import './FiscalReceipt.css';

const FiscalReceipt = ({ data, onClose }) => {
    const [tenantInfo, setTenantInfo] = useState(data?.tenant || null);

    useEffect(() => {
        if (data?.tenant) {
            setTenantInfo(data.tenant);
        } else {
            // Fetch tenant info if not attached directly to sale object
            const fetchTenant = async () => {
                try {
                    const res = await api.get('/tenants');
                    if (Array.isArray(res.data) && res.data.length > 0) {
                        const target = data?.tenant_id ? res.data.find(t => t.id === data.tenant_id) : res.data[0];
                        setTenantInfo(target || res.data[0]);
                    }
                } catch (e) {
                    console.error('Error fetching tenant for receipt:', e);
                }
            };
            fetchTenant();
        }
    }, [data]);

    if (!data) return null;

    const translatePaymentMethod = (method) => {
        const methods = {
            'cash': 'Dinheiro',
            'credit_card': 'Cartão de Crédito',
            'debit_card': 'Cartão de Débito',
            'payroll': 'Folha de Pagamento',
            'pix': 'PIX',
            'pbm': 'PBM / Convênio'
        };
        return methods[method?.toLowerCase()] || method || '';
    };

    const handlePrint = () => {
        window.print();
    };

    const isPayroll = data.payment_method?.toLowerCase() === 'payroll';

    const receiptContent = (
        <div className="fiscal-overlay fiscal-overlay-portal" onClick={onClose}>
            <div className="fiscal-container glass" onClick={e => e.stopPropagation()}>
                <div className="fiscal-actions no-print">
                    <button className="btn btn-secondary" onClick={handlePrint}><Printer size={18}/> Imprimir Cupom</button>
                    <button className="btn-icon" onClick={onClose}><X size={24}/></button>
                </div>

                <div className="danfe-thermal">
                    <div className="header">
                        <h2>{tenantInfo?.name || data.tenant_name || 'VAREJOPRO DROGARIA'}</h2>
                        <p>{tenantInfo?.address || 'Endereço da Loja'}</p>
                        {tenantInfo?.phone && <p>Tel: {tenantInfo.phone}</p>}
                        <p>CNPJ: {tenantInfo?.cnpj || '00.000.000/0001-00'}</p>
                        <p>IE: {tenantInfo?.state_registration || tenantInfo?.ie || 'ISENTO'}</p>
                    </div>

                    <div className="divider">------------------------------------------</div>

                    <div className="doc-info">
                        <strong>DANFE NFC-e - Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica</strong>
                        {data.pbm_transaction_id && (
                            <div className="fp-gov-header mt-1 p-1" style={{ border: '1px solid #000', borderRadius: '4px', textAlign: 'center', margin: '6px 0' }}>
                                <strong>★ GOVERNO FEDERAL • MINISTÉRIO DA SAÚDE ★</strong>
                                <div style={{ fontWeight: 'bold', fontSize: '11px' }}>PROGRAMA LOJA POPULAR DO BRASIL</div>
                                <div style={{ fontSize: '10px' }}>SAÚDE NÃO TEM PREÇO</div>
                            </div>
                        )}
                        {data.fiscal_status === 'contingency' && (
                            <div className="contingency-alert mt-1" style={{ color: '#d97706', fontWeight: 'bold', fontSize: '11px' }}>
                                EMITIDA EM CONTINGÊNCIA (OFFLINE) - PENDENTE DE TRANSMISSÃO
                            </div>
                        )}
                        <p>Não permite aproveitamento de crédito de ICMS</p>
                    </div>

                    <div className="divider">------------------------------------------</div>

                    <table className="items-table">
                        <thead>
                            <tr>
                                <th>Cod | Desc</th>
                                <th>Qtd | Un</th>
                                <th>Vl Un</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.map((item, index) => (
                                <tr key={index}>
                                    <td>{String(index + 1).padStart(3, '0')} {item.product_sale?.name || item.name}</td>
                                    <td>{item.quantity} UN</td>
                                    <td>{parseFloat(item.unit_price).toFixed(2)}</td>
                                    <td>{parseFloat(item.subtotal || item.unit_price * item.quantity).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="divider">------------------------------------------</div>

                    <div className="totals">
                        <div className="total-row">
                            <span>Qtd. Total de Itens</span>
                            <span>{data.items.length}</span>
                        </div>
                        <div className="total-row">
                            <span>Valor Total R$</span>
                            <span>{parseFloat(data.total_amount || data.final_amount).toFixed(2)}</span>
                        </div>
                        {data.discount_amount > 0 && (
                            <div className="total-row">
                                <span>Desconto R$</span>
                                <span>-{parseFloat(data.discount_amount).toFixed(2)}</span>
                            </div>
                        )}
                        <div className="total-row final">
                            <span>VALOR A PAGAR R$</span>
                            <span>{parseFloat(data.final_amount).toFixed(2)}</span>
                        </div>
                        <div className="total-row">
                            <span>FORMA PAGAMENTO</span>
                            <span>{translatePaymentMethod(data.payment_method).toUpperCase()}</span>
                        </div>
                    </div>

                    {data.discount_amount > 0 && (
                        <div style={{ textTransform: 'uppercase', textAlign: 'center', fontWeight: 'bold', margin: '6px 0', padding: '4px', borderTop: '1px dashed #000', borderBottom: '1px dashed #000' }}>
                            VOCÊ ECONOMIZOU NESSA COMPRA: R$ {parseFloat(data.discount_amount).toFixed(2)}
                        </div>
                    )}

                    <div className="divider">------------------------------------------</div>

                    <div style={{ textAlign: 'center', fontSize: '10px', margin: '4px 0' }}>
                        <p>Trib aprox Federal R$ {data.ibpt_federal_tax || '0,00'} Estadual R$ {data.ibpt_state_tax || (parseFloat(data.final_amount || data.total_amount || 0) * 0.12).toFixed(2)} - Fonte: IBPT/EMPRESOMETRO.COM.BR Chave {data.ibpt_key || '42CA5A'}</p>
                    </div>

                    <div className="divider">------------------------------------------</div>

                    <div className="fiscal-info" style={{ textAlign: 'center', fontSize: '11px' }}>
                        <p>Consulte pela Chave de Acesso em:</p>
                        <p style={{ fontSize: '9px', wordBreak: 'break-all', fontWeight: 'bold', margin: '3px 0' }}>
                            {data.fiscal_key ? `https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Pagina/${data.fiscal_key.replace(/\D/g, '')}` : 'https://www.nfce.fazenda.sp.gov.br/consulta'}
                        </p>
                        <div className="key" style={{ fontWeight: 'bold', letterSpacing: '0.5px', wordBreak: 'break-all', margin: '6px 0', fontSize: '11px' }}>
                            {data.fiscal_key ? data.fiscal_key.replace(/\D/g, '').match(/.{1,4}/g)?.join(' ') : '3526 0852 2261 1500 0100 6500 2000 0000 0069 1114 7848'}
                        </div>
                        
                        <div className="divider">------------------------------------------</div>

                        <div className="consumer-info" style={{ fontWeight: 'bold', textTransform: 'uppercase', margin: '4px 0' }}>
                            {data.cpf_nota || data.customer?.cpf || data.customer?.cnpj
                                ? `CPF/CNPJ NA NOTA: ${data.cpf_nota || data.customer?.cpf || data.customer?.cnpj}${data.customer?.name ? ` - ${data.customer.name}` : ''}`
                                : 'CONSUMIDOR NÃO IDENTIFICADO'}
                        </div>

                        <div className="divider">------------------------------------------</div>

                        <div className="meta" style={{ margin: '6px 0' }}>
                            <strong>Nr.: {data.id} Serie: {data.fiscal_serie || '2'}</strong>
                            <p>Emissão: {data.createdAt ? new Date(data.createdAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')} VIA CONSUMIDOR</p>
                            <p style={{ marginTop: '3px', fontWeight: 'bold' }}>Protocolo de Autorização:</p>
                            <p style={{ fontWeight: 'bold', fontSize: '12px' }}>{data.fiscal_protocol || 'Pendente de Transmissão'}</p>
                        </div>
                    </div>

                    <div className="qrcode-area" style={{ textAlign: 'center', marginTop: '8px' }}>
                        <div className="qr-image-wrapper" style={{ margin: '8px auto', display: 'flex', justifyContent: 'center', background: '#ffffff', padding: '6px', border: '1px solid #000', borderRadius: '4px', width: 'fit-content' }}>
                            <QRCodeSVG 
                                value={data.qr_code_url || (data.fiscal_key ? `https://www.nfce.fazenda.sp.gov.br/qrcode?p=${data.fiscal_key.replace(/\D/g, '')}|2|1|1|${data.fiscal_protocol || '1'}` : 'https://www.nfce.fazenda.sp.gov.br/consulta')} 
                                size={150} 
                                level="M"
                                includeMargin={true}
                            />
                        </div>
                        <p style={{ fontSize: '10px', textAlign: 'center', margin: '4px 0 0 0', color: '#000000', fontWeight: 'bold' }}>
                            Consulta via leitor de QR Code / SEFAZ SP
                        </p>
                    </div>

                    <div style={{ textAlign: 'center', fontSize: '10px', fontWeight: 'bold', marginTop: '8px', borderTop: '1px solid #000', paddingTop: '4px' }}>
                        <p>Tributos Totais Incidentes (Lei Federal 12.741/2012)</p>
                        <p style={{ fontSize: '11px', marginTop: '2px' }}>R$ {data.ibpt_total_tax || (parseFloat(data.final_amount || data.total_amount || 0) * 0.12).toFixed(2)}</p>
                    </div>

                    <div className="footer">
                        <p>VarejoPro ERP - Solução para Lojas</p>
                    </div>

                    {/* AUTORIZAÇÃO DE DESCONTO EM FOLHA */}
                    {isPayroll && (
                        <div className="payroll-authorization-slip" style={{ marginTop: '30px', paddingTop: '16px', borderTop: '2px dashed #000' }}>
                            <div className="header" style={{ textAlign: 'center' }}>
                                <h2>{tenantInfo?.name || data.tenant_name || 'DROGARIA FARMA BUS'}</h2>
                                <p>{tenantInfo?.address || 'RUA MURTA-DO-CAMPO,405 - VILA ALPINA'}</p>
                                <p>{tenantInfo?.city || 'SAO PAULO'} - {tenantInfo?.state || 'SP'}</p>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '8px 0', fontSize: '11px' }}>
                                <span>{data.createdAt ? new Date(data.createdAt).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}</span>
                                <span>{data.createdAt ? new Date(data.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>

                            <div className="divider">------------------------------------------</div>

                            <div className="doc-info" style={{ fontSize: '11px', textAlign: 'left', lineHeight: '1.4' }}>
                                <p style={{ margin: '2px 0' }}>
                                    {data.customer?.garage || data.customer?.company || data.customer?.external_type
                                        ? `${data.customer?.external_id ? String(data.customer.external_id).padStart(6, '0') + ' - ' : ''}${(data.customer.garage || data.customer.company || data.customer.external_type).toUpperCase()}`
                                        : `${data.customer?.external_id ? String(data.customer.external_id).padStart(6, '0') + ' - ' : '000001 - '}EMPRESA CONVENIADA`}
                                </p>
                                <p style={{ margin: '2px 0' }}>
                                    {String(data.customer?.external_id || data.customer?.cpf || data.customer?.id || '00000000009217').replace(/\D/g, '').padStart(14, '0')} - {(data.customer?.name || 'FUNCIONARIO').toUpperCase()}
                                </p>
                                <p style={{ margin: '2px 0' }}>
                                    Atendente: {String(data.user_id || data.user?.id || '000001').padStart(6, '0')} - {(data.user?.name || 'ATENDENTE').toUpperCase()}
                                </p>
                                <p style={{ margin: '2px 0' }}>
                                    Venda No: {String(data.id || 1).padStart(6, '0')} - COO: {data.fiscal_protocol ? String(data.fiscal_protocol).slice(-6) : String(data.id || 1).padStart(6, '0')}
                                </p>
                            </div>

                            <div className="divider">------------------------------------------</div>

                            <div style={{ margin: '8px 0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}>
                                    <span>QTD  PRODUTO</span>
                                    <span>TOTAL</span>
                                </div>
                                <div className="divider">------------------------------------------</div>
                                {data.items?.map((item, index) => (
                                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', margin: '3px 0' }}>
                                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '8px' }}>
                                            {item.quantity}  {(item.product_sale?.name || item.name || 'PRODUTO').toUpperCase()}
                                        </span>
                                        <span>{parseFloat(item.subtotal || item.unit_price * item.quantity || 0).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="divider">------------------------------------------</div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', margin: '10px 0' }}>
                                <span>A pagar</span>
                                <span>{parseFloat(data.final_amount || data.total_amount || 0).toFixed(2)}</span>
                            </div>

                            <div style={{ margin: '16px 0 20px 0', fontSize: '11px', textAlign: 'left', lineHeight: '1.4' }}>
                                <p>
                                    Autorizo o desconto no valor de {parseFloat(data.final_amount || data.total_amount || 0).toFixed(2)} em minha folha de pagamento ou termo de rescisao contratual.
                                </p>
                            </div>

                            <div style={{ textAlign: 'center', margin: '24px 0 16px 0' }}>
                                <strong style={{ fontSize: '12px', textTransform: 'uppercase' }}>
                                    {data.customer?.name || 'NOME DO FUNCIONARIO'}
                                </strong>
                            </div>

                            <div style={{ marginTop: '20px', fontSize: '11px' }}>
                                <p style={{ margin: '0 0 20px 0' }}>Documento:</p>
                                <div style={{ borderBottom: '1px dashed #000', width: '100%' }}></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return ReactDOM.createPortal(receiptContent, document.body);
};

export default FiscalReceipt;
