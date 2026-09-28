const { Sale, SaleItem, Product, Tenant, ProductReturn, Supplier, Customer, User } = require('../models');
const { Op } = require('sequelize');

function calculateNFeDV(key43) {
    const weights = [2, 3, 4, 5, 6, 7, 8, 9];
    let sum = 0;
    let weightIndex = 0;
    for (let i = key43.length - 1; i >= 0; i--) {
        const digit = parseInt(key43.charAt(i), 10);
        sum += digit * weights[weightIndex % weights.length];
        weightIndex++;
    }
    const remainder = sum % 11;
    if (remainder === 0 || remainder === 1) return 0;
    return 11 - remainder;
}

function generateValidNFCeKey(cnpjRaw, saleId, isContingency = false) {
    const uf = '35'; // SP
    const now = new Date();
    const year = String(now.getFullYear()).slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const cleanCnpj = (cnpjRaw || '52226115000100').replace(/\D/g, '').padStart(14, '0').slice(0, 14);
    const model = '65'; // NFC-e
    const serie = '002';
    const number = String(saleId || 1).padStart(9, '0').slice(-9);
    const tpEmis = isContingency ? '9' : '1';
    const cNF = String(Math.abs(Math.sin(saleId || 1) * 100000000) | 0).padStart(8, '0').slice(0, 8);
    const key43 = `${uf}${year}${month}${cleanCnpj}${model}${serie}${number}${tpEmis}${cNF}`;
    const dv = calculateNFeDV(key43);
    return `${key43}${dv}`;
}

const SefazNFeService = require('../services/SefazNFeService');

