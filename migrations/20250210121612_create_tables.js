/**
 * @param {import("knex")} knex
 */
exports.up = function (knex) {
  return knex.schema
    .createTable("roles", (table) => {
      table.increments("role_id").primary();
      table.string("role_name", 255).notNullable();
    })
    .createTable("users", (table) => {
      table.increments("user_id").primary();
      table
        .integer("role_id")
        .unsigned()
        .references("role_id")
        .inTable("roles")
        .onDelete("CASCADE");
      table.string("email", 255).notNullable().unique();
      table.string("password", 255).notNullable();
      table.string("first_name", 255);
      table.string("last_name", 255);
      table.timestamp("created_at").defaultTo(knex.fn.now()).notNullable(); // Ensure created_at is set when the record is created
      table.timestamp("updated_at").defaultTo(knex.fn.now()).notNullable(); // updated_at will be updated manually
      table.timestamp("deleted_at").nullable(); // Use nullable for soft delete
    })
    .createTable("type_projects", (table) => {
      table.increments("type_id").primary();
      table
        .integer("user_id")
        .unsigned()
        .references("user_id")
        .inTable("users")
        .onDelete("CASCADE");
      table.string("type_name", 255);
      table.timestamp("created_at").defaultTo(knex.fn.now()).notNullable(); // created_at set only when created
      table.timestamp("updated_at").defaultTo(knex.fn.now()).notNullable(); // updated_at will be updated manually
      table.timestamp("deleted_at").nullable(); // deleted_at will be nullable
    })
    .createTable("projects", (table) => {
      table.increments("project_id").primary();
      table
        .integer("type_id")
        .unsigned()
        .references("type_id")
        .inTable("type_projects")
        .onDelete("CASCADE");
      table.string("project_name_th", 255);
      table.string("project_name_en", 255);
      table.string("abstract_th", 255);
      table.string("abstract_en", 255);
      table.jsonb("keywords");
      table.date("date");
      table.string("file_name", 255);
      table.text("file_path");
      table.timestamp("created_at").defaultTo(knex.fn.now()).notNullable(); // created_at set only when created
      table.timestamp("updated_at").defaultTo(knex.fn.now()).notNullable(); // updated_at will be updated manually
      table.timestamp("deleted_at").nullable(); // deleted_at will be nullable
    })
    .createTable("user_project_mapping", (table) => {
      table
        .integer("user_id")
        .unsigned()
        .references("user_id")
        .inTable("users")
        .onDelete("CASCADE");
      table
        .integer("project_id")
        .unsigned()
        .references("project_id")
        .inTable("projects")
        .onDelete("CASCADE");
      table.string("role_group", 255);
      table.primary(["user_id", "project_id"]);
    });
};

/**
 * @param {import("knex")} knex
 */
exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists("user_project_mapping")
    .dropTableIfExists("projects")
    .dropTableIfExists("type_projects")
    .dropTableIfExists("users")
    .dropTableIfExists("roles");
};
