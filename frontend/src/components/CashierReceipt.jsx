import React, { useEffect } from 'react';
import { X, Printer } from 'lucide-react';
import './CashierReceipt.css';

const CashierReceipt = ({ data, type = 'X', onClose }) => {
    
    if (!data) return null;

    const { transactions = [], opening_balance, expected_balance, terminal, user_id, closed_at } = data;

    // Calculate Totals
    const sales = transactions.filter(t => t.type === 'sale');
    const additions = transactions.filter(t => t.type === 'addition' || t.type === 'inflow');
    const withdrawals = transactions.filter(t => t.type === 'withdrawal' || t.type === 'outflow');
    const cancellations = transactions.filter(t => t.type === 'cancellation');
    const discounts = transactions.filter(t => t.type === 'discount');

    const sum = (arr) => arr.reduce((acc, t) => acc + parseFloat(t.amount), 0);
    
    // Sales by Method
    const salesCash = sum(sales.filter(t => t.payment_method === 'cash'));
    const salesCredit = sum(sales.filter(t => t.payment_method === 'credit'));
    const salesDebit = sum(sales.filter(t => t.payment_method === 'debit'));
    const salesPix = sum(sales.filter(t => t.payment_method === 'pix'));
    const salesPayroll = sum(sales.filter(t => t.payment_method === 'payroll'));

    // Cancellations by Method (Usually cash is refunded directly from drawer)
    const cancellationsCash = sum(cancellations.filter(t => t.payment_method === 'cash'));

    const totalAdditions = sum(additions);
    const totalWithdrawals = sum(withdrawals);
    const totalDiscounts = sum(discounts);
    const totalCancellations = sum(cancellations);
    
    const grossSales = sum(sales); // Bruto já com desconto subtraído na base

    // Cash in drawer formula:
    const cashInDrawer = parseFloat(opening_balance) + salesCash + totalAdditions - totalWithdrawals - cancellationsCash;

    const title = type === 'Z' ? 'REDUÇÃO Z - FECHAMENTO' : 'LEITURA X - PARCIAL';
    const dateStr = new Date().toLocaleString();

    return (
        <div className="cashier-receipt-overlay">
            <div className="cashier-receipt-content">
                <div className="cashier-receipt-header no-print">
                    <h2>{title}</h2>
                    <div>
                        <button className="btn-icon" onClick={() => window.print()} title="Imprimir"><Printer size={20}/></button>
                        <button className="btn-icon" onClick={onClose}><X size={20}/></button>
                    </div>
                </div>

                <div className="receipt-paper print-only-area" id="cashier-receipt">
                    <div className="receipt-header">
                        <h2>VAREJOPRO</h2>
                        <p>{title}</p>
                        <p>--------------------------------</p>
                        <p>PDV: {terminal?.name || 'Terminal'}</p>
                        <p>Data/Hora: {dateStr}</p>
                        <p>Operador ID: {user_id}</p>
                        {type === 'Z' && closed_at && <p>Fechamento: {new Date(closed_at).toLocaleString()}</p>}
                        <p>--------------------------------</p>
                    </div>

                    <div className="receipt-body">
                        <div className="receipt-row">
                            <span>SALDO INICIAL</span>
                            <span>R$ {parseFloat(opening_balance).toFixed(2)}</span>
                        </div>
                        <p>--------------------------------</p>
                        
                        <div className="receipt-section-title" style={{textAlign: 'center', fontWeight: 'bold'}}>VENDAS POR PAGAMENTO</div>
                        <div className="receipt-row">
                            <span>Dinheiro</span>
                            <span>R$ {salesCash.toFixed(2)}</span>
                        </div>
                        <div className="receipt-row">
                            <span>Cartão Crédito</span>
                            <span>R$ {salesCredit.toFixed(2)}</span>
                        </div>
                        <div className="receipt-row">
                            <span>Cartão Débito</span>
                            <span>R$ {salesDebit.toFixed(2)}</span>
                        </div>
                        <div className="receipt-row">
                            <span>PIX</span>
                            <span>R$ {salesPix.toFixed(2)}</span>
                        </div>
                        <div className="receipt-row">
                            <span>Convênio (Folha)</span>
                            <span>R$ {salesPayroll.toFixed(2)}</span>
                        </div>
                        <div className="receipt-row" style={{fontWeight: 'bold', marginTop: '4px'}}>
                            <span>TOTAL VENDAS</span>
                            <span>R$ {grossSales.toFixed(2)}</span>
                        </div>
                        
                        <p>--------------------------------</p>
                        <div className="receipt-section-title" style={{textAlign: 'center', fontWeight: 'bold'}}>MOVIMENTAÇÕES</div>
                        <div className="receipt-row">
                            <span>(+) Suprimentos</span>
                            <span>R$ {totalAdditions.toFixed(2)}</span>
                        </div>
                        <div className="receipt-row">
                            <span>(-) Sangrias</span>
                            <span>R$ {totalWithdrawals.toFixed(2)}</span>
                        </div>

                        <p>--------------------------------</p>
                        <div className="receipt-section-title" style={{textAlign: 'center', fontWeight: 'bold'}}>EXCEÇÕES</div>
                        <div className="receipt-row">
                            <span>Descontos Autorizados</span>
                            <span>R$ {totalDiscounts.toFixed(2)}</span>
                        </div>
                        <div className="receipt-row">
                            <span>Estornos Realizados</span>
                            <span>R$ {totalCancellations.toFixed(2)}</span>
                        </div>
                        <div className="receipt-row">
                            <span>(Estornos em Dinheiro)</span>
                            <span>R$ {cancellationsCash.toFixed(2)}</span>
                        </div>

                        <p>--------------------------------</p>
                        <div className="receipt-row" style={{fontSize: '1.2em', fontWeight: 'bold'}}>
                            <span>DINHEIRO NA GAVETA</span>
                            <span>R$ {cashInDrawer.toFixed(2)}</span>
                        </div>
                        
                        {type === 'Z' && (
                            <>
                                <p>--------------------------------</p>
                                <div className="receipt-row">
                                    <span>VALOR DECLARADO</span>
                                    <span>R$ {parseFloat(data.closing_balance || 0).toFixed(2)}</span>
                                </div>
                                <div className="receipt-row">
                                    <span>DIFERENÇA (QUEBRA)</span>
                                    <span>R$ {(parseFloat(data.closing_balance || 0) - cashInDrawer).toFixed(2)}</span>
                                </div>
                            </>
                        )}
                        <p>--------------------------------</p>
                        <p style={{textAlign: 'center', marginTop: '20px'}}>
                            __________________________________<br/>
                            Assinatura do Operador
                        </p>
                        <br/>
                        <p style={{textAlign: 'center'}}>
                            __________________________________<br/>
                            Visto do Gerente
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CashierReceipt;
