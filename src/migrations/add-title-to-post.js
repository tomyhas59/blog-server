"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("posts", "title", {
      type: Sequelize.TEXT,
      allowNull: false,
      comment: "제목",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("posts", "title");
  },
};
