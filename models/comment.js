const Sequelize = require("sequelize");

module.exports = class Comment extends Sequelize.Model {
  static init(sequelize) {
    return super.init(
      {
        content: {
          type: Sequelize.TEXT,
          allowNull: false,
          comment: "코멘트",
        },
      },
      {
        modelName: "Comment",
        tableName: "comments",
        charset: "utf8",
        collate: "utf8_general_ci", //한글 저장
        timestamps: true, //updateAt, createAt 생성
        sequelize,
      }
    );
  }
  static associate(db) {
    db.Comment.belongsTo(db.User);
    db.Comment.belongsTo(db.Post);
    db.Comment.hasMany(db.ReComment);
  }
};
