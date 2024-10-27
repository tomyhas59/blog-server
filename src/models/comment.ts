import { DataTypes, Model, Sequelize } from "sequelize";
import { User } from "./user";
import { Post } from "./post";
import { ReComment } from "./recomment";

interface CommentAttributes {
  id?: number;
  content: string;
  UserId: number;
  PostId: number;
}

export class Comment
  extends Model<CommentAttributes>
  implements CommentAttributes
{
  public id!: number;
  public content!: string;
  public UserId!: number;
  public PostId!: number;

  public static initModel(sequelize: Sequelize): typeof Comment {
    Comment.init(
      {
        id: {
          type: DataTypes.INTEGER,
        },
        content: {
          type: DataTypes.TEXT,
          allowNull: false,
          comment: "코멘트",
        },
        UserId: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        PostId: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
      },
      {
        modelName: "Comment",
        tableName: "comments",
        charset: "utf8",
        collate: "utf8_general_ci",
        timestamps: true,
        sequelize,
      }
    );
    return Comment;
  }

  public static associate(models: {
    User: typeof User;
    Post: typeof Post;
    ReComment: typeof ReComment;
  }) {
    Comment.belongsTo(models.User);
    Comment.belongsTo(models.Post);
    Comment.hasMany(models.ReComment);
  }
}
