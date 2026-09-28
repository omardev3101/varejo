const { Order, OrderItem, Product, Tenant, FinancialEntry } = require('../models');

class ExpeditionController {
    async confirmPixPayment(req, res) {
        try {
            const { id } = req.params;
            const order = await Order.findByPk(id, {
                include: [{ model: OrderItem, as: 'items' }]
            });

            if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });

            const now = new Date();
            order.status = 'separating';
            order.separation_started_at = now;
            await order.save();

            // Create income entry in FinancialEntry for this PIX payment
            try {
                await FinancialEntry.create({
                    tenant_id: order.tenant_id || 1,
                    type: 'RECEITA',
                    description: `Pagamento PIX Confirmado - Pedido ${order.order_number} (${order.associate_name})`,
                    amount: order.total_amount,
                    category: 'Vendas Loja Virtual PIX',
                    payment_method: 'PIX',
                    due_date: now,
                    paid_at: now,
                    status: 'PAID'
                });
            } catch (fErr) {
                console.error('Financial Entry Creation Warning:', fErr);
            }

            return res.json({ success: true, message: 'Pagamento PIX confirmado! Pedido liberado para Separação.', order });
        } catch (error) {
            console.error('Confirm PIX Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    async cancelOrder(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            const order = await Order.findByPk(id);
            if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });

            order.status = 'canceled';
            await order.save();

            return res.json({ success: true, message: 'Pedido cancelado com sucesso.', order });
        } catch (error) {
            console.error('Cancel Order Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    async listOrders(req, res) {
        try {
            const { status } = req.query;
            const where = {};
            if (status) where.status = status;

            const orders = await Order.findAll({
                where,
                include: [
                    { model: Tenant, as: 'tenant', attributes: ['id', 'name'] },
                    { 
                        model: OrderItem, 
                        as: 'items',
                        include: [{ model: Product, as: 'product' }]
                    }
                ],
                order: [['createdAt', 'DESC']]
            });
            res.json(orders);
        } catch (error) {
            console.error('Expedition Error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            const order = await Order.findByPk(id);
            if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });

            const now = new Date();
            if (status === 'separating' && !order.separation_started_at) {
                order.separation_started_at = now;
            } else if (status === 'packed' && !order.separation_finished_at) {
                order.separation_finished_at = now;
            } else if (status === 'shipped' && !order.shipping_started_at) {
                order.shipping_started_at = now;
            } else if (status === 'delivered' && !order.delivered_at) {
                order.delivered_at = now;
            }

            order.status = status;
            await order.save();

            res.json(order);
        } catch (error) {
            console.error('Expedition Error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async getOrderLabel(req, res) {
        try {
            const { id } = req.params;
            const order = await Order.findByPk(id, {
                include: [{ model: Tenant, as: 'tenant', attributes: ['name'] }]
            });

            if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });

            // Generate label data (mocking QR code content)
            const labelData = {
                order_number: order.order_number,
                associate_name: order.associate_name,
                destination: order.tenant.name,
                qr_content: `ORDER:${order.order_number}|ASSOC:${order.associate_id}|TENANT:${order.tenant_id}`,
                print_date: new Date().toISOString()
            };

            res.json(labelData);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Mock endpoint for Sindmotoristas integration
    async createExternalOrder(req, res) {
        try {
            const { order_number, associate_name, associate_id, tenant_id, items, total_amount } = req.body;

            const order = await Order.create({
                order_number,
                associate_name,
                associate_id,
                tenant_id,
                total_amount,
                status: 'authorized',
                received_at: new Date()
            });

            if (items && items.length > 0) {
                for (const item of items) {
                    await OrderItem.create({
                        order_id: order.id,
                        product_id: item.product_id,
                        quantity: item.quantity,
                        price_at_order: item.price
                    });
                }
            }

            res.status(201).json(order);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    // Endpoint for Mobile App
    async createMobileOrder(req, res) {
        try {
            const { items, total_amount } = req.body;
            const customerId = req.userId; // From customer token
            const tenantId = req.tenantId;

            const { Customer } = require('../models');
            const customer = await Customer.findByPk(customerId);
            
            if (!customer) throw new Error('Cliente não encontrado');

            // Generate order number
            const order_number = `MOB-${Date.now().toString().slice(-6)}-${customerId}`;

            const order = await Order.create({
                order_number,
                associate_name: customer.name,
                associate_id: customer.external_id || customer.cpf,
                tenant_id: tenantId,
                total_amount,
                status: 'authorized',
                received_at: new Date(),
                source: 'mobile_app'
            });

            if (items && items.length > 0) {
                for (const item of items) {
                    await OrderItem.create({
                        order_id: order.id,
                        product_id: item.product_id,
                        quantity: item.quantity,
                        price_at_order: item.price
                    });
                }
            }

            res.status(201).json(order);
        } catch (error) {
            console.error('Mobile Order Error:', error);
            res.status(500).json({ error: error.message });
        }
    }
    // Endpoint for Mobile App to get their own orders
    async getMyOrders(req, res) {
        try {
            const customerId = req.userId; // From customer token
            
            const { Customer } = require('../models');
            const customer = await Customer.findByPk(customerId);
            if (!customer) return res.status(404).json({ error: 'Cliente não encontrado' });

            const orders = await Order.findAll({
                where: { 
                    tenant_id: req.tenantId,
                    associate_id: customer.external_id || customer.cpf
                },
                include: [
                    { 
                        model: OrderItem, 
                        as: 'items',
                        include: [{ model: Product, as: 'product', attributes: ['name', 'ean'] }]
                    }
                ],
                order: [['createdAt', 'DESC']]
            });

            res.json(orders);
        } catch (error) {
            console.error('My Orders Error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new ExpeditionController();
