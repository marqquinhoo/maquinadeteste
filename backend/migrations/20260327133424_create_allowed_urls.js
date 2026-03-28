/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTableIfNotExists('AllowedUrls', table => {
    table.increments('id').primary();
    table.string('url', 255).notNullable().unique();
    table.string('label', 255).nullable();
    table.timestamp('createdAt').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('AllowedUrls');
};
