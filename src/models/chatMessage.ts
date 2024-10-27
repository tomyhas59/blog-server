import { DataTypes, Model, Sequelize } from "sequelize";
import { User } from "./user";
import { ChatRoom } from "./chatRoom";

interface ChatMessageAttributes {
  id?: number;
  content: string;
  isRead: boolean;
  ChatRoomId: number;
  UserId: number;
}

export class ChatMessage
  extends Model<ChatMessageAttributes>
  implements ChatMessageAttributes
{
  public id?: number;
  public content!: string;
  public isRead!: boolean;
  public ChatRoomId!: number;
  public UserId!: number;

  public static initModel(sequelize: Sequelize): typeof ChatMessage {
    ChatMessage.init(
      {
        id: {
          type: DataTypes.INTEGER,
        },
        content: {
          type: DataTypes.TEXT,
          allowNull: false,
          comment: "채팅 메시지",
        },
        isRead: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: "메시지가 읽혔는지 여부",
        },
        UserId: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        ChatRoomId: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
      },
      {
        modelName: "ChatMessage",
        tableName: "chatMessages",
        timestamps: true,
        charset: "utf8",
        collate: "utf8_general_ci",
        sequelize,
      }
    );
    return ChatMessage;
  }

  public static associate(models: {
    User: typeof User;
    ChatRoom: typeof ChatRoom;
  }) {
    ChatMessage.belongsTo(models.User);
    ChatMessage.belongsTo(models.ChatRoom);
  }
}
