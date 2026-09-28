const { Tenant } = require('./src/models');

async function run() {
    try {
        const tenants = await Tenant.findAll();
        console.log('Tenants no banco:', tenants.map(x => ({ id: x.id, name: x.name, cnpj: x.cnpj })));
    } catch (e) {
        console.error('Erro ao listar tenants:', e.message);
    }
    process.exit(0);
}

run();
