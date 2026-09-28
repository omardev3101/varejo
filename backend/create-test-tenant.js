const { Tenant } = require('./src/models');

async function run() {
    try {
        const tenant = await Tenant.create({
            name: 'Loja de Teste',
            cnpj: '00000000000100',
            address: 'Rua de Teste, 123',
            phone: '11999999999',
            status: 'active'
        });
        console.log('Tenant de teste criado com sucesso:', tenant.toJSON());
    } catch (e) {
        console.error('Erro ao criar tenant de teste:', e.message);
    }
    process.exit(0);
}

run();
