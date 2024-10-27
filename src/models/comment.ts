import { DataTypes, Model, Sequelize } from "sequelize";
import { User } from "./user";
import { Post } from "./post";
import { ReComment } from "./recomment";

interface CommentAttributes {
  content: string;
}

export class Comment
  extends Model<CommentAttributes>
  implements CommentAttributes
{
  public content!: string;

  public static initModel(sequelize: Sequelize): typeof Comment {
    Comment.init(
      {
        content: {
          type: DataTypes.TEXT,
          allowNull: false,
          comment: "코멘트",
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
