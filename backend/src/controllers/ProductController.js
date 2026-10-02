const { Product, InventoryBatch, Category, Supplier, ProductSection, Tenant } = require('../models');

function sanitizeProductPayload(data) {
    if (!data || typeof data !== 'object') return {};
    const payload = { ...data };

    // Decimal fields requiring numeric values (or 0 as fallback if empty string)
    const decimalFields = [
        'cost', 'price', 'weight', 'pis_percentage', 'cofins_percentage',
        'icms_percentage', 'icms_base', 'icms_reduced_base', 'profit_margin',
        'max_discount_percentage', 'commission_percentage', 'wholesale_price',
        'bonus_percentage'
    ];

    decimalFields.forEach(field => {
        if (field in payload) {
            const val = payload[field];
            if (val === '' || val === null || val === undefined || Number.isNaN(Number(val))) {
                payload[field] = 0;
            } else {
                payload[field] = Number(val);
            }
        }
    });

    // Integer fields requiring number or 0
    const integerFields = ['stock_qty', 'wholesale_min_qty', 'purchase_packaging'];
    integerFields.forEach(field => {
        if (field in payload) {
            const val = payload[field];
            if (val === '' || val === null || val === undefined || Number.isNaN(Number(val))) {
                payload[field] = 0;
            } else {
                payload[field] = parseInt(val, 10);
            }
        }
    });

    // Nullable fields (should be null if empty string)
    const nullableFields = ['min_stock', 'category_id', 'default_supplier_id', 'promo_start_date', 'promo_end_date'];
    nullableFields.forEach(field => {
        if (field in payload) {
            const val = payload[field];
            if (val === '' || val === undefined) {
                payload[field] = null;
            }
        }
    });

    // Handle legacy/alias fields
    if ('cost_price' in payload && !('cost' in payload)) {
        const val = payload.cost_price;
        payload.cost = (val === '' || val === null || val === undefined || Number.isNaN(Number(val))) ? 0 : Number(val);
    }

    return payload;
}

