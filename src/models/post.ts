import { DataTypes, Model, Sequelize, Optional } from "sequelize";
import { User } from "./user";
import { Comment } from "./comment";
import { Image } from "./image";
import { Reply } from "./reply";
import { Notification } from "./notification";
import { Hashtag } from "./hashtag";

interface PostAttributes {
  id?: number;
  title: string;
  content: string;
  userIdx?: number;
  viewCount: number;
  User?: User;
}

type PostCreationAttributes = Optional<PostAttributes, "id">;

export class Post
  extends Model<PostAttributes, PostCreationAttributes>
  implements PostAttributes
{
  public id!: number;
  public title!: string;
  public content!: string;
  public userIdx?: number;
  public viewCount!: number;
  public User!: User;

  public addImages!: (images: Image[]) => Promise<void>;
  public removeLikers!: (UserId: number) => Promise<void>;
  public addLikers!: (UserId: number) => Promise<void>;
  public addHashtags!: (Hashtags: Hashtag[]) => Promise<void>;
  public setHashtags!: (hashtags: Hashtag[] | number[]) => Promise<void>;

  public static initModel(sequelize: Sequelize): typeof Post {
    Post.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        title: {
          type: DataTypes.TEXT,
          allowNull: false,
          comment: "제목",
        },
        content: {
          type: DataTypes.TEXT,
          allowNull: false,
          comment: "포스트",
        },
        viewCount: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          allowNull: false,
          comment: "조회 수",
        },
      },
      {
        modelName: "Post",
        tableName: "posts",
        charset: "utf8mb4",
        collate: "utf8mb4_general_ci",
        timestamps: true,
        sequelize,
      }
    );
    return Post;
  }

  public static associate(models: {
    User: typeof User;
    Comment: typeof Comment;
    Image: typeof Image;
    Reply: typeof Reply;
    Notification: typeof Notification;
    Hashtag: typeof Hashtag;
  }) {
    Post.belongsTo(models.User, { foreignKey: "userIdx" });
    Post.hasMany(models.Comment);
    Post.hasMany(models.Image);
    Post.hasMany(models.Reply);
    Post.hasMany(models.Notification);
    Post.belongsToMany(models.User, {
      through: "Like",
      as: "Likers",
    });

    Post.belongsToMany(models.Hashtag, {
      through: "PostHashtag",
      foreignKey: "postId",
      otherKey: "hashtagId",
    });
  }
}
