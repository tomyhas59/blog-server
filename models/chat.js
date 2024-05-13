const Sequelize = require("sequelize");

module.exports = class Chat extends Sequelize.Model {
  static init(sequelize) {
    return super.init(
      {
        sender: {
          type: Sequelize.STRING(100),
          allowNull: false,
          comment: "보낸 사람의 닉네임",
        },
        content: {
          type: Sequelize.TEXT,
          allowNull: false,
          comment: "채팅 메시지 내용",
        },
      },
      {
        modelName: "Chat",
        tableName: "chats",
        timestamps: true, //updateAt, createAt 생성
        charset: "utf8mb4",
        collate: "utf8mb4_general_ci",
        sequelize,
      }
    );
  }

  static associate(db) {
    db.Chat.belongsTo(db.User);
  }
};
