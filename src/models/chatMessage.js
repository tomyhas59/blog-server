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
        isRead: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: "메시지가 읽혔는지 여부",
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
