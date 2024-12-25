"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("posts", "viewCount", {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: "조회 수",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("posts", "viewCount");
  },
};

//npx sequelize-cli db:migrate
//$env:NODE_ENV="production"; npx sequelize-cli db:migrate
