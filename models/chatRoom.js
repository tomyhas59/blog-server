const Sequelize = require("sequelize");

module.exports = class ChatRoom extends Sequelize.Model {
  static init(sequelize) {
    return super.init(
      {
        roomType: {
          type: Sequelize.STRING(20),
          allowNull: false,
          comment: "채팅방 종류 (oneOnone, group)",
        },
      },
      {
        modelName: "ChatRoom",
        tableName: "chatRooms",
        timestamps: true,
        charset: "utf8",
        collate: "utf8_general_ci",
        sequelize,
      }
    );
  }

  static associate(db) {
    db.ChatRoom.belongsToMany(db.User, {
      through: "UserChatRoom",
      as: "Users",
    });
    db.ChatRoom.hasMany(db.ChatMessage);
  }
};