class FiscalController {
    async emitNFCe(req, res) {
        console.log('Incoming Fiscal Emission Request:', req.params.saleId);
        try {
            const { saleId } = req.params;
            const tenant_id = req.tenantId;

            const result = await SefazNFeService.transmitNFCe(saleId);

            return res.json({
                message: 'Cupom Fiscal emitido com sucesso',
                fiscal_key: result.fiscal_key,
                fiscal_protocol: result.fiscal_protocol,
                xml_content: result.xml_content
            });

        } catch (error) {
            console.error('Fiscal Emission Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    async emitContingencyNFCe(req, res) {
        try {
            const { saleId } = req.params;
            const result = await SefazNFeService.transmitNFCe(saleId);
            return res.json(result);
        } catch (error) {
            console.error('Fiscal Contingency Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    async syncContingencies(req, res) {
        try {
            const tenant_id = req.tenantId;

            const pendingSales = await Sale.findAll({
                where: { tenant_id, fiscal_status: 'contingency' }
            });

            let syncedCount = 0;
            for (const sale of pendingSales) {
                try {
                    await SefazNFeService.transmitNFCe(sale.id, { forceEmitted: true });
                    syncedCount++;
                } catch (err) {
                    console.error(`Error transmitting pending sale #${sale.id}:`, err.message);
                }
            }

            return res.json({
                message: `${syncedCount} cupons fiscais transmitidos para a SEFAZ!`,
                syncedCount
            });
        } catch (error) {
            console.error('Error syncing fiscal contingencies:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    async getFiscalData(req, res) {
        console.log('Fetching Fiscal Data for Sale:', req.params.saleId);
        try {
            const { saleId } = req.params;
            const tenant_id = req.tenantId;

            const includeConfig = [
                { model: SaleItem, as: 'items', include: [{ model: Product, as: 'product_sale' }] },
                { model: Tenant, as: 'tenant' },
                { model: Customer, as: 'customer' },
                { model: User, as: 'user' }
            ];

            let sale = await Sale.findOne({
                where: { id: saleId, tenant_id },
                include: includeConfig
            });

            if (!sale) {
                sale = await Sale.findOne({
                    where: { id: saleId },
                    include: includeConfig
                });
            }
            
            if (!sale) {
                console.log('Sale not found in getFiscalData:', saleId);
                return res.status(404).json({ error: 'Venda não encontrada no banco' });
            }

            const saleData = sale.toJSON();
            const finalAmount = parseFloat(sale.final_amount || sale.total_amount || 0);
            saleData.ibpt_state_tax = (finalAmount * 0.12).toFixed(2);
            saleData.ibpt_federal_tax = (0.00).toFixed(2);
            saleData.ibpt_total_tax = saleData.ibpt_state_tax;
            saleData.ibpt_key = sale.tenant?.ibpt_key || '42CA5A';

            if (sale.fiscal_key && sale.tenant) {
                const SefazNFeService = require('../services/SefazNFeService');
                saleData.qr_code_url = SefazNFeService.generateQrCodeV2Url(
                    sale.fiscal_key,
                    sale.tenant.fiscal_environment === 'production' ? '1' : '2',
                    sale.tenant.csc_id || '1',
                    sale.tenant.csc_token
                );
            }

            return res.json(saleData);
        } catch (error) {
            console.error('Error in getFiscalData:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    async getAllFiscalNotes(req, res) {
        try {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            let tenant_id = req.tenantId;

            if (!tenant_id || tenant_id === 23) {
                const yukiTenant = await Tenant.findOne({ where: { cnpj: '52226115000100' } });
                if (yukiTenant) tenant_id = yukiTenant.id;
            }

            const salesWhere = {};
            if (tenant_id) salesWhere.tenant_id = tenant_id;

            const returnsWhere = {};
            if (tenant_id) returnsWhere.tenant_id = tenant_id;

            const sales = await Sale.findAll({
                where: salesWhere,
                include: [
                    { model: Customer, as: 'customer', attributes: ['id', 'name', 'cpf'] },
                    { model: User, as: 'user', attributes: ['id', 'name'] }
                ],
                order: [['createdAt', 'DESC']]
            });

            const returns = await ProductReturn.findAll({
                where: returnsWhere,
                include: [
                    { model: Supplier, as: 'supplier', attributes: ['id', 'name', 'cnpj'] },
                    { model: User, as: 'user', attributes: ['id', 'name'] }
                ],
                order: [['createdAt', 'DESC']]
            });

            const notes = [];

            sales.forEach(s => {
                notes.push({
                    id: s.id,
                    doc_type: 'NFC-e Venda',
                    model: '65',
                    total_amount: Number(s.final_amount || s.total_amount || 0),
                    fiscal_key: s.fiscal_key,
                    fiscal_protocol: s.fiscal_protocol,
                    fiscal_status: (s.status === 'cancelled' || s.fiscal_status === 'cancelled') ? 'cancelled' : (s.fiscal_status || 'none'),
                    cancellation_protocol: s.cancellation_protocol || s.fiscal_protocol,
                    cancellation_reason: s.cancellation_reason,
                    cancelled_at: s.cancelled_at,
                    authorized_by: s.authorized_by,
                    operator_id: s.operator_id,
                    createdAt: s.createdAt,
                    destination: s.customer ? s.customer.name : 'Consumidor Final',
                    origin_id: s.id,
                    ref_type: 'sale'
                });
            });

            returns.forEach(r => {
                notes.push({
                    id: r.id,
                    doc_type: r.type === 'supplier_return' ? 'NF-e Dev. Fornecedor' : 'NF-e Dev. Cliente',
                    model: '55',
                    total_amount: Number(r.total_amount || 0),
                    fiscal_key: r.fiscal_key,
                    fiscal_protocol: r.fiscal_protocol,
                    fiscal_status: r.status === 'cancelled' ? 'cancelled' : (r.fiscal_status || 'draft'),
                    cancellation_protocol: r.cancellation_protocol || r.fiscal_protocol,
                    cancellation_reason: r.cancellation_reason || r.reason,
                    cancelled_at: r.cancelled_at,
                    authorized_by: r.authorized_by,
                    createdAt: r.createdAt,
                    destination: r.supplier ? r.supplier.name : 'Devolução',
                    origin_id: r.id,
                    ref_type: 'return'
                });
            });

            notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            const activeNotes = notes.filter(n => n.fiscal_status !== 'cancelled');
            const cancelledNotes = notes.filter(n => n.fiscal_status === 'cancelled');

            const summary = {
                total_count: notes.length,
                active_count: activeNotes.length,
                emitted_count: notes.filter(n => n.fiscal_status === 'emitted').length,
                cancelled_count: cancelledNotes.length,
                contingency_count: notes.filter(n => n.fiscal_status === 'contingency').length,
                draft_count: notes.filter(n => n.fiscal_status === 'draft' || n.fiscal_status === 'none').length,
                total_amount: activeNotes.reduce((acc, n) => acc + n.total_amount, 0),
                cancelled_amount: cancelledNotes.reduce((acc, n) => acc + n.total_amount, 0)
            };

            return res.json({ notes, summary });
        } catch (error) {
            console.error('Error fetching fiscal notes:', error);
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new FiscalController();
