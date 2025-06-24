"use strict";

// migration file
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameTable("ReCommentLike", "ReplyLike");
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameTable("ReplyLike", "ReCommentLike");
  },
};
