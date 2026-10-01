const { Customer, Product, Order, OrderItem, Category, Tenant, StoreConfig } = require('../models');
const coraPixService = require('../services/CoraPixService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const emailService = require('../services/EmailService');
const { Op } = require('sequelize');

class SocioController {
    // ... rest of methods
    // 5. Public Storefront Products List (Fetch all products from inventory filtered by selected sections)
    async listPublicProducts(req, res) {
        try {
            // Check allowed sections from StoreConfig
            const storeConfig = await StoreConfig.findOne();
            const allowedSections = storeConfig?.allowed_sections_json || [];

            const whereClause = {};
            if (Array.isArray(allowedSections) && allowedSections.length > 0) {
                whereClause[Op.or] = [
                    { section_code: { [Op.in]: allowedSections } },
                    { section: { [Op.in]: allowedSections } },
                    { section_code: null },
                    { section: null }
                ];
            }

            let products = await Product.findAll({
                where: whereClause,
                include: [
                    { model: Category, as: 'category_rel', attributes: ['name'], required: false }
                ],
                order: [['name', 'ASC']]
            });

            // If no products matched due to unassigned section fields, return all products as fallback
            if (products.length === 0) {
                products = await Product.findAll({
                    include: [
                        { model: Category, as: 'category_rel', attributes: ['name'], required: false }
                    ],
                    order: [['name', 'ASC']]
                });
            }

            const formatted = products.map(p => {
                const plain = p.get({ plain: true });
                if (plain.category_rel) {
                    plain.category = plain.category_rel;
                } else if (typeof plain.category === 'string') {
                    plain.category = { name: plain.category };
                } else if (!plain.category) {
                    plain.category = { name: 'Produtos' };
                }
                return plain;
            });

            return res.json(formatted);
        } catch (error) {
            console.error('List Public Products Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    // Public Storefront Config
    async getPublicStoreConfig(req, res) {
        try {
            const config = await StoreConfig.findOne();
            if (!config) {
                return res.json({
                    store_name: 'VarejoPro - Sua Loja Online',
                    slogan: 'Produtos, Higiene e Beleza com Entrega Rápida',
                    whatsapp: '(11) 99999-8888',
                    announcement_text: '🚚 Frete Grátis em compras acima de R$ 50,00 | 💊 Produtos com até 50% de Desconto',
                    free_shipping_min: 50.00,
                    opening_hours: 'Segunda a Sábado: 07:00 às 22:00 | Domingos: 08:00 às 18:00',
                    banners_json: [],
                    allowed_sections_json: []
                });
            }
            return res.json(config);
        } catch (error) {
            console.error('Get Public Storefront Config Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    // 1. Verify if socio exists by CPF or Matrícula (external_id)
    async checkSocio(req, res) {
        try {
            const { identifier } = req.body;
            if (!identifier) {
                return res.status(400).json({ error: 'Informe o CPF ou Matrícula do Sócio' });
            }

            const cleanId = identifier.replace(/\D/g, '');
            const customer = await Customer.findOne({
                where: {
                    [Op.or]: [
                        { cpf: cleanId },
                        { external_id: identifier }
                    ]
                }
            });

            if (!customer) {
                return res.json({
                    exists: false,
                    is_new: true
                });
            }

            return res.json({
                exists: true,
                id: customer.id,
                name: customer.name,
                cpf: customer.cpf,
                external_id: customer.external_id,
                email: customer.email || '',
                phone: customer.phone || '',
                garage: customer.garage || '',
                has_password: !!customer.password,
                email_verified: !!customer.email_verified
            });
        } catch (error) {
            console.error('Check Socio Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    // 2. Complete Profile & Register Password (First Access)
    async completeProfileAndRegister(req, res) {
        try {
            const { 
                identifier, 
                name,
                phone, 
                email, 
                address, 
                number, 
                neighborhood, 
                city, 
                state, 
                zip_code, 
                garage, 
                authorized_persons, 
                password 
            } = req.body;

            if (!identifier || !email || !password) {
                return res.status(400).json({ error: 'CPF, E-mail e Senha são obrigatórios' });
            }

            const cleanId = identifier.replace(/\D/g, '');
            let customer = await Customer.findOne({
                where: {
                    [Op.or]: [
                        { cpf: identifier },
                        { cpf: cleanId },
                        { external_id: identifier }
                    ]
                }
            });

            if (!customer) {
                customer = await Customer.create({
                    tenant_id: 1,
                    name: name || 'Novo Cliente',
                    cpf: cleanId,
                    email: email,
                    phone: phone,
                    status: 'ativo'
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const activationCode = Math.floor(100000 + Math.random() * 900000).toString();
            const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

            customer.password = hashedPassword;
            customer.email = email;
            if (phone) customer.phone = phone;
            if (garage) customer.garage = garage;
            if (address) customer.address = address;
            if (number) customer.number = number;
            if (neighborhood) customer.neighborhood = neighborhood;
            if (city) customer.city = city;
            if (state) customer.state = state;
            if (zip_code) customer.zip_code = zip_code;
            if (authorized_persons) customer.authorized_persons = authorized_persons;

            customer.activation_code = activationCode;
            customer.activation_expires = expires;
            customer.email_verified = false;

            await customer.save();

            // Send activation email
            await emailService.sendActivationEmail(email, customer.name, activationCode);

            return res.json({
                success: true,
                message: 'Informações salvas com sucesso! Enviamos um código de ativação de 6 dígitos para o seu e-mail.',
                email: customer.email,
                // In dev mode / fallback, provide code preview for smooth testing
                activation_code_preview: activationCode
            });
        } catch (error) {
            console.error('Register Password Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    // 3. Verify 6-digit Code & Activate Password
    async verifyEmailAndActivate(req, res) {
        try {
            const { identifier, code } = req.body;
            if (!identifier || !code) {
                return res.status(400).json({ error: 'CPF/Matrícula e Código são obrigatórios' });
            }

            const cleanId = identifier.replace(/\D/g, '');
            const customer = await Customer.findOne({
                where: {
                    [Op.or]: [
                        { cpf: identifier },
                        { cpf: cleanId },
                        { external_id: identifier }
                    ]
                }
            });

            if (!customer) {
                return res.status(404).json({ error: 'Sócio não encontrado' });
            }

            if (customer.email_verified) {
                return res.json({ success: true, message: 'Cadastro já ativado anteriormente' });
            }

            if (customer.activation_code !== code.trim()) {
                return res.status(400).json({ error: 'Código de ativação incorreto. Verifique seu e-mail.' });
            }

            if (customer.activation_expires && new Date() > new Date(customer.activation_expires)) {
                return res.status(400).json({ error: 'Código de ativação expirou. Solicite um novo código.' });
            }

            customer.email_verified = true;
            customer.activation_code = null;
            customer.activation_expires = null;
            await customer.save();

            const token = jwt.sign(
                { socioId: customer.id, cpf: customer.cpf, name: customer.name, role: 'socio' },
                process.env.JWT_SECRET || 'farma_bus_secret_key_2024',
                { expiresIn: '7d' }
            );

            const limit = Number(customer.credit_limit || 0);
            const debt = Number(customer.current_debt || 0);
            const availableLimit = Math.max(0, limit - debt);

            return res.json({
                success: true,
                message: 'Conta de Sócio ativada com sucesso!',
                token,
                socio: {
                    id: customer.id,
                    name: customer.name,
                    cpf: customer.cpf,
                    external_id: customer.external_id,
                    email: customer.email,
                    phone: customer.phone,
                    garage: customer.garage,
                    credit_limit: limit,
                    current_debt: debt,
                    available_limit: availableLimit
                }
            });
        } catch (error) {
            console.error('Verify Email Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    // 4. Socio Login
    async login(req, res) {
        try {
            const { identifier, password } = req.body;
            if (!identifier || !password) {
                return res.status(400).json({ error: 'Informe CPF/Matrícula e Senha' });
            }

            const cleanId = identifier.replace(/\D/g, '');
            const customer = await Customer.findOne({
                where: {
                    [Op.or]: [
                        { cpf: identifier },
                        { cpf: cleanId },
                        { external_id: identifier }
                    ]
                }
            });

            if (!customer || !customer.password) {
                return res.status(401).json({ error: 'Credenciais inválidas ou senha ainda não cadastrada.' });
            }

            const isValid = await bcrypt.compare(password, customer.password);
            if (!isValid) {
                return res.status(401).json({ error: 'Senha incorreta.' });
            }

            if (!customer.email_verified) {
                return res.status(403).json({ 
                    error: 'Sua conta ainda não foi ativada. Digite o código de 6 dígitos enviado para seu e-mail.',
                    needs_verification: true,
                    email: customer.email
                });
            }

            const token = jwt.sign(
                { socioId: customer.id, cpf: customer.cpf, name: customer.name, role: 'socio' },
                process.env.JWT_SECRET || 'farma_bus_secret_key_2024',
                { expiresIn: '7d' }
            );

            const limit = Number(customer.credit_limit || 0);
            const debt = Number(customer.current_debt || 0);
            const availableLimit = Math.max(0, limit - debt);

            return res.json({
                token,
                socio: {
                    id: customer.id,
                    name: customer.name,
                    cpf: customer.cpf,
                    external_id: customer.external_id,
                    email: customer.email,
                    phone: customer.phone,
                    address: customer.address,
                    garage: customer.garage,
                    authorized_persons: customer.authorized_persons || [],
                    credit_limit: limit,
                    current_debt: debt,
                    available_limit: availableLimit
                }
            });
        } catch (error) {
            console.error('Socio Login Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    // 6. Public PIX Checkout (Accessible to Anyone: Socio or Non-Socio)
    async checkoutPix(req, res) {
        try {
            const { socioId, buyer_name, buyer_phone, items, delivery_type, delivery_address, total_amount, garage } = req.body;
            if (!items || items.length === 0) {
                return res.status(400).json({ error: 'Carrinho de compras está vazio' });
            }

            let customerName = buyer_name || 'Cliente Online';
            let customerId = 'PIX-ONLINE';
            let targetGarage = garage || 'Retirada / Geral';
            let targetAddress = delivery_type === 'address' ? (delivery_address || 'Entrega em Domicílio') : 'Retirada na Loja Central';
            let targetTenantId = null;

            // If socio is logged in, attach socio details
            const targetSocioId = socioId || req.socioId;
            if (targetSocioId) {
                const customer = await Customer.findByPk(targetSocioId);
                if (customer) {
                    customerName = customer.name;
                    customerId = customer.cpf || customer.external_id || `SOCIO-${customer.id}`;
                    targetGarage = customer.garage || targetGarage;
                    targetTenantId = customer.tenant_id;
                    if (delivery_type === 'address' && !delivery_address) {
                        targetAddress = customer.address || targetAddress;
                    }
                }
            }

            if (!targetTenantId) {
                const firstTenant = await Tenant.findOne();
                targetTenantId = firstTenant ? firstTenant.id : null;
            }

            const now = new Date();
            const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
            const randSuffix = Math.floor(1000 + Math.random() * 9000);
            const order_number = `SOL-${dateStr}-${randSuffix}`;

            // Generate PIX Copia e Cola Payload Code (Default Bacen format / Cora mTLS API)
            let pixCode = `00020126580014BR.GOV.BCB.PIX0136varejo-pix-${order_number}520400005303986540${Number(total_amount).toFixed(2)}5802BR5915VAREJOPRO ONLINE6009SAO PAULO62070503***6304`;

            try {
                const activePixConfig = await coraPixService.getConfig(targetTenantId);
                if (activePixConfig && activePixConfig.active && activePixConfig.cert_pem && activePixConfig.key_pem) {
                    const coraCob = await coraPixService.createImmediateCharge(activePixConfig, {
                        orderNumber: order_number,
                        totalAmount: total_amount,
                        associateName: customerName,
                        associateCpf: customerId
                    });
                    if (coraCob && coraCob.pix_code) {
                        pixCode = coraCob.pix_code;
                    }
                }
            } catch (coraErr) {
                console.error('Cora Immediate Charge Fallback Warning:', coraErr);
            }

            const order = await Order.create({
                order_number,
                associate_name: customerName,
                associate_id: customerId,
                tenant_id: targetTenantId,
                total_amount: Number(total_amount),
                status: 'authorized',
                source: 'loja_online_pix',
                garage: targetGarage,
                delivery_address: targetAddress,
                payment_method: 'pix',
                pix_code: pixCode,
                received_at: now
            });

            for (const item of items) {
                await OrderItem.create({
                    order_id: order.id,
                    product_id: item.id,
                    quantity: item.quantity,
                    price_at_order: Number(item.price || item.unit_price || 0)
                });
            }

            return res.json({
                success: true,
                order_number: order.order_number,
                total_amount: order.total_amount,
                payment_method: 'pix',
                pix_code: pixCode,
                garage: order.garage,
                delivery_address: order.delivery_address
            });
        } catch (error) {
            console.error('Checkout PIX Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    // 7. Socio Payroll Discount Checkout (Exclusivo para Sócios Autenticados com Validação de Limite)
    async checkoutPayroll(req, res) {
        try {
            const { socioId, items, delivery_type, delivery_address, total_amount } = req.body;
            const targetSocioId = socioId || req.socioId;

            if (!targetSocioId) {
                return res.status(401).json({ error: 'Você precisa estar logado como Sócio para utilizar o Desconto em Folha.' });
            }

            if (!items || items.length === 0) {
                return res.status(400).json({ error: 'Carrinho de compras está vazio' });
            }

            const customer = await Customer.findByPk(targetSocioId);
            if (!customer) {
                return res.status(404).json({ error: 'Cadastro de Sócio não localizado.' });
            }

            const limit = Number(customer.credit_limit || 0);
            const debt = Number(customer.current_debt || 0);
            const availableLimit = Math.max(0, limit - debt);
            const orderTotal = Number(total_amount);

            if (orderTotal > availableLimit) {
                return res.status(400).json({ 
                    error: `Saldo de limite de crédito insuficiente para esta compra. Limite disponível: R$ ${availableLimit.toFixed(2)}. Valor do pedido: R$ ${orderTotal.toFixed(2)}.` 
                });
            }

            // Deduct limit / increase debt
            customer.current_debt = debt + orderTotal;
            await customer.save();

            const now = new Date();
            const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
            const randSuffix = Math.floor(1000 + Math.random() * 9000);
            const order_number = `SOL-FOLHA-${dateStr}-${randSuffix}`;

            let payrollTenantId = customer.tenant_id;
            if (!payrollTenantId) {
                const firstTenant = await Tenant.findOne();
                payrollTenantId = firstTenant ? firstTenant.id : null;
            }

            const order = await Order.create({
                order_number,
                associate_name: customer.name,
                associate_id: customer.cpf || customer.external_id,
                tenant_id: payrollTenantId,
                total_amount: orderTotal,
                status: 'authorized',
                source: 'desconto_folha_socio',
                garage: customer.garage || 'Garagem Geral',
                delivery_address: delivery_type === 'address' ? (delivery_address || customer.address) : 'Retirada na Loja Central',
                payment_method: 'desconto_folha',
                received_at: now
            });

            for (const item of items) {
                await OrderItem.create({
                    order_id: order.id,
                    product_id: item.id,
                    quantity: item.quantity,
                    price_at_order: Number(item.price || item.unit_price || 0)
                });
            }

            return res.json({
                success: true,
                order_number: order.order_number,
                total_amount: order.total_amount,
                payment_method: 'desconto_folha',
                garage: order.garage,
                delivery_address: order.delivery_address,
                remaining_limit: (limit - customer.current_debt)
            });
        } catch (error) {
            console.error('Checkout Payroll Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    async getOrderStatus(req, res) {
        try {
            const { orderNumber } = req.params;
            const order = await Order.findOne({ where: { order_number: orderNumber } });
            if (!order) {
                return res.status(404).json({ error: 'Pedido não encontrado' });
            }
            return res.json({
                order_number: order.order_number,
                status: order.status,
                total_amount: order.total_amount,
                garage: order.garage,
                updatedAt: order.updatedAt
            });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new SocioController();
