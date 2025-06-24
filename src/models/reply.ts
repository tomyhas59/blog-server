import { DataTypes, Model, Sequelize } from "sequelize";
import { User } from "./user";
import { Post } from "./post";
import { Comment } from "./comment";

interface ReplyAttributes {
  id?: number;
  content: string;
  UserId: number;
  PostId?: number;
  CommentId: number;
}

export class Reply extends Model<ReplyAttributes> implements ReplyAttributes {
  public id!: number;
  public content!: string;
  public UserId!: number;
  public PostId?: number;
  public CommentId!: number;

  public removeLikers!: (UserId: number) => Promise<void>;
  public addLikers!: (UserId: number) => Promise<void>;

  public static initModel(sequelize: Sequelize): typeof Reply {
    Reply.init(
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
        modelName: "Reply",
        tableName: "replies",
        charset: "utf8",
        collate: "utf8_general_ci", //한글 저장
        timestamps: true, //updatedAt, createdAt 생성
        sequelize,
      }
    );
    return Reply;
  }

  public static associate(models: {
    User: typeof User;
    Post: typeof Post;
    Comment: typeof Comment;
  }) {
    Reply.belongsTo(models.Comment);
    Reply.belongsTo(models.Post);
    Reply.belongsTo(models.User);
    Reply.belongsToMany(models.User, {
      through: "ReplyLike",
      as: "Likers",
    });
  }
}
