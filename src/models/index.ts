import { Sequelize } from "sequelize";
import config from "../config/config";
import { Post } from "./post";
import { User } from "./user";
import { Comment } from "./comment";
import { Reply } from "./reply";
import { Image } from "./image";
import { ChatMessage } from "./chatMessage";
import { ChatRoom } from "./chatRoom";
import { Notification } from "./notification";
import { Dialect } from "sequelize";
import { Hashtag } from "./hashtag";

const env = (process.env.NODE_ENV || "development") as
  | "development"
  | "test"
  | "production";
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect as Dialect,
    ssl: dbConfig.ssl || false,
    dialectOptions: dbConfig.ssl
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : undefined,
  }
);

interface Db {
  sequelize: Sequelize;
  Sequelize: typeof Sequelize;
  User: typeof User;
  Post: typeof Post;
  Comment: typeof Comment;
  Image: typeof Image;
  Reply: typeof Reply;
  ChatMessage: typeof ChatMessage;
  ChatRoom: typeof ChatRoom;
  Notification: typeof Notification;
  Hashtag: typeof Hashtag;
}

const models: Db = {
  sequelize,
  Sequelize,
  User: User.initModel(sequelize),
  Post: Post.initModel(sequelize),
  Comment: Comment.initModel(sequelize),
  Reply: Reply.initModel(sequelize),
  Image: Image.initModel(sequelize),
  ChatMessage: ChatMessage.initModel(sequelize),
  ChatRoom: ChatRoom.initModel(sequelize),
  Notification: Notification.initModel(sequelize),
  Hashtag: Hashtag.initModel(sequelize),
};

// 각 모델의 associate 메서드 호출
Object.values(models).forEach((model) => {
  if ((model as any).associate) {
    (model as any).associate(models);
  }
});

export default models;
