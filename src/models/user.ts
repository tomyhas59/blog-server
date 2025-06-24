import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { Image } from "./image";
import { Post } from "./post";
import { Comment } from "./comment";
import { ChatRoom } from "./chatRoom";
import { ChatMessage } from "./chatMessage";
import { Notification } from "./notification";
import { Reply } from "./reply";

interface UserAttributes {
  id: number;
  email: string;
  nickname: string;
  password: string;
}

// id는 선택적 속성이기 때문에, 'id'를 Optional로 설정
interface UserCreationAttributes extends Optional<UserAttributes, "id"> {}

export class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  public id!: number;
  public email!: string;
  public nickname!: string;
  public password!: string;
  public addFollowings!: (follow: User) => Promise<void>;
  public getFollowings!: () => Promise<User[]>;
  public removeFollowings!: (unFollow: User) => Promise<void>;
  public static initModel(sequelize: Sequelize): typeof User {
    User.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        email: {
          type: DataTypes.STRING(30),
          allowNull: false,
          unique: true,
          comment: "이메일",
        },
        nickname: {
          type: DataTypes.STRING(100),
          allowNull: false,
          comment: "닉네임",
        },
        password: {
          type: DataTypes.STRING(100),
          allowNull: false,
          comment: "비밀번호",
        },
      },
      {
        modelName: "User",
        tableName: "users",
        timestamps: true,
        charset: "utf8",
        collate: "utf8_general_ci",
        sequelize,
      }
    );
    return User;
  }

  public static associate(models: {
    Image: typeof Image;
    Post: typeof Post;
    Comment: typeof Comment;
    Reply: typeof Reply;
    ChatRoom: typeof ChatRoom;
    ChatMessage: typeof ChatMessage;
    User: typeof User;
    Notification: typeof Notification;
  }) {
    User.hasOne(models.Image);
    User.hasMany(models.Post, { foreignKey: "userIdx" });
    User.hasMany(models.Comment);

    User.belongsToMany(models.Post, {
      through: "Like",
      as: "Liked",
    });

    User.belongsToMany(models.Comment, {
      through: "CommentLike",
      as: "CommentLiked",
    });

    User.belongsToMany(models.Reply, {
      through: "ReplyLike",
      as: "ReplyLiked",
    });

    User.belongsToMany(models.User, {
      through: "Follow",
      as: "Followers",
      foreignKey: "FollowingsId",
    });

    User.belongsToMany(models.User, {
      through: "Follow",
      as: "Followings",
      foreignKey: "FollowersId",
    });

    User.hasMany(models.ChatRoom, {
      foreignKey: "User1Id",
      as: "User1Rooms",
    });

    User.hasMany(models.ChatRoom, {
      foreignKey: "User2Id",
      as: "User2Rooms",
    });

    User.hasMany(models.ChatMessage);
    User.hasMany(models.Notification);
  }
}
