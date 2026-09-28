const { Tenant, Sale, SaleItem, Product, Customer, Category, sequelize } = require('../models');
const { Op } = require('sequelize');

class DashboardController {
    async getStats(req, res) {
        console.log('DashboardController.getStats reached. Tenant:', req.tenantId);
        try {
            let tenant_id = req.tenantId;

            // Fallback for superadmin/admin without tenant_id to use first tenant's data
            if (!tenant_id && (req.userRole === 'superadmin' || req.userRole === 'admin')) {
                const firstTenant = await Tenant.findOne();
                if (firstTenant) {
                    tenant_id = firstTenant.id;
                }
            }

            // 1. Total Sales (Today)
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const totalSalesToday = await Sale.sum('final_amount', {
                where: {
                    tenant_id,
                    status: { [Op.ne]: 'cancelled' },
                    created_at: { [Op.gte]: today }
                }
            }) || 0;

            const salesCountToday = await Sale.count({
                where: {
                    tenant_id,
                    status: { [Op.ne]: 'cancelled' },
                    created_at: { [Op.gte]: today }
                }
            });

            // 2. Sales by Payment Method (non-cancelled)
            const salesByMethod = await Sale.findAll({
                attributes: [
                    'payment_method',
                    [sequelize.fn('SUM', sequelize.col('final_amount')), 'total']
                ],
                where: {
                    tenant_id,
                    status: { [Op.ne]: 'cancelled' }
                },
                group: ['payment_method']
            });

            // 3. Low Stock Products
            const lowStock = await Product.count({
                where: {
                    tenant_id,
                    stock_qty: { [Op.lte]: 10 } // Threshold 10
                }
            });

            // 4. Total Payroll Debt
            const totalDebt = await Customer.sum('current_debt', {
                where: { tenant_id }
            }) || 0;

            // 5. Top Products (Best sellers, non-cancelled)
            const topProducts = await SaleItem.findAll({
                attributes: [
                    'product_id',
                    [sequelize.fn('SUM', sequelize.col('SaleItem.quantity')), 'total_qty']
                ],
                include: [
                    { model: Product, as: 'product_sale', attributes: ['name'] },
                    { model: Sale, as: 'sale', attributes: [], where: { tenant_id, status: { [Op.ne]: 'cancelled' } } }
                ],
                group: ['product_id', 'product_sale.id', 'product_sale.name'],
                order: [[sequelize.literal('total_qty'), 'DESC']],
                limit: 5
            });

            // 4. Total Pharmacies (for admin context)
            const tenantCount = await Tenant.count();

            return res.json({
                today: {
                    total: totalSalesToday,
                    count: salesCountToday
                },
                salesByMethod,
                lowStock,
                totalDebt,
                topProducts,
                tenantCount
            });

        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new DashboardController();
