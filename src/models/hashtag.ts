import { DataTypes, Model, Sequelize, Optional } from "sequelize";
import { Post } from "./post";

interface HashtagAttributes {
  id?: number;
  name: string;
}

type HashtagCreationAttributes = Optional<HashtagAttributes, "id">;

export class Hashtag
  extends Model<HashtagAttributes, HashtagCreationAttributes>
  implements HashtagAttributes
{
  public id!: number;
  public name!: string;

  public static initModel(sequelize: Sequelize): typeof Hashtag {
    Hashtag.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: false,
          unique: true,
        },
      },
      {
        modelName: "Hashtag",
        tableName: "hashtags",
        charset: "utf8mb4",
        collate: "utf8mb4_general_ci",
        timestamps: true,
        sequelize,
      }
    );
    return Hashtag;
  }

  public static associate(models: { Post: typeof Post }) {
    Hashtag.belongsToMany(models.Post, {
      through: "PostHashtag",
      foreignKey: "hashtagId",
      otherKey: "postId",
    });
  }
}
