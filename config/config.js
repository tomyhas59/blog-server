const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  development: {
    port: process.env.DEV_DATABASE_PORT || 3306,
    host: process.env.DEV_DATABASE_HOST,
    database: process.env.DEV_DATABASE_NAME,
    username: process.env.DEV_DATABASE_USER,
    password: process.env.DEV_DATABASE_PASSWORD,
    dialect: "mysql",
  },
  test: {
    port: process.env.DEV_DATABASE_PORT || 3306,
    host: process.env.DEV_DATABASE_HOST,
    database: process.env.DEV_DATABASE_NAME,
    username: process.env.DEV_DATABASE_USER,
    password: process.env.DEV_DATABASE_PASSWORD,
    dialect: "mysql",
  },
  production: {
    port: process.env.DATABASE_PORT || 5432,
    host: process.env.DATABASE_HOST,
    database: process.env.DATABASE_NAME,
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    ssl: "require",
    dialect: "postgres",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
};
