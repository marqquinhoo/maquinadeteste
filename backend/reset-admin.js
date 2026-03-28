const bcrypt = require('bcryptjs');
const { knex } = require('./db');

async function resetAdmin() {
    try {
        console.log('--- Resetando Administrador ---');
        const username = 'admin';
        const password = 'admin123';
        const hash = await bcrypt.hash(password, 10);

        const user = await knex('AdminUsers').where({ username }).first();

        if (user) {
            await knex('AdminUsers').where({ id: user.id }).update({
                passwordHash: hash,
                needsPasswordChange: true
            });
            console.log('Usuário admin atualizado com sucesso!');
        } else {
            await knex('AdminUsers').insert({
                username,
                passwordHash: hash,
                needsPasswordChange: true
            });
            console.log('Usuário admin criado com sucesso!');
        }
        console.log('Credenciais: admin / admin123');
        process.exit(0);
    } catch (err) {
        console.error('Erro ao resetar admin:', err);
        process.exit(1);
    }
}

resetAdmin();
