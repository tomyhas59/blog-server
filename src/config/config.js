// src/config/config.js
require("dotenv").config();

// 데이터베이스 설정 객체 생성
const config = {
  development: {
    port: parseInt(process.env.DEV_DATABASE_PORT || "3306", 10),
    host: process.env.DEV_DATABASE_HOST || "localhost",
    database: process.env.DEV_DATABASE_NAME || "dev_db",
    username: process.env.DEV_DATABASE_USER || "root",
    password: process.env.DEV_DATABASE_PASSWORD || "password",
    dialect: process.env.DEV_DATABASE_PASSWORD || "mariadb",
    ssl: false,
  },
  test: {
    port: parseInt(process.env.DEV_DATABASE_PORT || "3306", 10),
    host: process.env.DEV_DATABASE_HOST || "localhost",
    database: process.env.DEV_DATABASE_NAME || "",
    username: process.env.DEV_DATABASE_USER || "",
    password: process.env.DEV_DATABASE_PASSWORD || "",
    dialect: process.env.DEV_DATABASE_DIALECT || "mariadb",
    ssl: false,
  },
  production: {
    port: parseInt(process.env.DATABASE_PORT || "5432", 10),
    host: process.env.DATABASE_HOST || "localhost",
    database: process.env.DATABASE_NAME || "",
    username: process.env.DATABASE_USER || "",
    password: process.env.DATABASE_PASSWORD || "",
    dialect: process.env.DATABASE_DIALECT || "postgres",
    ssl: true,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
};

module.exports = config;
