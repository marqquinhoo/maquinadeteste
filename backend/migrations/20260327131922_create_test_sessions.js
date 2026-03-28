/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTableIfNotExists('TestSessions', table => {
    table.string('id').primary();
    table.string('url', 2048).notNullable();
    table.text('goal');
    table.text('context');
    table.string('status', 50).defaultTo('starting');
    table.text('logs'); 
    table.text('screenshots');
    table.timestamp('startTime').defaultTo(knex.fn.now());
    table.timestamp('endTime').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('TestSessions');
};
