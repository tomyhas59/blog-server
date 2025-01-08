import { DataTypes, Model, Sequelize } from "sequelize";
import { User } from "./user";
import { Post } from "./post";
import { Comment } from "./comment";

interface ReCommentAttributes {
  id?: number;
  content: string;
  UserId: number;
  PostId?: number;
  CommentId: number;
}

export class ReComment
  extends Model<ReCommentAttributes>
  implements ReCommentAttributes
{
  public id!: number;
  public content!: string;
  public UserId!: number;
  public PostId?: number;
  public CommentId!: number;

  public removeReCommentLikers!: (UserId: number) => Promise<void>;
  public addReCommentLikers!: (UserId: number) => Promise<void>;

  public static initModel(sequelize: Sequelize): typeof ReComment {
    ReComment.init(
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
          comment: "리코멘트",
        },
        UserId: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        PostId: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        CommentId: {
          type: DataTypes.INTEGER,
          allowNull: false,
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
    ReComment.belongsToMany(models.User, {
      through: "ReCommentLike",
      as: "ReCommentLikers",
    });
  }
}
