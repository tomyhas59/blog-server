const Sequelize = require("sequelize");

module.exports = class ReComment extends Sequelize.Model {
  static init(sequelize) {
    return super.init(
      {
        content: {
          type: Sequelize.TEXT,
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
  }
  static associate(db) {
    db.ReComment.belongsTo(db.User);
    db.ReComment.belongsTo(db.Post);
    db.ReComment.belongsTo(db.Comment);
  }
};
