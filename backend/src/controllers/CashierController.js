const { CashierSession, CashierTransaction, Sale, Terminal, sequelize } = require('../models');
const { Op } = require('sequelize');

class CashierController {
    async openSession(req, res) {
        try {
            const { opening_balance, terminal_id, tenant_id: requestedTenantId } = req.body;
            const user_id = req.userId;

            if (!terminal_id) {
                return res.status(400).json({ error: 'O terminal é obrigatório para abrir o caixa' });
            }

            // Check if terminal exists
            const terminal = await Terminal.findByPk(terminal_id);

            if (!terminal) {
                return res.status(404).json({ error: 'Terminal não encontrado' });
            }

            let tenant_id = terminal.tenant_id;
            if (requestedTenantId && (req.userRole === 'superadmin' || req.userRole === 'admin')) {
                tenant_id = parseInt(requestedTenantId, 10);
            }

            // Check if user already has an open session
            const activeUserSession = await CashierSession.findOne({
                where: { tenant_id, user_id, status: 'open' }
            });

            if (activeUserSession) {
                return res.status(400).json({ error: 'Você já possui um caixa aberto' });
            }

            // Check if the terminal is already in use by someone else
            const activeTerminalSession = await CashierSession.findOne({
                where: { tenant_id, terminal_id, status: 'open' }
            });

            if (activeTerminalSession) {
                return res.status(400).json({ error: 'Este terminal já está em uso por outro operador' });
            }

            const session = await CashierSession.create({
                tenant_id,
                user_id,
                terminal_id,
                opening_balance: opening_balance || 0,
                expected_balance: opening_balance || 0,
                status: 'open'
            });

            return res.status(201).json(session);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async getActiveSession(req, res) {
        try {
            const whereClause = { 
                user_id: req.userId, 
                status: 'open' 
            };
            
            if (req.userRole !== 'superadmin') {
                whereClause.tenant_id = req.tenantId;
            }

            const session = await CashierSession.findOne({
                where: whereClause,
                include: [
                    { model: CashierTransaction, as: 'transactions' },
                    { model: Terminal, as: 'terminal' }
                ]
            });

            return res.json(session);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async addTransaction(req, res) {
        const t = await sequelize.transaction();
        try {
            const { type, amount, description, payment_method = 'cash' } = req.body;
            const { sessionId } = req.params;

            const session = await CashierSession.findByPk(sessionId, { transaction: t });
            if (!session || session.status === 'closed') {
                throw new Error('Caixa não encontrado ou já fechado');
            }

            const transaction = await CashierTransaction.create({
                cashier_session_id: sessionId,
                type,
                amount,
                description,
                payment_method
            }, { transaction: t });

            // Update expected balance
            let adjustment = 0;
            if (type === 'inflow' || type === 'sale' || type === 'addition') {
                adjustment = amount;
            } else if (type === 'discount') {
                adjustment = 0; // Discounts don't change physical drawer balance
            } else {
                adjustment = -amount; // withdrawal, outflow, cancellation
            }
            await session.increment('expected_balance', { by: adjustment, transaction: t });

            await t.commit();
            return res.status(201).json(transaction);
        } catch (error) {
            await t.rollback();
            return res.status(400).json({ error: error.message });
        }
    }

    async closeSession(req, res) {
        const t = await sequelize.transaction();
        try {
            const { sessionId } = req.params;
            const { closing_balance } = req.body;

            const session = await CashierSession.findByPk(sessionId, { transaction: t });
            if (!session || session.status === 'closed') {
                throw new Error('Caixa não encontrado ou já fechado');
            }

            await session.update({
                closing_balance,
                status: 'closed',
                closed_at: new Date()
            }, { transaction: t });

            await t.commit();
            return res.json({ message: 'Caixa fechado com sucesso', session });
        } catch (error) {
            await t.rollback();
            return res.status(400).json({ error: error.message });
        }
    }
}

module.exports = new CashierController();
