const { FinancialEntry, Supplier, Customer, sequelize } = require('../models');
const { Op } = require('sequelize');

class FinancialController {
    async list(req, res) {
        try {
            const { type, status, start_date, end_date } = req.query;
            const where = { tenant_id: req.tenantId };

            if (type) where.type = type;
            if (status) where.status = status;
            
            if (start_date && end_date) {
                where.due_date = { [Op.between]: [start_date, end_date] };
            }

            const entries = await FinancialEntry.findAll({
                where,
                include: [
                    { model: Supplier, as: 'supplier', attributes: ['name'] },
                    { model: Customer, as: 'customer', attributes: ['name'] }
                ],
                order: [['due_date', 'ASC']]
            });

            return res.json(entries);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async create(req, res) {
        try {
            const entry = await FinancialEntry.create({
                ...req.body,
                tenant_id: req.tenantId
            });
            return res.status(201).json(entry);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }

    async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, payment_date, payment_method } = req.body;

            const entry = await FinancialEntry.findOne({
                where: { id, tenant_id: req.tenantId }
            });

            if (!entry) return res.status(404).json({ error: 'Lançamento não encontrado' });

            await entry.update({
                status,
                payment_date: status === 'paid' ? (payment_date || new Date()) : null,
                payment_method
            });

            return res.json(entry);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }

    async getDashboardStats(req, res) {
        try {
            const tenant_id = req.tenantId;
            const today = new Date().toISOString().split('T')[0];

            const stats = await FinancialEntry.findAll({
                attributes: [
                    'type',
                    'status',
                    [sequelize.fn('SUM', sequelize.col('amount')), 'total']
                ],
                where: { tenant_id },
                group: ['type', 'status']
            });

            const overDue = await FinancialEntry.sum('amount', {
                where: {
                    tenant_id,
                    status: 'pending',
                    due_date: { [Op.lt]: today }
                }
            }) || 0;

            return res.json({ stats, overDue });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async getAdvancedReports(req, res) {
        try {
            const { report_type = 'dre', start_date, end_date, status, category, payment_method } = req.query;
            const tenant_id = req.tenantId;

            const { Sale, SaleItem, Product, FinancialEntry, Supplier, Customer } = require('../models');

            const startDateObj = start_date ? new Date(`${start_date}T00:00:00.000Z`) : new Date(new Date().setDate(1));
            const endDateObj = end_date ? new Date(`${end_date}T23:59:59.999Z`) : new Date();

            if (report_type === 'dre') {
                const sales = await Sale.findAll({
                    where: { tenant_id, createdAt: { [Op.between]: [startDateObj, endDateObj] } },
                    include: [{ model: SaleItem, as: 'items', include: [{ model: Product, as: 'product_sale' }] }]
                });

                let grossRevenue = 0;
                let totalDiscounts = 0;
                let cmvTotal = 0;

                sales.forEach(s => {
                    const total = Number(s.total_amount || 0);
                    const disc = Number(s.discount_amount || 0);
                    grossRevenue += total;
                    totalDiscounts += disc;

                    if (s.items) {
                        s.items.forEach(item => {
                            const cost = Number(item.product_sale?.cost || 0);
                            cmvTotal += cost * Number(item.quantity || 1);
                        });
                    }
                });

                const netRevenue = grossRevenue - totalDiscounts;
                const grossProfit = netRevenue - cmvTotal;
                const grossMargin = netRevenue > 0 ? ((grossProfit / netRevenue) * 100) : 0;

                const expenses = await FinancialEntry.findAll({
                    where: {
                        tenant_id,
                        type: 'payable',
                        status: 'paid',
                        payment_date: { [Op.between]: [startDateObj, endDateObj] }
                    }
                });

                const operatingExpenses = expenses.reduce((acc, exp) => acc + Number(exp.amount || 0), 0);
                const netProfit = grossProfit - operatingExpenses;

                return res.json({
                    report_type: 'dre',
                    period: { start_date: startDateObj, end_date: endDateObj },
                    dre: {
                        gross_revenue: grossRevenue,
                        discounts: totalDiscounts,
                        net_revenue: netRevenue,
                        cmv: cmvTotal,
                        gross_profit: grossProfit,
                        gross_margin_pct: Number(grossMargin.toFixed(2)),
                        operating_expenses: operatingExpenses,
                        net_profit: netProfit
                    }
                });
            }

            if (report_type === 'delinquency') {
                const todayStr = new Date().toISOString().split('T')[0];
                const overdueEntries = await FinancialEntry.findAll({
                    where: {
                        tenant_id,
                        type: 'receivable',
                        status: 'pending',
                        due_date: { [Op.lt]: todayStr }
                    },
                    include: [{ model: Customer, as: 'customer' }],
                    order: [['due_date', 'ASC']]
                });

                const totalOverdue = overdueEntries.reduce((acc, e) => acc + Number(e.amount || 0), 0);

                return res.json({
                    report_type: 'delinquency',
                    total_overdue: totalOverdue,
                    count: overdueEntries.length,
                    entries: overdueEntries
                });
            }

            if (report_type === 'payment_methods') {
                const sales = await Sale.findAll({
                    where: { tenant_id, createdAt: { [Op.between]: [startDateObj, endDateObj] } }
                });

                const methodsMap = {};
                sales.forEach(s => {
                    const method = s.payment_method || 'outro';
                    const amount = Number(s.final_amount || s.total_amount || 0);
                    if (!methodsMap[method]) {
                        methodsMap[method] = { method, count: 0, total: 0 };
                    }
                    methodsMap[method].count += 1;
                    methodsMap[method].total += amount;
                });

                return res.json({
                    report_type: 'payment_methods',
                    methods: Object.values(methodsMap),
                    total_sales_count: sales.length
                });
            }

            const whereFin = { tenant_id };
            if (status && status !== 'all') whereFin.status = status;
            if (category && category !== 'all') whereFin.category = category;
            if (payment_method && payment_method !== 'all') whereFin.payment_method = payment_method;
            whereFin.due_date = { [Op.between]: [start_date || '2020-01-01', end_date || '2030-12-31'] };

            const entries = await FinancialEntry.findAll({
                where: whereFin,
                include: [
                    { model: Supplier, as: 'supplier', attributes: ['name'] },
                    { model: Customer, as: 'customer', attributes: ['name'] }
                ],
                order: [['due_date', 'ASC']]
            });

            return res.json({
                report_type: 'general',
                count: entries.length,
                total_amount: entries.reduce((acc, e) => acc + Number(e.amount || 0), 0),
                entries
            });

        } catch (error) {
            console.error('Error generating financial report:', error);
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new FinancialController();
