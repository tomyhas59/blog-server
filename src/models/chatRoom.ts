import { DataTypes, Model, Sequelize } from "sequelize";
import { User } from "./user"; // User 모델 경로 수정 필요
import { ChatMessage } from "./chatMessage"; // ChatMessage 모델 경로 수정 필요

interface ChatRoomAttributes {
  id?: number;
  User1Id: number;
  User2Id: number;
  User1Join?: boolean;
  User2Join?: boolean;
}

export class ChatRoom
  extends Model<ChatRoomAttributes>
  implements ChatRoomAttributes
{
  public id!: number;
  public User1Id!: number;
  public User2Id!: number;
  public User1Join!: boolean;
  public User2Join!: boolean;

  public static initModel(sequelize: Sequelize): typeof ChatRoom {
    ChatRoom.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        User1Id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          comment: "User ID of User 1 in the chat room",
        },
        User2Id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          comment: "User ID of User 2 in the chat room",
        },
        User1Join: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
        },
        User2Join: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
        },
      },
      {
        modelName: "ChatRoom",
        tableName: "chatRooms",
        timestamps: true,
        charset: "utf8",
        collate: "utf8_general_ci",
        sequelize,
      }
    );
    return ChatRoom;
  }

  public static associate(models: {
    User: typeof User;
    ChatMessage: typeof ChatMessage;
  }) {
    ChatRoom.belongsTo(models.User, {
      foreignKey: "User1Id",
      as: "User1",
    });

    ChatRoom.belongsTo(models.User, {
      foreignKey: "User2Id",
      as: "User2",
    });

    ChatRoom.hasMany(models.ChatMessage, {
      foreignKey: "ChatRoomId",
    });
  }
}
