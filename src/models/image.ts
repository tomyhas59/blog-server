import { DataTypes, Model, Sequelize, Optional } from "sequelize";
import { Post } from "./post"; // Post 모델 경로 수정 필요
import { User } from "./user"; // User 모델 경로 수정 필요

interface ImageAttributes {
  id?: number;
  src: string;
  PostId?: number;
  UserId?: number;
}

type ImageCreationAttributes = Optional<ImageAttributes, "id">;

export class Image
  extends Model<ImageAttributes, ImageCreationAttributes>
  implements ImageAttributes
{
  public id?: number;
  public src!: string;
  public PostId?: number;
  public UserId?: number;

  public static initModel(sequelize: Sequelize): typeof Image {
    Image.init(
      {
        src: {
          type: DataTypes.STRING(200),
          allowNull: false,
          comment: "이미지",
        },
        PostId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: "posts",
            key: "id",
          },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        UserId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: "users",
            key: "id",
          },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
      },
      {
        modelName: "Image",
        tableName: "images",
        charset: "utf8",
        collate: "utf8_general_ci",
        sequelize,
      }
    );
    return Image;
  }

  public static associate(models: { Post: typeof Post; User: typeof User }) {
    Image.belongsTo(models.Post);
    Image.belongsTo(models.User);
  }
}