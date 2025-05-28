import { DataTypes, Model, Sequelize } from "sequelize";
import { User } from "./user";
import { Post } from "./post";
import { ReComment } from "./recomment";

interface CommentAttributes {
  id?: number;
  content: string;
  UserId: number;
  PostId: number;
  ReComments?: ReComment[];
  createdAt?: Date;
}

export class Comment
  extends Model<CommentAttributes>
  implements CommentAttributes
{
  public id!: number;
  public content!: string;
  public UserId!: number;
  public PostId!: number;
  public ReComments!: ReComment[];
  public readonly createdAt!: Date;
  public removeLikers!: (UserId: number) => Promise<void>;
  public addLikers!: (UserId: number) => Promise<void>;

  public static initModel(sequelize: Sequelize): typeof Comment {
    Comment.init(
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
    Comment.belongsToMany(models.User, {
      through: "CommentLike",
      as: "Likers",
    });
  }
}
