import { Sequelize } from "sequelize";
import { Post } from "./post";
import { User } from "./user";
import { Comment } from "./comment";
import { ReComment } from "./recomment";
import { Image } from "./image";
import { ChatMessage } from "./chatMessage";
import { ChatRoom } from "./chatRoom";
import config from "../config/config";

// Sequelize 인스턴스 생성
const env = (process.env.NODE_ENV || "development") as
  | "development"
  | "test"
  | "production";
const dbConfig = config[env];

// sequelize 인스턴스 생성 시 ssl 속성 제거
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    ssl: dbConfig.ssl || false, // boolean으로 설정
    dialectOptions: dbConfig.ssl
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : undefined, // ssl 설정 추가
  }
);

interface Db {
  sequelize: Sequelize;
  Sequelize: typeof Sequelize;
  User: typeof User;
  Post: typeof Post;
  Image: typeof Image;
  Comment: typeof Comment;
  ReComment: typeof ReComment;
  ChatMessage: typeof ChatMessage;
  ChatRoom: typeof ChatRoom;
}

const db: Db = {
  sequelize,
  Sequelize,
  User,
  Post,
  Image,
  Comment,
  ReComment,
  ChatMessage,
  ChatRoom,
};

// 각 모델의 init 메서드를 호출하여 초기화
Object.values(db).forEach((model) => {
  if ((model as any).init) {
    (model as any).init(sequelize);
  }
});

// 각 모델의 associate 메서드를 호출하여 관계 설정
Object.values(db).forEach((model) => {
  if ((model as any).associate) {
    (model as any).associate(db);
  }
});

export default db;
