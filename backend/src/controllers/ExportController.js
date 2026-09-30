const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { Op } = require('sequelize');
const { Sale, SaleItem, Product, Tenant } = require('../models');
const xml2js = require('xml2js');

class ExportController {
    exportData = async (req, res) => {
        try {
            const { start, end } = req.query;
            const tenant_id = req.tenantId;

            if (!start || !end) {
                return res.status(400).json({ error: 'Data de início e fim são obrigatórias.' });
            }

            // Define time range for queries
            const startDate = new Date(start);
            const endDate = new Date(end);
            endDate.setHours(23, 59, 59, 999);

            const tenant = await Tenant.findByPk(tenant_id);

            // 1. Fetch Sales
            const sales = await Sale.findAll({
                where: {
                    tenant_id,
                    fiscal_status: 'emitted',
                    created_at: {
                        [Op.gte]: startDate,
                        [Op.lt]: endDate
                    }
                },
                include: [
                    {
                        model: SaleItem,
                        as: 'items',
                        include: [{ model: Product, as: 'product_sale' }]
                    }
                ]
            });

            const zip = new AdmZip();
            const builder = new xml2js.Builder();

            // Generate XMLs for sales
            sales.forEach(sale => {
                const xmlObj = this.generateNFCeXmlObj(sale, tenant);
                const xmlString = builder.buildObject(xmlObj);
                const filename = `saidas/${sale.fiscal_key || 'venda_' + sale.id}-nfce.xml`;
                zip.addFile(filename, Buffer.from(xmlString, 'utf8'));
            });

            // 2. Fetch Incoming XMLs from disk
            const yearMonths = [];
            let currentYear = startDate.getFullYear();
            let currentMonth = startDate.getMonth();
            const endYear = endDate.getFullYear();
            const endMonth = endDate.getMonth();

            while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
                yearMonths.push(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`);
                currentMonth++;
                if (currentMonth > 11) {
                    currentMonth = 0;
                    currentYear++;
                }
            }

            yearMonths.forEach(ym => {
                const entradasDir = path.join(__dirname, '..', '..', 'uploads', 'xml', 'entradas', String(tenant_id), ym);
                if (fs.existsSync(entradasDir)) {
                    const files = fs.readdirSync(entradasDir);
                    files.forEach(file => {
                        if (file.endsWith('.xml')) {
                            const filePath = path.join(entradasDir, file);
                            zip.addLocalFile(filePath, 'entradas/');
                        }
                    });
                }
            });

            // 3. Send ZIP
            const zipBuffer = zip.toBuffer();
            const zipFilename = `Exportacao_${start}_a_${end}.zip`;

            res.set('Content-Disposition', `attachment; filename=${zipFilename}`);
            res.set('Content-Type', 'application/zip');
            res.set('Content-Length', zipBuffer.length);
            return res.send(zipBuffer);

        } catch (error) {
            console.error('Export Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    generateNFCeXmlObj = (sale, tenant) => {
        // Build a simplified valid NFC-e structure
        const items = sale.items.map((item, index) => {
            const prod = item.product_sale;
            return {
                $: { nItem: String(index + 1) },
                prod: {
                    cProd: prod ? prod.external_id || prod.id : '000',
                    cEAN: prod ? prod.ean || 'SEM GTIN' : 'SEM GTIN',
                    xProd: prod ? prod.name : 'Produto Desconhecido',
                    NCM: '00000000',
                    CFOP: '5102',
                    uCom: 'UN',
                    qCom: parseFloat(item.quantity).toFixed(4),
                    vUnCom: parseFloat(item.unit_price).toFixed(4),
                    vProd: parseFloat(item.total_price).toFixed(2),
                    cEANTrib: prod ? prod.ean || 'SEM GTIN' : 'SEM GTIN',
                    uTrib: 'UN',
                    qTrib: parseFloat(item.quantity).toFixed(4),
                    vUnTrib: parseFloat(item.unit_price).toFixed(4),
                    indTot: '1'
                },
                imposto: {
                    vTotTrib: '0.00',
                    ICMS: {
                        ICMSSN102: { // Simples Nacional by default for simplified
                            orig: '0',
                            CSOSN: '102'
                        }
                    },
                    PIS: { PISOutr: { CST: '99', vBC: '0.00', pPIS: '0.00', vPIS: '0.00' } },
                    COFINS: { COFINSOutr: { CST: '99', vBC: '0.00', pCOFINS: '0.00', vCOFINS: '0.00' } }
                }
            };
        });

        const nfeObj = {
            nfeProc: {
                $: { xmlns: 'http://www.portalfiscal.inf.br/nfe', versao: '4.00' },
                NFe: {
                    infNFe: {
                        $: {
                            Id: `NFe${sale.fiscal_key || ''}`,
                            versao: '4.00'
                        },
                        ide: {
                            cUF: '35',
                            cNF: Math.floor(Math.random() * 99999999).toString().padStart(8, '0'),
                            natOp: 'VENDA',
                            mod: '65', // NFC-e
                            serie: '1',
                            nNF: sale.id.toString(),
                            dhEmi: sale.createdAt ? new Date(sale.createdAt).toISOString() : new Date().toISOString(),
                            tpNF: '1', // Saída
                            idDest: '1', // Interna
                            cMunFG: '3550308',
                            tpImp: '4', // DANFE NFC-e
                            tpEmis: '1',
                            cDV: '0',
                            tpAmb: '1', // 1=Prod, 2=Homolog
                            finNFe: '1',
                            indFinal: '1', // Consumidor final
                            indPres: '1', // Presencial
                            procEmi: '0',
                            verProc: '1.0.0'
                        },
                        emit: {
                            CNPJ: tenant ? tenant.cnpj : '00000000000000',
                            xNome: tenant ? tenant.name : 'REY DAS LOUÇAS',
                            enderEmit: {
                                xLgr: 'Rua',
                                nro: '123',
                                xBairro: 'Centro',
                                cMun: '3550308',
                                xMun: 'Sao Paulo',
                                UF: 'SP',
                                CEP: '00000000',
                                cPais: '1058',
                                xPais: 'Brasil'
                            },
                            IE: 'ISENTO',
                            CRT: '1' // Simples Nacional
                        },
                        det: items,
                        total: {
                            ICMSTot: {
                                vBC: '0.00',
                                vICMS: '0.00',
                                vICMSDeson: '0.00',
                                vFCP: '0.00',
                                vBCST: '0.00',
                                vST: '0.00',
                                vFCPST: '0.00',
                                vFCPSTRet: '0.00',
                                vProd: parseFloat(sale.total_amount || 0).toFixed(2),
                                vFrete: '0.00',
                                vSeg: '0.00',
                                vDesc: parseFloat(sale.discount_amount || 0).toFixed(2),
                                vII: '0.00',
                                vIPI: '0.00',
                                vIPIDevol: '0.00',
                                vPIS: '0.00',
                                vCOFINS: '0.00',
                                vOutro: '0.00',
                                vNF: parseFloat(sale.final_amount || 0).toFixed(2)
                            }
                        },
                        transp: { modFrete: '9' },
                        pag: {
                            detPag: [
                                {
                                    tPag: sale.payment_method === 'cash' ? '01' : (sale.payment_method === 'credit' ? '03' : '04'),
                                    vPag: parseFloat(sale.final_amount || 0).toFixed(2)
                                }
                            ]
                        }
                    }
                },
                protNFe: {
                    $: { versao: '4.00' },
                    infProt: {
                        tpAmb: '1',
                        verAplic: '1.0.0',
                        chNFe: sale.fiscal_key || '',
                        dhRecbto: sale.updatedAt ? new Date(sale.updatedAt).toISOString() : new Date().toISOString(),
                        nProt: sale.fiscal_protocol || '',
                        digVal: '=====', // Simulated signature hash
                        cStat: '100', // Autorizado
                        xMotivo: 'Autorizado o uso da NF-e'
                    }
                }
            }
        };

        return nfeObj;
    }
}

module.exports = new ExportController();
