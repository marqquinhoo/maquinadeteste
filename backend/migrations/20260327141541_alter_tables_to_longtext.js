/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('TestSessions', table => {
    table.text('logs', 'longtext').alter();
    table.text('screenshots', 'longtext').alter();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('TestSessions', table => {
    table.text('logs', 'mediumtext').alter(); // Fallback
    table.text('screenshots', 'mediumtext').alter();
  });
};
