/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable('TestSessions', table => {
    table.text('logs').alter();
    table.text('screenshots').alter();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable('TestSessions', table => {
    table.text('logs').alter();
    table.text('screenshots').alter();
  });
};
