import { Sequelize, Dialect } from "sequelize";
import dotenv from "dotenv";

// dotenv 설정
dotenv.config();

// 데이터베이스 구성 인터페이스 정의
interface DatabaseConfig {
  port: number;
  host: string;
  database: string;
  username: string;
  password: string;
  dialect: Dialect;
  ssl?: boolean; // ssl 속성을 boolean으로 단순화
  dialectOptions?: {
    ssl?: {
      // ssl을 dialectOptions 안에 넣고 선택적으로 사용
      require: boolean;
      rejectUnauthorized: boolean;
    };
  };
}

// 데이터베이스 설정
interface Config {
  development: DatabaseConfig;
  test: DatabaseConfig;
  production: DatabaseConfig;
}

// 설정 객체 생성
const config: Config = {
  development: {
    port: parseInt(process.env.DEV_DATABASE_PORT || "3306", 10),
    host: process.env.DEV_DATABASE_HOST!,
    database: process.env.DEV_DATABASE_NAME!,
    username: process.env.DEV_DATABASE_USER!,
    password: process.env.DEV_DATABASE_PASSWORD!,
    dialect: "mariadb",
    ssl: false, // ssl을 필요에 따라 설정
  },
  test: {
    port: parseInt(process.env.DEV_DATABASE_PORT || "3306", 10),
    host: process.env.DEV_DATABASE_HOST!,
    database: process.env.DEV_DATABASE_NAME!,
    username: process.env.DEV_DATABASE_USER!,
    password: process.env.DEV_DATABASE_PASSWORD!,
    dialect: "mariadb",
    ssl: false, // ssl을 필요에 따라 설정
  },
  production: {
    port: parseInt(process.env.DATABASE_PORT || "5432", 10),
    host: process.env.DATABASE_HOST!,
    database: process.env.DATABASE_NAME!,
    username: process.env.DATABASE_USER!,
    password: process.env.DATABASE_PASSWORD!,
    dialect: "postgres",
    ssl: true, // ssl을 사용
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
};

export default config;
