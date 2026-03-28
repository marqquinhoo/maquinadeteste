/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable('AdminUsers', table => {
        table.increments('id').primary();
        table.string('username').notNullable().unique();
        table.string('passwordHash').notNullable();
        table.boolean('needsPasswordChange').defaultTo(true);
    }).then(() => {
        // Insere o usuário padrão bcrypt hash ('admin123')
        return knex('AdminUsers').insert({
            username: 'admin',
            passwordHash: '$2a$10$wJ1a4N2G/7HjP0Zz0l8F.ejhU0v0WvB2.cMvq.H2vK2vX0w9zO', // admin123
            needsPasswordChange: true
        });
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTableIfExists('AdminUsers');
};
