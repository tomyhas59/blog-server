const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  development: {
    username: "root",
    password: process.env.DB_PASSWORD,
    database: "blog",
    host: "svc.sel5.cloudtype.app",
    port: "32164",
    dialect: "mysql",
  },
  test: {
    username: "root",
    password: process.env.DB_PASSWORD,
    database: "blog",
    host: "svc.sel5.cloudtype.app",
    port: "32164",
    dialect: "mysql",
  },
  production: {
    username: "root",
    password: process.env.DB_PASSWORD,
    database: "blog",
    host: "svc.sel5.cloudtype.app",
    port: "32164",
    dialect: "mysql",
  },
};
