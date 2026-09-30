const { Tenant, User, StoreConfig, PixConfig } = require('./src/models');

async function createAdmin() {
    try {
        let tenant = await Tenant.findOne({ where: { cnpj: '00000000000100' }});
        if (!tenant) {
            tenant = await Tenant.create({
                name: 'VarejoPro Matriz',
                cnpj: '00000000000100',
                status: 'active'
            });
            console.log('Tenant criado:', tenant.id);

            await StoreConfig.create({
                tenant_id: tenant.id,
                store_name: 'VarejoPro Matriz'
            });

            await PixConfig.create({
                tenant_id: tenant.id
            });
        }

        let admin = await User.findOne({ where: { email: 'admin@varejopro.com' }});
        if (!admin) {
            admin = await User.create({
                tenant_id: tenant.id,
                name: 'Administrador',
                email: 'admin@varejopro.com',
                password: 'admin',
                role: 'superadmin',
                active: true
            });
            console.log('Usuário admin criado com sucesso!');
        } else {
            console.log('Usuário admin já existia.');
        }
    } catch (err) {
        console.error('Erro:', err);
    }
    process.exit(0);
}

createAdmin();
