const Sequelize = require("sequelize");

module.exports = class ChatRoom extends Sequelize.Model {
  static init(sequelize) {
    return super.init(
      {
        User1Id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: "User ID of User 1 in the chat room",
        },
        User2Id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: "User ID of User 2 in the chat room",
        },
        User1Join: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
        },
        User2Join: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
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
    db.ChatRoom.belongsTo(db.User, {
      foreignKey: "User1Id",
      as: "User1",
    });

    db.ChatRoom.belongsTo(db.User, {
      foreignKey: "User2Id",
      as: "User2",
    });

    db.ChatRoom.hasMany(db.ChatMessage, {
      foreignKey: "ChatRoomId",
    });
  }
};
