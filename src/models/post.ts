import { DataTypes, Model, Sequelize, Optional } from "sequelize";
import { User } from "./user"; // User 모델 경로 수정 필요
import { Comment } from "./comment"; // Comment 모델 경로 수정 필요
import { Image } from "./image"; // Image 모델 경로 수정 필요

interface PostAttributes {
  id?: number;
  content: string;
  userIdx?: number;
}

type PostCreationAttributes = Optional<PostAttributes, "id">;

export class Post
  extends Model<PostAttributes, PostCreationAttributes>
  implements PostAttributes
{
  public id!: number;
  public content!: string;
  public userIdx?: number;

  public addImages!: (images: Image[]) => Promise<void>;
  public removeLikers!: (UserId: number) => Promise<void>;
  public addLikers!: (UserId: number) => Promise<void>;

  public static initModel(sequelize: Sequelize): typeof Post {
    Post.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        content: {
          type: DataTypes.TEXT,
          allowNull: false,
          comment: "포스트",
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
  }) {
    Post.belongsTo(models.User, { foreignKey: "userIdx" });
    Post.hasMany(models.Comment);
    Post.hasMany(models.Image);
    Post.belongsToMany(models.User, {
      through: "Like",
      as: "Likers",
    });
  }
}