class ProductController {
    async list(req, res) {
        try {
            const { search } = req.query;
            const { Op } = require('sequelize');
            const where = {};

            if (search) {
                where[Op.or] = [
                    { name: { [Op.like]: `%${search}%` } },
                    { ean: { [Op.like]: `%${search}%` } },
                    { ms_registry: { [Op.like]: `%${search}%` } }
                ];
            }

            let products = await Product.findAll({
                where: req.stockTenantId ? { ...where, tenant_id: req.stockTenantId } : where,
                include: [
                    { model: InventoryBatch, as: 'batches' },
                    { model: Category, as: 'category_rel' }
                ],
                limit: search ? 30 : undefined
            });

            // Fallback: If no products exist under current stockTenantId, list all products in database so other users can see/sell catalog
            if (products.length === 0) {
                products = await Product.findAll({
                    where,
                    include: [
                        { model: InventoryBatch, as: 'batches' },
                        { model: Category, as: 'category_rel' }
                    ],
                    limit: search ? 30 : undefined
                });
            }

            return res.json(products);
        } catch (error) {
            console.error('Error in ProductController.list:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    async create(req, res) {
        try {
            let stockTenantId = req.stockTenantId;
            if (!stockTenantId) {
                const { Tenant } = require('../models');
                const firstTenant = await Tenant.findOne();
                if (firstTenant) stockTenantId = firstTenant.id;
            }

            const cleanPayload = sanitizeProductPayload(req.body);

            const product = await Product.create({
                ...cleanPayload,
                tenant_id: stockTenantId
            });
            return res.status(201).json(product);
        } catch (error) {
            console.error('Error in ProductController.create:', error);
            return res.status(400).json({ error: error.message });
        }
    }

    async update(req, res) {
        try {
            const whereClause = { id: req.params.id };
            if (req.stockTenantId) whereClause.tenant_id = req.stockTenantId;

            const product = await Product.findOne({
                where: whereClause
            });

            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }

            const cleanPayload = sanitizeProductPayload(req.body);

            await product.update(cleanPayload);
            return res.json(product);
        } catch (error) {
            console.error('Error in ProductController.update:', error);
            return res.status(400).json({ error: error.message });
        }
    }

    async delete(req, res) {
        try {
            const whereClause = { id: req.params.id };
            if (req.stockTenantId) whereClause.tenant_id = req.stockTenantId;

            const product = await Product.findOne({
                where: whereClause
            });

            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }

            await product.destroy();
            return res.status(204).send();
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    // Inventory Batch Management
    async addBatch(req, res) {
        try {
            const { productId } = req.params;
            const whereClause = { id: productId };
            if (req.stockTenantId) whereClause.tenant_id = req.stockTenantId;

            const product = await Product.findOne({
                where: whereClause
            });

            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }

            const batch = await InventoryBatch.create({
                ...req.body,
                product_id: productId
            });

            // Update total stock
            await product.increment('stock_qty', { by: req.body.quantity });

            return res.status(201).json(batch);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }

    async uploadImage(req, res) {
        try {
            const productId = req.params.productId || req.params.id;
            const product = await Product.findByPk(productId);

            if (!product) {
                return res.status(404).json({ error: 'Produto não encontrado.' });
            }

            let fileObj = null;
            if (req.file) {
                fileObj = req.file;
            } else if (req.files && (req.files.image || req.files.file)) {
                fileObj = req.files.image || req.files.file;
            }

            if (!fileObj) {
                return res.status(400).json({ error: 'Nenhuma imagem foi enviada.' });
            }

            const path = require('path');
            const fs = require('fs');
            const uploadsDir = path.join(__dirname, '../../uploads');

            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            const originalName = fileObj.name || fileObj.originalname || 'image.jpg';
            const ext = path.extname(originalName) || '.jpg';
            const filename = `product-${productId}-${Date.now()}${ext}`;
            const filePath = path.join(uploadsDir, filename);

            if (fileObj.mv) {
                await fileObj.mv(filePath);
            } else if (fileObj.buffer) {
                fs.writeFileSync(filePath, fileObj.buffer);
            } else if (fileObj.path) {
                fs.copyFileSync(fileObj.path, filePath);
            }

            const host = req.get('host');
            const isProd = process.env.NODE_ENV === 'production' || host.includes('vps') || host.includes('pessistemas');
            const protocol = isProd ? 'https' : (req.get('x-forwarded-proto') || req.protocol);
            const subpath = isProd ? '/varejo/api' : '/api';
            const imageUrl = `${protocol}://${host}${subpath}/uploads/${filename}`;

            await product.update({ image_url: imageUrl });

            return res.json({ success: true, image_url: imageUrl });
        } catch (error) {
            console.error('Upload Image Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    async searchWebImages(req, res) {
        try {
            const query = (req.query.q || '').trim();
            const ean = (req.query.ean || '').trim();
            const results = [];
            const axios = require('axios');

            function sanitizeProductQuery(rawName) {
                if (!rawName) return '';
                let name = rawName.toUpperCase();
                name = name.replace(/\bXPE\b/g, 'Xarope')
                           .replace(/\bCOMP\b/g, 'Comprimidos')
                           .replace(/\bGOT\b/g, 'Gotas')
                           .replace(/\bSOL\b/g, 'Solucao')
                           .replace(/\bCAP\b/g, 'Capsulas')
                           .replace(/\bAMPO?L?\b/g, 'Ampola')
                           .replace(/\bPOM\b/g, 'Pomada')
                           .replace(/\bCREM\b/g, 'Creme')
                           .replace(/\bINJ\b/g, 'Injetavel');

                name = name.replace(/\b(CT|FR|PLAS|OPC|CX|EMB|UN|LEGR|GEN|BL|CXA|C\/|X)\b/gi, ' ');
                name = name.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

                const words = name.split(' ').filter(w => w.length >= 2 && !w.match(/^\d+M?G?$/i) && !w.match(/^\d+ML$/i));
                const mainBrand = words.slice(0, 2).join(' '); 
                const fullClean = words.slice(0, 4).join(' ');

                return [...new Set([mainBrand, fullClean, name])].filter(Boolean);
            }

            // 1. Cosmos EAN CDN
            if (ean && ean.length >= 8) {
                results.push({
                    title: `Foto Oficial EAN ${ean}`,
                    url: `https://cdn-cosmos.bluesoft.com.br/products/${ean}`,
                    source: 'Google / EAN'
                });
            }

            const searchVariations = sanitizeProductQuery(query);

            // 2. Primary: Bing Images (reliable alternative to Google for direct scraping)
            for (const qTerm of searchVariations) {
                if (results.length >= 12) break;
                try {
                    const crUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(qTerm)}`;
                    const response = await axios.get(crUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept-Language': 'pt-BR,pt;q=0.9'
                        },
                        timeout: 4000
                    });
                    const html = response.data || '';
                    const matches = [...html.matchAll(/murl&quot;:&quot;(https:\/\/[^&"]+)&quot;/gi)].map(m => m[1]);
                    const uniqueCR = [...new Set(matches)];

                    uniqueCR.slice(0, 10).forEach(u => {
                        if (!results.some(r => r.url === u)) {
                            results.push({
                                title: query,
                                url: u,
                                source: 'GOOGLE / IMAGENS'
                            });
                        }
                    });
                } catch (err) {
                    console.error('Image search error:', err.message);
                }
            }

            // 3. Fallbacks if empty
            if (results.length === 0) {
                results.push({
                    title: 'Produtos & Saúde',
                    url: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400&auto=format&fit=crop&q=80',
                    source: 'Genérico'
                });
                results.push({
                    title: 'Higiene & Cuidados',
                    url: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400&auto=format&fit=crop&q=80',
                    source: 'Genérico'
                });
            }

            return res.json(results);
        } catch (error) {
            console.error('Search Web Images Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new ProductController();
