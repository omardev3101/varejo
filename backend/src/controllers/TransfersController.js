const { ProductTransfer, ProductTransferItem, Product, InventoryBatch, Tenant, User, sequelize } = require('../models');

class TransfersController {
    async listTransfers(req, res) {
        try {
            const tenant_id = req.tenantId;
            const { type } = req.query; // 'outgoing', 'incoming', or 'all'

            let whereCondition = {};
            if (type === 'outgoing') {
                whereCondition = { origin_tenant_id: tenant_id };
            } else if (type === 'incoming') {
                whereCondition = { destination_tenant_id: tenant_id };
            } else {
                whereCondition = {
                    [sequelize.Sequelize.Op.or]: [
                        { origin_tenant_id: tenant_id },
                        { destination_tenant_id: tenant_id }
                    ]
                };
            }

            const transfers = await ProductTransfer.findAll({
                where: whereCondition,
                include: [
                    { model: Tenant, as: 'origin_tenant', attributes: ['id', 'name', 'cnpj'] },
                    { model: Tenant, as: 'destination_tenant', attributes: ['id', 'name', 'cnpj'] },
                    { model: User, as: 'user', attributes: ['id', 'name'] },
                    { model: User, as: 'receiver', attributes: ['id', 'name'] },
                    {
                        model: ProductTransferItem,
                        as: 'items',
                        include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'ean'] }]
                    }
                ],
                order: [['created_at', 'DESC']]
            });

            return res.json(transfers);
        } catch (error) {
            console.error('Error listing transfers:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    async createTransfer(req, res) {
        const t = await sequelize.transaction();
        try {
            const origin_tenant_id = req.tenantId;
            const user_id = req.userId;
            const { destination_tenant_id, cfop, notes, items } = req.body;

            if (Number(origin_tenant_id) === Number(destination_tenant_id)) {
                await t.rollback();
                return res.status(400).json({ error: 'A unidade de destino deve ser diferente da unidade de origem' });
            }

            if (!items || !Array.isArray(items) || items.length === 0) {
                await t.rollback();
                return res.status(400).json({ error: 'Nenhum item informado para transferência' });
            }

            let total_amount = 0;
            items.forEach(item => {
                total_amount += Number(item.total_price || (item.quantity * item.unit_price));
            });

            const transfer = await ProductTransfer.create({
                origin_tenant_id,
                destination_tenant_id,
                user_id,
                status: 'in_transit',
                cfop: cfop || '5151',
                notes: notes || '',
                total_amount,
                fiscal_status: 'draft',
                dispatched_at: new Date()
            }, { transaction: t });

            for (const item of items) {
                await ProductTransferItem.create({
                    transfer_id: transfer.id,
                    product_id: item.product_id,
                    batch_number: item.batch_number || null,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total_price: item.total_price || (item.quantity * item.unit_price)
                }, { transaction: t });

                // Baixa estoque na origem
                const originProduct = await Product.findOne({
                    where: { id: item.product_id, tenant_id: origin_tenant_id },
                    transaction: t
                });

                if (originProduct) {
                    await originProduct.decrement('stock_qty', { by: item.quantity, transaction: t });

                    if (item.batch_number) {
                        const batch = await InventoryBatch.findOne({
                            where: { product_id: originProduct.id, batch_number: item.batch_number },
                            transaction: t
                        });
                        if (batch) {
                            await batch.decrement('quantity', { by: Math.min(batch.quantity, item.quantity), transaction: t });
                        }
                    }
                }
            }

            await t.commit();

            const created = await ProductTransfer.findOne({
                where: { id: transfer.id },
                include: [
                    { model: Tenant, as: 'origin_tenant' },
                    { model: Tenant, as: 'destination_tenant' },
                    { model: User, as: 'user' },
                    { model: ProductTransferItem, as: 'items', include: [{ model: Product, as: 'product' }] }
                ]
            });

            return res.status(201).json(created);
        } catch (error) {
            await t.rollback();
            console.error('Error creating transfer:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    async receiveTransfer(req, res) {
        const t = await sequelize.transaction();
        try {
            const { transferId } = req.params;
            const destination_tenant_id = req.tenantId;
            const received_by = req.userId;

            const transfer = await ProductTransfer.findOne({
                where: { id: transferId, destination_tenant_id },
                include: [
                    {
                        model: ProductTransferItem,
                        as: 'items',
                        include: [{ model: Product, as: 'product' }]
                    }
                ],
                transaction: t
            });

            if (!transfer) {
                await t.rollback();
                return res.status(404).json({ error: 'Transferência não encontrada ou você não tem permissão para receber' });
            }

            if (transfer.status !== 'in_transit') {
                await t.rollback();
                return res.status(400).json({ error: `Transferência não está em trânsito (status atual: ${transfer.status})` });
            }

            // Dar entrada de estoque na unidade de destino
            for (const item of transfer.items) {
                const origProduct = item.product;

                // Procurar produto equivalente na unidade destino (por EAN ou Nome)
                let destProduct = null;
                if (origProduct.ean) {
                    destProduct = await Product.findOne({
                        where: {
                            tenant_id: destination_tenant_id,
                            ean: origProduct.ean
                        },
                        transaction: t
                    });
                }

                if (!destProduct) {
                    destProduct = await Product.findOne({
                        where: {
                            tenant_id: destination_tenant_id,
                            name: origProduct.name
                        },
                        transaction: t
                    });
                }

                if (!destProduct) {
                    // Se não existir, clona o produto para o novo tenant
                    destProduct = await Product.create({
                        tenant_id: destination_tenant_id,
                        ean: origProduct.ean,
                        name: origProduct.name,
                        category_id: origProduct.category_id,
                        section: origProduct.section,
                        section_code: origProduct.section_code,
                        price: origProduct.price,
                        cost: origProduct.cost,
                        stock_qty: item.quantity,
                        min_stock: origProduct.min_stock,
                        unit: origProduct.unit || 'UN'
                    }, { transaction: t });
                } else {
                    await destProduct.increment('stock_qty', { by: item.quantity, transaction: t });
                }

                // Dar entrada no lote
                const batchNum = item.batch_number || 'TR-LOTE-' + Date.now();
                let destBatch = await InventoryBatch.findOne({
                    where: { product_id: destProduct.id, batch_number: batchNum },
                    transaction: t
                });
                if (destBatch) {
                    await destBatch.increment('quantity', { by: item.quantity, transaction: t });
                } else {
                    await InventoryBatch.create({
                        product_id: destProduct.id,
                        batch_number: batchNum,
                        quantity: item.quantity,
                        expiry_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        cost_price: destProduct.cost || 0
                    }, { transaction: t });
                }
            }

            await transfer.update({
                status: 'received',
                received_by,
                received_at: new Date()
            }, { transaction: t });

            await t.commit();

            return res.json({ message: 'Transferência recebida com sucesso e estoque atualizado!', transfer });
        } catch (error) {
            await t.rollback();
            console.error('Error receiving transfer:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    async emitTransferNF(req, res) {
        try {
            const { transferId } = req.params;
            const tenant_id = req.tenantId;

            const transfer = await ProductTransfer.findOne({
                where: {
                    id: transferId,
                    [sequelize.Sequelize.Op.or]: [
                        { origin_tenant_id: tenant_id },
                        { destination_tenant_id: tenant_id }
                    ]
                }
            });

            if (!transfer) {
                return res.status(404).json({ error: 'Transferência não encontrada' });
            }

            if (transfer.fiscal_status === 'emitted') {
                return res.status(400).json({ error: 'NF-e de transferência já emitida' });
            }

            // Simulação de emissão SEFAZ
            await new Promise(resolve => setTimeout(resolve, 1500));

            const fiscalKey = '3526' + Math.random().toString().slice(2, 12) + '55001' + Math.random().toString().slice(2, 12) + '100000000';
            const protocol = '13526' + Math.random().toString().slice(2, 12);

            await transfer.update({
                fiscal_key: fiscalKey.slice(0, 44),
                fiscal_protocol: protocol.slice(0, 20),
                fiscal_status: 'emitted'
            });

            return res.json({
                message: 'NF-e de Transferência emitida com sucesso (Simulação SEFAZ)',
                fiscal_key: transfer.fiscal_key,
                fiscal_protocol: transfer.fiscal_protocol
            });
        } catch (error) {
            console.error('Error emitting transfer NF:', error);
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new TransfersController();
