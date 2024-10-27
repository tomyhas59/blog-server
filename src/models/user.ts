import { DataTypes, Model, Sequelize } from "sequelize";
import { Image } from "./image";
import { Post } from "./post";
import { Comment } from "./comment";
import { ChatRoom } from "./chatRoom";
import { ChatMessage } from "./chatMessage";
interface UserAttributes {
  id?: number;
  email: string;
  nickname: string;
  password: string;
}

export class User extends Model<UserAttributes> implements UserAttributes {
  public id?: number;
  public email!: string;
  public nickname!: string;
  public password!: string;

  public static initModel(sequelize: Sequelize): typeof User {
    User.init(
      {
        id: {
          type: DataTypes.INTEGER,
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
    ChatRoom: typeof ChatRoom;
    ChatMessage: typeof ChatMessage;
    User: typeof User;
  }) {
    User.hasOne(models.Image);
    User.hasMany(models.Post, { foreignKey: "userIdx" });
    User.hasMany(models.Comment);

    User.belongsToMany(models.Post, {
      through: "Like",
      as: "Liked",
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
  }
  // 사용자에 의해 팔로우된 사용자들을 반환하는 메서드
  public async getFollowings(): Promise<User[]> {
    try {
      const followings = await this.getFollowings(); // 현재 사용자의 팔로우 목록을 가져옴
      return followings;
    } catch (error) {
      console.error("팔로우 목록 조회 오류:", error);
      throw new Error("팔로우 목록을 가져오는 데 실패했습니다.");
    }
  }

  // 팔로우할 사용자를 추가하는 메서드
  public async addFollowings(followUser: User): Promise<void> {
    try {
      await this.addFollowings(followUser); // 실제 팔로우 관계 추가
    } catch (error) {
      console.error("팔로우 추가 오류:", error);
      throw new Error("팔로우 추가에 실패했습니다.");
    }
  }

  public async removeFollowings(unFollow: User) {
    try {
      await this.removeFollowings(unFollow); // 실제 팔로우 관계 추가
    } catch (error) {
      console.error("팔로우 추가 오류:", error);
      throw new Error("팔로우 추가에 실패했습니다.");
    }
  }
}
