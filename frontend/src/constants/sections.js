export const SECTIONS = [
    { code: '00001', name: 'ETICO', label: 'ÉTIÇO', default_icms: 18.00, default_tax_type: 'ST', default_cst: '500', default_fiscal_list: 'P' },
    { code: '00002', name: 'PERFUMARIA', label: 'PERFUMARIA', default_icms: 25.00, default_tax_type: 'TR', default_cst: '00', default_fiscal_list: 'N' },
    { code: '00003', name: 'VAREJO', label: 'VAREJO', default_icms: 18.00, default_tax_type: 'TR', default_cst: '00', default_fiscal_list: 'N' },
    { code: '00004', name: 'ACESSORIOS', label: 'ACESSÓRIOS', default_icms: 18.00, default_tax_type: 'TR', default_cst: '00', default_fiscal_list: 'N' },
    { code: '00005', name: 'SIMILARES', label: 'SIMILARES', default_icms: 18.00, default_tax_type: 'ST', default_cst: '500', default_fiscal_list: 'N' },
    { code: '00006', name: 'GENERICOS', label: 'GENÉRICOS', default_icms: 12.00, default_tax_type: 'ST', default_cst: '500', default_fiscal_list: 'P' },
];

export const getSectionByCode = (code) => {
    return SECTIONS.find(s => s.code === code) || null;
};

export const getSectionByName = (name) => {
    if (!name) return null;
    const clean = name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return SECTIONS.find(s => s.name === clean || s.label === name.toUpperCase()) || null;
};
