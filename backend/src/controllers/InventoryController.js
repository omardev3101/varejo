const { 
    Product, 
    InventoryBatch, 
    Supplier, 
    Tenant, 
    Category, 
    Sale, 
    SaleItem, 
    Customer, 
    Prescriber, 
    Prescription, 
    
    CashierSession, 
    CashierTransaction, 
    FinancialEntry, 
    Order, 
    OrderItem, 
    ProductReturn,
    ProductReturnItem,
    ProductTransfer,
    ProductTransferItem,
    sequelize 
} = require('../models');
const { sanitizeErrorMessage } = require('../utils/errorSanitizer');
const SefazNFeService = require('../services/SefazNFeService');
const axios = require('axios');
const xml2js = require('xml2js');
const fs = require('fs');
const path = require('path');

class InventoryController {
    async importXML(req, res) {
        const transaction = await sequelize.transaction();
        try {
            if (!req.files || !req.files.xml) {
                return res.status(400).json({ error: 'Nenhum arquivo XML enviado' });
            }

            const xmlContent = req.files.xml.data.toString();
            const parser = new xml2js.Parser({ explicitArray: false });
            const result = await parser.parseStringPromise(xmlContent);

            // NFe structure usually starts with NFe or nfeProc
            const nfe = result.nfeProc ? result.nfeProc.NFe : result.NFe;
            if (!nfe) throw new Error('Estrutura de XML NF-e inválida');

            const info = nfe.infNFe;
            const emit = info.emit;
            const items = Array.isArray(info.det) ? info.det : [info.det];

            let stockTenantId = req.stockTenantId;
            if (!stockTenantId) {
                const { Tenant } = require('../models');
                const firstTenant = await Tenant.findOne({ transaction });
                if (firstTenant) stockTenantId = firstTenant.id;
            }

            // Save XML to disk
            let chaveNFe = 'NFE_' + Date.now();
            if (info.$ && info.$.Id) {
                chaveNFe = info.$.Id.replace('NFe', '');
            }
            const date = new Date();
            const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const dirPath = path.join(__dirname, '..', '..', 'uploads', 'xml', 'entradas', String(stockTenantId), yearMonth);
            
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
            
            const filePath = path.join(dirPath, `${chaveNFe}.xml`);
            fs.writeFileSync(filePath, xmlContent);

            // 1. Handle Supplier
            let supplier = await Supplier.findOne({
                where: { cnpj: emit.CNPJ, tenant_id: stockTenantId },
                transaction
            });

            if (!supplier) {
                supplier = await Supplier.create({
                    tenant_id: stockTenantId,
                    cnpj: emit.CNPJ,
                    name: emit.xNome,
                    ie: emit.IE,
                    address: emit.enderEmit.xLgr + ', ' + emit.enderEmit.nro,
                    city: emit.enderEmit.xMun,
                    state: emit.enderEmit.UF,
                    phone: emit.enderEmit.fone
                }, { transaction });
            }

            // 1.5 Handle Default Category
            let defaultCategory = await Category.findOne({
                where: { name: 'Geral', tenant_id: stockTenantId },
                transaction
            });
            if (!defaultCategory) {
                defaultCategory = await Category.create({
                    name: 'Geral',
                    tenant_id: stockTenantId
                }, { transaction });
            }

            const processedItems = [];

            // 2. Handle Items
            for (const item of items) {
                const prod = item.prod;
                const ean = prod.cEAN !== 'SEM GTIN' ? prod.cEAN : null;
                
                // Detect multiplier from description (e.g., C/24, CX C/30, C/60)
                const multiplierMatch = prod.xProd.match(/\bC\/(\d+)\b/i) || prod.xProd.match(/\bCX\s+C\/(\d+)\b/i) || prod.xProd.match(/C\/(\d+)/i);
                const multiplier = multiplierMatch ? parseInt(multiplierMatch[1], 10) : 1;

                const qtyInUnits = parseFloat(prod.qCom) * multiplier;
                const costPerUnit = parseFloat(prod.vUnCom) / multiplier;

                // Try to find product by EAN or code
                let product = await Product.findOne({
                    where: { 
                        tenant_id: stockTenantId,
                        [require('sequelize').Op.or]: [
                            ean ? { ean } : { external_id: prod.cProd },
                            { name: prod.xProd }
                        ]
                    },
                    transaction
                });

                // Extract more XML data
                const ncm = prod.NCM || null;
                const unit = prod.uCom || 'UN';
                const cfop = prod.CFOP || null;

                let icmsPercentage = 0;
                if (item.imposto && item.imposto.ICMS) {
                    const icmsKey = Object.keys(item.imposto.ICMS)[0];
                    if (icmsKey && item.imposto.ICMS[icmsKey]) {
                        if (item.imposto.ICMS[icmsKey].pICMS) {
                            icmsPercentage = parseFloat(item.imposto.ICMS[icmsKey].pICMS);
                        }
                    }
                }

                let brand = null;
                let batchNum = null;
                let expiry = null;
                let msRegistry = null;
                let pmcPrice = null;

                if (prod.rastro) {
                    const rastro = Array.isArray(prod.rastro) ? prod.rastro[0] : prod.rastro;
                    if (rastro.nLote) batchNum = rastro.nLote;
                    if (rastro.dVal) expiry = rastro.dVal;
                }
                
                if (prod.med) {
                    const med = Array.isArray(prod.med) ? prod.med[0] : prod.med;
                    if (med.nLote && !batchNum) batchNum = med.nLote;
                    if (med.dVal && !expiry) expiry = med.dVal;
                    if (med.cProdANVISA) msRegistry = med.cProdANVISA;
                    if (med.vPMC && parseFloat(med.vPMC) > 0) {
                        pmcPrice = parseFloat(med.vPMC) / multiplier;
                    }
                }

                if (item.infAdProd) {
                    const brandMatch = String(item.infAdProd).match(/Marca:\s*(.*?)(?=\n|Lote|$)/i);
                    if (brandMatch) brand = brandMatch[1].trim();

                    if (!batchNum) {
                        const loteMatch = String(item.infAdProd).match(/Lote:\s*([A-Za-z0-9]+)/i);
                        if (loteMatch) batchNum = loteMatch[1];
                    }
                    if (!expiry) {
                        const valMatch = String(item.infAdProd).match(/-\s*(\d{2}\/\d{2}\/\d{4})/);
                        if (valMatch) {
                            const [day, month, year] = valMatch[1].split('/');
                            expiry = `${year}-${month}-${day}`;
                        }
                    }
                }

                let imageUrl = null;

                // Cosmos API Integration to enrich Brand and Image
                if (ean && process.env.COSMOS_API_TOKEN && (!brand || !imageUrl)) {
                    try {
                        const cosmosResponse = await axios.get(`https://api.cosmos.bluesoft.com.br/gtins/${ean}`, {
                            headers: { 'X-Cosmos-Token': process.env.COSMOS_API_TOKEN },
                            timeout: 3000 // Don't block import for too long
                        });
                        
                        if (cosmosResponse.data) {
                            if (!brand && cosmosResponse.data.brand?.name) {
                                brand = cosmosResponse.data.brand.name;
                            }
                            if (cosmosResponse.data.thumbnail) {
                                imageUrl = cosmosResponse.data.thumbnail;
                            }
                        }
                    } catch (err) {
                        console.warn(`Could not fetch Cosmos data for EAN ${ean}:`, err.message);
                    }
                }

                if (!product) {
                    product = await Product.create({
                        tenant_id: stockTenantId,
                        name: prod.xProd,
                        ean: ean,
                        external_id: prod.cProd,
                        price: pmcPrice ? pmcPrice : (costPerUnit * 1.5),
                        cost: costPerUnit,
                        category_id: defaultCategory.id,
                        stock_qty: 0,
                        ncm: ncm,
                        unit: multiplier > 1 ? 'UN' : unit, // Force UN if box split
                        purchase_packaging: multiplier,
                        tax_situation: cfop,
                        icms_percentage: icmsPercentage,
                        brand: brand,
                        ms_registry: msRegistry,
                        image_url: imageUrl
                    }, { transaction });
                } else {
                    // Update existing product with new cost and price based on the current XML import
                    await product.update({
                        cost: costPerUnit,
                        price: pmcPrice ? pmcPrice : (costPerUnit * 1.5),
                        purchase_packaging: multiplier,
                        unit: multiplier > 1 ? 'UN' : product.unit
                    }, { transaction });
                }

                // Create Batch
                const batch = await InventoryBatch.create({
                    product_id: product.id,
                    batch_number: batchNum || 'LOTE-' + Date.now(),
                    quantity: qtyInUnits,
                    expiry_date: expiry || new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0],
                    cost_price: costPerUnit
                }, { transaction });

                // Update Total Stock
                await product.increment('stock_qty', { by: qtyInUnits, transaction });

                processedItems.push({
                    name: product.name,
                    quantity: qtyInUnits,
                    cost: costPerUnit
                });
            }

            await transaction.commit();

            return res.json({
                message: 'Importação concluída com sucesso',
                supplier: supplier.name,
                nfe_key: chaveNFe,
                items: processedItems
            });

        } catch (error) {
            if (transaction) await transaction.rollback();
            console.error('XML Import Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    async searchAndImportNfeKey(req, res) {
        const transaction = await sequelize.transaction();
        try {
            const { chave_acesso } = req.body;
            if (!chave_acesso || chave_acesso.replace(/\D/g, '').length !== 44) {
                return res.status(400).json({ error: 'A Chave de Acesso da NF-e deve ter exatamente 44 dígitos numéricos.' });
            }

            const cleanKey = chave_acesso.replace(/\D/g, '');

            let stockTenantId = req.stockTenantId;
            if (!stockTenantId) {
                const firstTenant = await Tenant.findOne({ transaction });
                if (firstTenant) stockTenantId = firstTenant.id;
            }

            // Enforce A1 Certificate constraint (no mockup)
            const tenant = await Tenant.findByPk(stockTenantId, { transaction });
            if (!tenant || !tenant.nfce_certificate_base64) {
                return res.status(400).json({ error: 'Certificado Digital A1 é obrigatório para realizar consultas de NF-e na SEFAZ. Por favor, cadastre o certificado nas configurações da unidade.' });
            }

            // Call real SEFAZ DFe service
            const xmlContent = await SefazNFeService.fetchNFeByKey(stockTenantId, cleanKey);

            // Parse and import XML
            const parser = new xml2js.Parser({ explicitArray: false });
            const parsedResult = await parser.parseStringPromise(xmlContent);
            
            const isSummary = parsedResult.retDistDFeInt && parsedResult.retDistDFeInt.loteDistDFeInt && parsedResult.retDistDFeInt.loteDistDFeInt.docZip && parsedResult.retDistDFeInt.loteDistDFeInt.docZip.$.schema.includes('resNFe');
            const nfe = parsedResult.nfeProc ? parsedResult.nfeProc.NFe : parsedResult.NFe;
            const resNfe = parsedResult.resNFe;

            if (resNfe || (!nfe && xmlContent.includes('resNFe'))) {
                return res.status(400).json({ 
                    error: 'A SEFAZ retornou apenas o RESUMO da NF-e. É necessário realizar a Manifestação do Destinatário (Ciência da Operação ou Confirmação) no portal nacional da SEFAZ para liberar o XML com itens e estoque.' 
                });
            }

            if (!nfe) throw new Error('Estrutura de XML NF-e inválida ou não suportada.');

            const info = nfe.infNFe;
            const emit = info.emit;
            const ide = info.ide || {};
            const items = Array.isArray(info.det) ? info.det : [info.det];
            const nfeNumber = parseInt(ide.nNF || '0', 10);

            // Save XML to disk
            const date = new Date();
            const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const dirPath = path.join(__dirname, '..', '..', 'uploads', 'xml', 'entradas', String(stockTenantId), ym);
            if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
            fs.writeFileSync(path.join(dirPath, `${cleanKey}.xml`), xmlContent);

            // Handle Supplier
            let supplier = await Supplier.findOne({
                where: { cnpj: emit.CNPJ, tenant_id: stockTenantId },
                transaction
            });

            if (!supplier) {
                supplier = await Supplier.create({
                    tenant_id: stockTenantId,
                    name: emit.xNome,
                    cnpj: emit.CNPJ,
                    address: emit.enderEmit ? `${emit.enderEmit.xLgr}, ${emit.enderEmit.nro} - ${emit.enderEmit.xMun}/${emit.enderEmit.UF}` : 'Endereço não informado'
                }, { transaction });
            }

            let defaultCategory = await Category.findOne({ where: { name: 'Produtos', tenant_id: stockTenantId }, transaction });
            if (!defaultCategory) {
                defaultCategory = await Category.create({ name: 'Produtos', tenant_id: stockTenantId }, { transaction });
            }

            const processedItems = [];

            for (const item of items) {
                const prod = item.prod;
                const ean = (prod.cEAN && prod.cEAN !== 'SEM GTIN') ? prod.cEAN : null;
                const qtyInUnits = parseFloat(prod.qCom);
                const costPerUnit = parseFloat(prod.vUnCom);

                let product = await Product.findOne({
                    where: { 
                        tenant_id: stockTenantId,
                        [require('sequelize').Op.or]: [
                            ean ? { ean } : { external_id: prod.cProd },
                            { name: prod.xProd }
                        ]
                    },
                    transaction
                });

                let batchNum = prod.med?.nLote || 'LOTE-' + Date.now();
                let expiry = prod.med?.dVal || '2028-12-31';

                if (!product) {
                    product = await Product.create({
                        tenant_id: stockTenantId,
                        name: prod.xProd,
                        ean: ean,
                        external_id: prod.cProd,
                        price: prod.med?.vPMC ? parseFloat(prod.med.vPMC) : (costPerUnit * 1.6),
                        cost: costPerUnit,
                        category_id: defaultCategory.id,
                        stock_qty: 0,
                        ncm: prod.NCM,
                        unit: 'UN',
                        tax_type: 'ST',
                        cst_csosn: '500',
                        cfop: prod.CFOP || '5405'
                    }, { transaction });
                } else {
                    await product.update({
                        cost: costPerUnit,
                        price: prod.med?.vPMC ? parseFloat(prod.med.vPMC) : Math.max(product.price, costPerUnit * 1.5)
                    }, { transaction });
                }

                await InventoryBatch.create({
                    product_id: product.id,
                    batch_number: batchNum,
                    quantity: qtyInUnits,
                    expiry_date: expiry,
                    cost_price: costPerUnit
                }, { transaction });

                await product.increment('stock_qty', { by: qtyInUnits, transaction });
                
                processedItems.push({
                    name: prod.xProd,
                    quantity: qtyInUnits,
                    cost: costPerUnit
                });
            }

            await transaction.commit();

            return res.json({
                message: `NF-e N° ${nfeNumber} localizada na SEFAZ e importada com sucesso!`,
                nfe_key: cleanKey,
                supplier: supplier.name,
                items: processedItems
            });

        } catch (err) {
            if (transaction) await transaction.rollback();
            console.error('Error in searchAndImportNfeKey:', err);
            return res.status(500).json({ error: err.message });
        }
    }

    async previewNfe(req, res) {
        try {
            let xmlContent = '';
            let chaveKey = '';

            let stockTenantId = req.stockTenantId;
            if (!stockTenantId) {
                const firstTenant = await Tenant.findOne();
                if (firstTenant) stockTenantId = firstTenant.id;
            }

            if (req.files && req.files.xml) {
                xmlContent = req.files.xml.data.toString();
            } else if (req.body.chave_acesso) {
                const cleanKey = req.body.chave_acesso.replace(/\D/g, '');
                if (cleanKey.length !== 44) {
                    return res.status(400).json({ error: 'A Chave de Acesso da NF-e deve ter exatamente 44 dígitos numéricos.' });
                }
                chaveKey = cleanKey;

                // Enforce A1 Certificate constraint (no mockup)
                const tenant = await Tenant.findByPk(stockTenantId);
                if (!tenant || !tenant.nfce_certificate_base64) {
                    return res.status(400).json({ error: 'Certificado Digital A1 é obrigatório para realizar consultas de NF-e na SEFAZ. Por favor, cadastre o certificado nas configurações da unidade.' });
                }

                // Call real SEFAZ DFe service
                xmlContent = await SefazNFeService.fetchNFeByKey(stockTenantId, cleanKey);
            } else {
                return res.status(400).json({ error: 'Informe a Chave de Acesso ou envie um arquivo XML.' });
            }

            const parser = new xml2js.Parser({ explicitArray: false });
            const result = await parser.parseStringPromise(xmlContent);

            const nfe = result.nfeProc ? result.nfeProc.NFe : result.NFe;
            const resNfe = result.resNFe;

            if (resNfe || (!nfe && xmlContent.includes('resNFe'))) {
                return res.status(400).json({ 
                    error: 'A SEFAZ retornou apenas o RESUMO da NF-e. É necessário realizar a Manifestação do Destinatário (Ciência da Operação ou Confirmação) no portal nacional da SEFAZ para liberar o XML com itens e estoque.' 
                });
            }

            if (!nfe) throw new Error('Estrutura de XML NF-e inválida ou não suportada.');

            const info = nfe.infNFe;
            const emit = info.emit;
            const ide = info.ide || {};
            const detItems = Array.isArray(info.det) ? info.det : [info.det];

            if (!chaveKey && info.$ && info.$.Id) {
                chaveKey = info.$.Id.replace('NFe', '');
            }

            const itemsPreview = detItems.map((item, idx) => {
                const prod = item.prod;
                const ean = (prod.cEAN && prod.cEAN !== 'SEM GTIN') ? prod.cEAN : null;
                const qty = parseFloat(prod.qCom || 1);
                const cost = parseFloat(prod.vUnCom || 0);

                let batchNum = null;
                let expiry = null;
                if (prod.med) {
                    batchNum = prod.med.nLote || null;
                    expiry = prod.med.dVal || null;
                }
                if (prod.rastro && !batchNum) {
                    batchNum = prod.rastro.nLote || null;
                    expiry = prod.rastro.dVal || null;
                }

                return {
                    item_num: idx + 1,
                    cProd: prod.cProd,
                    ean: ean,
                    name: prod.xProd,
                    ncm: prod.NCM || '30049099',
                    cfop: prod.CFOP || '5405',
                    unit: prod.uCom || 'UN',
                    quantity: qty,
                    cost_unit: cost,
                    total_cost: qty * cost,
                    batch_number: batchNum || 'LOT-' + (ide.nNF || 'EXP') + '-' + (idx + 1),
                    expiry_date: expiry || '2028-12-31'
                };
            });

            const totalAmount = itemsPreview.reduce((acc, i) => acc + i.total_cost, 0);

            return res.json({
                nfe_key: chaveKey,
                nfe_number: ide.nNF || 'S/N',
                series: ide.serie || '1',
                issue_date: ide.dhEmi ? ide.dhEmi.split('T')[0] : new Date().toISOString().split('T')[0],
                total_amount: totalAmount,
                supplier: {
                    name: emit.xNome,
                    cnpj: emit.CNPJ,
                    ie: emit.IE || 'Isento',
                    address: emit.enderEmit ? `${emit.enderEmit.xLgr}, ${emit.enderEmit.nro} - ${emit.enderEmit.xMun}/${emit.enderEmit.UF}` : 'Não informado'
                },
                items: itemsPreview,
                xml_content: xmlContent
            });

        } catch (err) {
            console.error('Error in previewNfe:', err);
            return res.status(500).json({ error: err.message });
        }
    }

    async confirmImportNfe(req, res) {
        const transaction = await sequelize.transaction();
        try {
            const { nfe_key, supplier: supplierData, items, xml_content } = req.body;

            if (!items || items.length === 0) {
                return res.status(400).json({ error: 'Nenhum item para importar' });
            }

            let stockTenantId = req.stockTenantId;
            if (!stockTenantId) {
                const firstTenant = await Tenant.findOne({ transaction });
                if (firstTenant) stockTenantId = firstTenant.id;
            }

            // Save XML file to disk
            const cleanKey = (nfe_key || ('NFE_' + Date.now())).replace(/\D/g, '');
            const date = new Date();
            const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const dirPath = path.join(__dirname, '..', '..', 'uploads', 'xml', 'entradas', String(stockTenantId), ym);
            if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
            fs.writeFileSync(path.join(dirPath, `${cleanKey}.xml`), xml_content || '');

            // Handle Supplier
            let supplier = await Supplier.findOne({
                where: { cnpj: supplierData.cnpj, tenant_id: stockTenantId },
                transaction
            });

            if (!supplier) {
                supplier = await Supplier.create({
                    tenant_id: stockTenantId,
                    name: supplierData.name,
                    cnpj: supplierData.cnpj,
                    ie: supplierData.ie,
                    address: supplierData.address
                }, { transaction });
            }

            let defaultCategory = await Category.findOne({ where: { name: 'Produtos', tenant_id: stockTenantId }, transaction });
            if (!defaultCategory) {
                defaultCategory = await Category.create({ name: 'Produtos', tenant_id: stockTenantId }, { transaction });
            }

            const processedItems = [];

            for (const item of items) {
                const qtyInUnits = parseFloat(item.quantity);
                const costPerUnit = parseFloat(item.cost_unit);

                let product = await Product.findOne({
                    where: { 
                        tenant_id: stockTenantId,
                        [require('sequelize').Op.or]: [
                            item.ean ? { ean: item.ean } : { external_id: item.cProd },
                            { name: item.name }
                        ]
                    },
                    transaction
                });

                const targetPrice = item.price && parseFloat(item.price) > 0 ? parseFloat(item.price) : null;

                if (!product) {
                    product = await Product.create({
                        tenant_id: stockTenantId,
                        name: item.name,
                        ean: item.ean || null,
                        external_id: item.cProd,
                        price: targetPrice || (costPerUnit * 1.6),
                        cost: costPerUnit,
                        category_id: item.category_id || defaultCategory.id,
                        section: item.section || null,
                        section_code: item.section_code || null,
                        stock_qty: 0,
                        ncm: item.ncm,
                        unit: item.unit || 'UN',
                        tax_type: item.tax_type || 'ST',
                        cst_csosn: item.cst_csosn || '500',
                        cfop: item.cfop || '5405',
                        icms_percentage: item.icms_percentage !== undefined && item.icms_percentage !== null ? parseFloat(item.icms_percentage) : 0
                    }, { transaction });
                } else {
                    const updatePayload = {
                        cost: costPerUnit
                    };
                    if (targetPrice) updatePayload.price = targetPrice;
                    if (item.category_id) updatePayload.category_id = item.category_id;
                    if (item.section) updatePayload.section = item.section;
                    if (item.section_code) updatePayload.section_code = item.section_code;
                    if (item.icms_percentage !== undefined && item.icms_percentage !== null) {
                        updatePayload.icms_percentage = parseFloat(item.icms_percentage);
                    }
                    await product.update(updatePayload, { transaction });
                }

                await InventoryBatch.create({
                    product_id: product.id,
                    batch_number: item.batch_number || 'LOTE-' + Date.now(),
                    quantity: qtyInUnits,
                    expiry_date: item.expiry_date || '2028-12-31',
                    cost_price: costPerUnit
                }, { transaction });

                await product.increment('stock_qty', { by: qtyInUnits, transaction });

                processedItems.push({
                    name: product.name,
                    quantity: qtyInUnits,
                    cost: costPerUnit
                });
            }

            await transaction.commit();

            return res.json({
                message: `Importação da NF-e N° ${cleanKey} concluída com sucesso!`,
                nfe_key: cleanKey,
                supplier: supplier.name,
                items: processedItems
            });

        } catch (err) {
            if (transaction) await transaction.rollback();
            console.error('Error in confirmImportNfe:', err);
            return res.status(500).json({ error: err.message });
        }
    }

    async getImportedNfeHistory(req, res) {
        try {
            const stockTenantId = req.stockTenantId || 1;
            const dirBasePath = path.join(__dirname, '..', '..', 'uploads', 'xml', 'entradas', String(stockTenantId));
            
            const history = [];
            if (fs.existsSync(dirBasePath)) {
                const months = fs.readdirSync(dirBasePath);
                for (const ym of months) {
                    const monthPath = path.join(dirBasePath, ym);
                    if (fs.statSync(monthPath).isDirectory()) {
                        const files = fs.readdirSync(monthPath);
                        for (const file of files) {
                            if (file.endsWith('.xml')) {
                                const filePath = path.join(monthPath, file);
                                const stat = fs.statSync(filePath);
                                history.push({
                                    key: file.replace('.xml', ''),
                                    filename: file,
                                    imported_at: stat.mtime,
                                    size_bytes: stat.size
                                });
                            }
                        }
                    }
                }
            }

            history.sort((a, b) => new Date(b.imported_at) - new Date(a.imported_at));
            return res.json(history);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    async getStockData(req, res) {
        try {
            const { category_id, supplier_id, stock_status, expiry_status, search } = req.query;
            const { Op } = require('sequelize');

            const where = {};
            if (req.stockTenantId) where.tenant_id = req.stockTenantId;
            
            if (category_id) where.category_id = category_id;
            
            if (search) {
                where[Op.or] = [
                    { name: { [Op.like]: `%${search}%` } },
                    { ean: { [Op.like]: `%${search}%` } }
                ];
            }

            if (stock_status === 'low') {
                where.stock_qty = { [Op.lt]: 10 };
            } else if (stock_status === 'zero') {
                where.stock_qty = 0;
            }

            let products = await Product.findAll({
                where,
                include: [
                    { 
                        model: InventoryBatch, 
                        as: 'batches',
                        where: expiry_status === 'expired' ? { expiry_date: { [Op.lt]: new Date() } } : undefined,
                        required: expiry_status === 'expired'
                    },
                    { model: Category, as: 'category_rel' },
                    { model: Tenant, as: 'tenant', attributes: ['default_min_stock'] }
                ],
                order: [['name', 'ASC']]
            });

            // Fallback: If 0 products found for this specific unit's stock tenant ID, return all active products in system
            if (products.length === 0) {
                const fallbackWhere = { ...where };
                delete fallbackWhere.tenant_id;
                products = await Product.findAll({
                    where: fallbackWhere,
                    include: [
                        { 
                            model: InventoryBatch, 
                            as: 'batches',
                            where: expiry_status === 'expired' ? { expiry_date: { [Op.lt]: new Date() } } : undefined,
                            required: expiry_status === 'expired'
                        },
                        { model: Category, as: 'category_rel' },
                        { model: Tenant, as: 'tenant', attributes: ['default_min_stock'] }
                    ],
                    order: [['name', 'ASC']]
                });
            }

            return res.json(products);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async getPurchaseSuggestions(req, res) {
        try {
            const { Op } = require('sequelize');
            const whereClause = {};
            if (req.stockTenantId) whereClause.tenant_id = req.stockTenantId;

            const products = await Product.findAll({
                where: whereClause,
                include: [
                    { model: Tenant, as: 'tenant', attributes: ['default_min_stock'] }
                ]
            });

            const suggestions = products.filter(p => {
                const min = p.min_stock ?? (p.tenant?.default_min_stock || 5);
                return p.stock_qty < min;
            });

            return res.json(suggestions);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async listSuppliers(req, res) {
        try {
            const whereClause = {};
            if (req.stockTenantId) whereClause.tenant_id = req.stockTenantId;

            const suppliers = await Supplier.findAll({ where: whereClause });
            return res.json(suppliers);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    async clearStock(req, res) {
        const transaction = await sequelize.transaction();
        try {
            let stockTenantId = req.stockTenantId;

            // Fallback for superadmin/admin without stockTenantId
            if (!stockTenantId && (req.userRole === 'superadmin' || req.userRole === 'admin')) {
                const firstTenant = await Tenant.findOne({ transaction });
                if (firstTenant) stockTenantId = firstTenant.id;
            }

            if (!stockTenantId) {
                return res.status(400).json({ error: 'Nenhum tenant associado para limpeza' });
            }

            // Disable foreign key checks for clean wiping of tenant data
            try {
                await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction });
            } catch (e) {}

            // 1. Delete ProductReturnItem & ProductReturn
            try {
                const returns = await ProductReturn.findAll({ where: { tenant_id: stockTenantId }, transaction });
                const returnIds = returns.map(r => r.id);
                if (returnIds.length > 0) {
                    await ProductReturnItem.destroy({ where: { return_id: returnIds }, transaction });
                }
                await ProductReturn.destroy({ where: { tenant_id: stockTenantId }, transaction });
            } catch (rErr) {
                console.error('Clear Returns Error:', rErr);
            }

            // 2. Delete ProductTransferItem & ProductTransfer
            try {
                const transfers = await ProductTransfer.findAll({ 
                    where: {
                        [require('sequelize').Op.or]: [
                            { origin_tenant_id: stockTenantId },
                            { destination_tenant_id: stockTenantId }
                        ]
                    }, 
                    transaction 
                });
                const transferIds = transfers.map(t => t.id);
                if (transferIds.length > 0) {
                    await ProductTransferItem.destroy({ where: { transfer_id: transferIds }, transaction });
                }
                await ProductTransfer.destroy({ 
                    where: {
                        [require('sequelize').Op.or]: [
                            { origin_tenant_id: stockTenantId },
                            { destination_tenant_id: stockTenantId }
                        ]
                    }, 
                    transaction 
                });
            } catch (tErr) {
                console.error('Clear Transfers Error:', tErr);
            }

            // 3. Delete SaleItem (via Sale relationship)
            const sales = await Sale.findAll({ where: { tenant_id: stockTenantId }, transaction });
            const saleIds = sales.map(s => s.id);
            if (saleIds.length > 0) {
                await SaleItem.destroy({ where: { sale_id: saleIds }, transaction });
            }

            // 4. Delete Sale
            await Sale.destroy({ where: { tenant_id: stockTenantId }, transaction });

            // 5. Delete InventoryBatch (via Product relationship)
            const products = await Product.findAll({ where: { tenant_id: stockTenantId }, transaction });
            const productIds = products.map(p => p.id);
            if (productIds.length > 0) {
                await InventoryBatch.destroy({ where: { product_id: productIds }, transaction });
            }

            // 6. Delete Product
            await Product.destroy({ where: { tenant_id: stockTenantId }, transaction });

            // 7. Delete PBMTransaction
            
            // 8. Delete CashierTransaction (via CashierSession relationship)
            const sessions = await CashierSession.findAll({ where: { tenant_id: stockTenantId }, transaction });
            const sessionIds = sessions.map(s => s.id);
            if (sessionIds.length > 0) {
                await CashierTransaction.destroy({ where: { cashier_session_id: sessionIds }, transaction });
            }

            // 9. Delete CashierSession
            await CashierSession.destroy({ where: { tenant_id: stockTenantId }, transaction });

            // 10. Delete FinancialEntry
            await FinancialEntry.destroy({ where: { tenant_id: stockTenantId }, transaction });

            // 11. Delete OrderItem (via Order relationship)
            const orders = await Order.findAll({ where: { tenant_id: stockTenantId }, transaction });
            const orderIds = orders.map(o => o.id);
            if (orderIds.length > 0) {
                await OrderItem.destroy({ where: { order_id: orderIds }, transaction });
            }

            // 12. Delete Order
            await Order.destroy({ where: { tenant_id: stockTenantId }, transaction });

            // 13. Delete Prescription
            await Prescription.destroy({ where: { tenant_id: stockTenantId }, transaction });

            // 14. Delete Prescriber
            await Prescriber.destroy({ where: { tenant_id: stockTenantId }, transaction });

            // 15. Delete Customer
            await Customer.destroy({ where: { tenant_id: stockTenantId }, transaction });

            // 16. Delete Supplier
            await Supplier.destroy({ where: { tenant_id: stockTenantId }, transaction });

            // Re-enable foreign key checks
            try {
                await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });
            } catch (e) {}

            await transaction.commit();
            return res.json({ message: 'Todos os registros operacionais e de estoque da filial foram limpos com sucesso.' });
        } catch (error) {
            if (transaction) {
                try {
                    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });
                } catch (e) {}
                await transaction.rollback();
            }
            console.error('Clear Stock Error:', error);
            return res.status(500).json({ error: sanitizeErrorMessage(error) });
        }
    }
}

module.exports = new InventoryController();
