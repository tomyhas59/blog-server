"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("chatMessages", "isRead", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "메시지가 읽혔는지 여부",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("chatMessages", "isRead");
  },
};
