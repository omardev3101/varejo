const { Category } = require('../models');

class CategoryController {
    async list(req, res) {
        try {
            console.log('Fetching categories for tenant:', req.tenantId);
            const whereClause = {};
            if (req.tenantId) whereClause.tenant_id = req.tenantId;

            const categories = await Category.findAll({
                where: whereClause
            });
            console.log('Categories found:', categories.length);
            return res.json(categories);
        } catch (error) {
            console.error('Error in CategoryController.list:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    async create(req, res) {
        try {
            let tenantId = req.tenantId;
            if (!tenantId) {
                const { Tenant } = require('../models');
                const firstTenant = await Tenant.findOne();
                if (firstTenant) tenantId = firstTenant.id;
            }

            const category = await Category.create({
                ...req.body,
                tenant_id: tenantId
            });
            return res.status(201).json(category);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }

    async update(req, res) {
        try {
            const whereClause = { id: req.params.id };
            if (req.tenantId) whereClause.tenant_id = req.tenantId;

            const category = await Category.findOne({
                where: whereClause
            });

            if (!category) {
                return res.status(404).json({ error: 'Category not found' });
            }

            await category.update(req.body);
            return res.json(category);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }

    async delete(req, res) {
        try {
            const whereClause = { id: req.params.id };
            if (req.tenantId) whereClause.tenant_id = req.tenantId;

            const category = await Category.findOne({
                where: whereClause
            });

            if (!category) {
                return res.status(404).json({ error: 'Category not found' });
            }

            await category.destroy();
            return res.status(204).send();
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new CategoryController();
