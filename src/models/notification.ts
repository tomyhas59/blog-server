import { Model, DataTypes, Sequelize, Optional } from "sequelize";
import { User } from "./user";
import { Post } from "./post";

interface NotificationAttributes {
  id: number;
  UserId: number;
  PostId?: number;
  CommentId?: number;
  ReplyId?: number;
  type: "FOLLOW" | "SYSTEM";
  message: string;
  isRead: boolean;
}

interface NotificationCreationAttributes
  extends Optional<NotificationAttributes, "id"> {}

export class Notification
  extends Model<NotificationCreationAttributes>
  implements NotificationAttributes
{
  public id!: number;
  public UserId!: number;
  public PostId?: number;
  public CommentId?: number;
  public ReplyId?: number;
  public type!: "FOLLOW" | "SYSTEM";
  public message!: string;
  public isRead!: boolean;

  static initModel(sequelize: Sequelize): typeof Notification {
    Notification.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        UserId: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        PostId: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        CommentId: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        ReplyId: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        type: {
          type: DataTypes.ENUM("FOLLOW", "SYSTEM"),
          allowNull: false,
        },
        message: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        isRead: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
      },
      {
        modelName: "Notification",
        tableName: "notifications",
        charset: "utf8",
        collate: "utf8_general_ci",
        timestamps: true,
        sequelize,
      }
    );
    return Notification;
  }

  static associate(models: { User: typeof User; Post: typeof Post }) {
    Notification.belongsTo(models.User, { foreignKey: "UserId" });
    Notification.belongsTo(models.Post, { foreignKey: "PostId" });
  }
}
