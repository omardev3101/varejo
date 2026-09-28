const { Customer, Sale, SaleItem, Product } = require('../models');
const { Op } = require('sequelize');

class CustomerController {
    async list(req, res) {
        try {
            const { search } = req.query;
            const whereClause = {};
            if (req.tenantId) {
                whereClause.tenant_id = req.tenantId;
            }
            if (search && search.trim() !== '') {
                const cleanSearch = search.trim();
                whereClause[Op.or] = [
                    { name: { [Op.like]: `%${cleanSearch}%` } },
                    { cpf: { [Op.like]: `%${cleanSearch}%` } },
                    { external_id: { [Op.like]: `%${cleanSearch}%` } }
                ];
            }
            const customers = await Customer.findAll({
                where: whereClause,
                limit: search ? 30 : 100,
                order: [['name', 'ASC']]
            });
            return res.json(customers);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async create(req, res) {
        try {
            const customer = await Customer.create({
                ...req.body,
                tenant_id: req.tenantId
            });
            return res.status(201).json(customer);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }

    async importSpreadsheet(req, res) {
        try {
            if (!req.files || !req.files.file) {
                return res.status(400).json({ error: 'Nenhum arquivo enviado' });
            }

            const xlsx = require('xlsx');
            const workbook = xlsx.read(req.files.file.data, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: false, defval: null });

            let tenantId = req.tenantId;
            if (!tenantId) {
                const { Tenant } = require('../models');
                const firstTenant = await Tenant.findOne();
                if (firstTenant) tenantId = firstTenant.id;
            }

            let importedCount = 0;
            let updatedCount = 0;
            let errors = [];

            let headerRowIndex = -1;
            let headers = [];

            // Localiza a linha de cabeçalho (que contém CPF)
            for (let i = 0; i < rawRows.length; i++) {
                const row = rawRows[i];
                if (!row) continue;
                
                const hasCPF = row.some(cell => cell && String(cell).toUpperCase().replace(/[^A-Z]/g, '') === 'CPF');
                if (hasCPF) {
                    headerRowIndex = i;
                    headers = row.map(cell => cell ? String(cell).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z]/g, '') : '');
                    break;
                }
            }

            if (headerRowIndex === -1) {
                return res.status(400).json({ error: 'Coluna C.P.F. não encontrada na planilha. Verifique o formato.' });
            }

            for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
                const row = rawRows[i];
                if (!row || !row.length) continue;

                // Mapeia array para objeto baseado no cabeçalho
                const normRow = {};
                for (let j = 0; j < headers.length; j++) {
                    if (headers[j]) {
                        normRow[headers[j]] = row[j];
                    }
                }

                const externalId = normRow['NREG'] ? String(normRow['NREG']).trim() : null;
                const name = normRow['NOMEDOFUNCIONARIO'] || normRow['NOME'] || null;
                const role = normRow['FUNCAO'] || null;
                const garage = normRow['EMPRESA'] || normRow['GARAGEM'] || normRow['EMPRESAGARAGEM'] || normRow['NOMEEMPRESA'] || normRow['FILIAL'] || null;
                let rawCpf = normRow['CPF'] || null;
                let rawDate = normRow['ADMISSAO'] || normRow['DATAADMISSAO'] || null;
                let condition = normRow['CONDICAO'] || normRow['STATUS'] || 'ATIVO';

                if (!name || !rawCpf) continue; // Pula linhas sem nome ou cpf

                const cpfRawNum = String(rawCpf).replace(/\D/g, '');
                const cpf = cpfRawNum.padStart(11, '0');
                if (cpf.length !== 11) {
                    errors.push(`Linha ${i+1}: CPF inválido (${rawCpf})`);
                    continue; 
                }

                let admission_date = null;
                if (rawDate) {
                    if (String(rawDate).includes('/')) {
                        const parts = String(rawDate).split('/');
                        if (parts.length === 3) {
                            admission_date = `${parts[2]}-${parts[1]}-${parts[0]}`;
                        }
                    } else if (String(rawDate).match(/^\d{4}-\d{2}-\d{2}/)) {
                        admission_date = rawDate.substring(0, 10);
                    }
                }

                const status = (String(condition).toUpperCase().includes('INATIV') || String(condition).toUpperCase().includes('DEMITID')) ? 'inativo' : 'ativo';

                try {
                    let customer = await Customer.findOne({
                        where: { tenant_id: req.tenantId, cpf }
                    });

                    if (customer) {
                        await customer.update({ name, role, garage: garage || customer.garage, admission_date, status, external_id: externalId || customer.external_id });
                        updatedCount++;
                    } else {
                        await Customer.create({
                            tenant_id: tenantId,
                            name,
                            cpf,
                            role,
                            garage,
                            admission_date,
                            status,
                            external_id: externalId
                        });
                        importedCount++;
                    }
                } catch (err) {
                    console.error("Erro no import: ", err.message);
                    errors.push(`Linha ${i+1} (${name}): ${err.message}`);
                }
            }

            console.log(`Importação terminada. Cadastrados: ${importedCount}, Atualizados: ${updatedCount}, Erros:`, errors);
            return res.json({ message: 'Importação concluída', importedCount, updatedCount, errors });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async importExternal(req, res) {
        try {
            const { data } = req.body;
            // Expected data format from external system (Sindmotoristas)
            // This can be an array or a single object
            const items = Array.isArray(data) ? data : [data];
            
            const results = [];
            for (const item of items) {
                // Map external fields to our Customer model
                const customerData = {
                    tenant_id: req.tenantId,
                    external_id: item.id || item.external_id,
                    external_type: item.type || 'sindmotoristas',
                    name: item.name,
                    nickname: item.nickname,
                    sex: item.sex,
                    birth_date: item.birth_date,
                    nationality: item.nationality,
                    birth_city: item.birth_city,
                    mother_name: item.mother_name,
                    cpf: item.cpf,
                    rg: item.rg,
                    rg_issuer: item.rg_issuer,
                    marital_status: item.marital_status,
                    zip_code: item.zip_code,
                    address: item.address,
                    number: item.number,
                    neighborhood: item.neighborhood,
                    city: item.city,
                    state: item.state,
                    phone: item.phone,
                    email: item.email,
                    status: item.status || 'ativo',
                    image_base64: item.image_base64
                };

                // Check if already exists (by CPF or external_id)
                let customer = await Customer.findOne({
                    where: { 
                        tenant_id: req.tenantId,
                        [require('sequelize').Op.or]: [
                            { cpf: item.cpf },
                            { external_id: item.id || item.external_id }
                        ]
                    }
                });

                if (customer) {
                    await customer.update(customerData);
                } else {
                    customer = await Customer.create(customerData);
                }
                results.push(customer);
            }

            return res.json({ message: `${results.length} customers processed`, results });
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }

    async update(req, res) {
        try {
            const whereClause = { id: req.params.id };
            if (req.tenantId) whereClause.tenant_id = req.tenantId;
            
            const customer = await Customer.findOne({ where: whereClause });
            if (!customer) return res.status(404).json({ error: 'Customer not found' });
            await customer.update(req.body);
            return res.json(customer);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }

    async delete(req, res) {
        try {
            const whereClause = { id: req.params.id };
            if (req.tenantId) whereClause.tenant_id = req.tenantId;
            
            const customer = await Customer.findOne({ where: whereClause });
            if (!customer) return res.status(404).json({ error: 'Customer not found' });
            await customer.destroy();
            return res.status(204).send();
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async getPurchaseReport(req, res) {
        try {
            const { start_date, end_date, customer_id } = req.query;
            const tenant_id = req.tenantId;

            const whereSale = { tenant_id };

            if (customer_id && customer_id !== 'all') {
                whereSale.customer_id = Number(customer_id);
            }

            if (start_date || end_date) {
                const startStr = start_date || '2020-01-01';
                const endStr = end_date || new Date().toISOString().split('T')[0];

                const startDateObj = new Date(`${startStr}T00:00:00.000Z`);
                const endDateObj = new Date(`${endStr}T23:59:59.999Z`);
                endDateObj.setDate(endDateObj.getDate() + 1);

                whereSale.createdAt = { [Op.between]: [startDateObj, endDateObj] };
            }

            const sales = await Sale.findAll({
                where: whereSale,
                include: [
                    { model: Customer, as: 'customer', attributes: ['id', 'name', 'cpf', 'credit_limit', 'current_debt', 'external_id'] },
                    { 
                        model: SaleItem, 
                        as: 'items', 
                        include: [{ model: Product, as: 'product_sale', attributes: ['id', 'name', 'ean'] }] 
                    }
                ],
                order: [['createdAt', 'DESC']]
            });

            const customerMap = {};
            let totalAmountAll = 0;
            let totalDiscountAll = 0;

            sales.forEach(sale => {
                const total = Number(sale.final_amount || sale.total_amount || 0);
                const disc = Number(sale.discount_amount || 0);
                totalAmountAll += total;
                totalDiscountAll += disc;

                const custId = sale.customer_id || 0;
                const custName = sale.customer ? sale.customer.name : 'Cliente Balcão';
                const custCpf = sale.customer ? sale.customer.cpf : 'N/A';
                const custReg = sale.customer ? (sale.customer.external_id || sale.customer.cpf || 'N/A') : 'N/A';

                if (!customerMap[custId]) {
                    customerMap[custId] = {
                        customer_id: custId,
                        name: custName,
                        cpf: custCpf,
                        registration: custReg,
                        purchases_count: 0,
                        total_spent: 0,
                        total_discount: 0,
                        last_purchase: sale.createdAt
                    };
                }

                customerMap[custId].purchases_count += 1;
                customerMap[custId].total_spent += total;
                customerMap[custId].total_discount += disc;
            });

            const customersSummary = Object.values(customerMap).sort((a, b) => b.total_spent - a.total_spent);

            return res.json({
                sales,
                summary: {
                    total_sales_count: sales.length,
                    total_amount: totalAmountAll,
                    total_discount: totalDiscountAll,
                    average_ticket: sales.length > 0 ? (totalAmountAll / sales.length) : 0,
                    customers_count: customersSummary.length
                },
                customers_summary: customersSummary
            });
        } catch (error) {
            console.error('Error generating customer purchase report:', error);
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new CustomerController();
