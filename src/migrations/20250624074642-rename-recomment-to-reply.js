"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameTable("recomments", "replies");
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameTable("replies", "recomments");
  },
};
