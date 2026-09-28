const { Sale, Tenant, FinancialEntry, sequelize } = require('../models');
const { Op } = require('sequelize');

class AdminController {
    async getGlobalStats(req, res) {
        try {
            // Check if user is admin (simplified for now, ideally check a superAdmin flag)
            // if (req.userRole !== 'admin') return res.status(403).json({ error: 'Access denied' });

            const today = new Date().toISOString().split('T')[0];

            // 1. Total Sales Today (Global)
            const globalTodaySales = await Sale.sum('final_amount', {
                where: { 
                    status: 'completed',
                    created_at: { [Op.gte]: today }
                }
            }) || 0;

            // 2. Sales per Store (Ranking)
            const salesPerStore = await Sale.findAll({
                attributes: [
                    'tenant_id',
                    [sequelize.fn('SUM', sequelize.col('Sale.final_amount')), 'total_sales'],
                    [sequelize.fn('COUNT', sequelize.col('Sale.id')), 'total_count']
                ],
                where: { status: 'completed' },
                include: [{ model: Tenant, as: 'tenant', attributes: ['name'] }],
                group: ['tenant_id', 'tenant.id'],
                order: [[sequelize.literal('total_sales'), 'DESC']]
            });

            // 3. Global Payroll Debt (Receivables)
            const globalPayrollDebt = await FinancialEntry.sum('amount', {
                where: { 
                    type: 'receivable',
                    category: 'Venda Convênio',
                    status: 'pending'
                }
            }) || 0;

            // 4. Debt per Store
            const debtPerStore = await FinancialEntry.findAll({
                attributes: [
                    'tenant_id',
                    [sequelize.fn('SUM', sequelize.col('amount')), 'total_debt']
                ],
                where: { 
                    type: 'receivable',
                    category: 'Venda Convênio',
                    status: 'pending'
                },
                include: [{ model: Tenant, as: 'tenant', attributes: ['name'] }],
                group: ['tenant_id', 'tenant.id']
            });

            // 5. Total Store Count
            const totalStores = await Tenant.count();

            return res.json({
                globalTodaySales,
                salesPerStore,
                globalPayrollDebt,
                debtPerStore,
                totalStores
            });
        } catch (error) {
            console.error('AdminController getGlobalStats error:', error);
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new AdminController();
