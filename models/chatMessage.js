const Sequelize = require("sequelize");

module.exports = class ChatMessage extends Sequelize.Model {
  static init(sequelize) {
    return super.init(
      {
        content: {
          type: Sequelize.TEXT,
          allowNull: false,
          comment: "채팅 메시지",
        },
      },
      {
        modelName: "ChatMessage",
        tableName: "chatMessages",
        timestamps: true,
        charset: "utf8",
        collate: "utf8_general_ci",
        sequelize,
      }
    );
  }

  static associate(db) {
    db.ChatMessage.belongsTo(db.User);
    db.ChatMessage.belongsTo(db.ChatRoom);
  }
};
