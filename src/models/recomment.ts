import { DataTypes, Model, Sequelize } from "sequelize";
import { User } from "./user";
import { Post } from "./post";
import { Comment } from "./comment";

interface ReCommentAttributes {
  content: string;
}

export class ReComment
  extends Model<ReCommentAttributes>
  implements ReCommentAttributes
{
  public content!: string;

  public static initModel(sequelize: Sequelize): typeof ReComment {
    ReComment.init(
      {
        content: {
          type: DataTypes.TEXT,
          allowNull: false,
          comment: "리코멘트",
        },
      },
      {
        modelName: "ReComment",
        tableName: "recomments",
        charset: "utf8",
        collate: "utf8_general_ci", //한글 저장
        timestamps: true, //updatedAt, createdAt 생성
        sequelize,
      }
    );
    return ReComment;
  }

  public static associate(models: {
    User: typeof User;
    Post: typeof Post;
    Comment: typeof Comment;
  }) {
    ReComment.belongsTo(models.Comment);
    ReComment.belongsTo(models.Post);
    ReComment.belongsTo(models.User);
  }
}
