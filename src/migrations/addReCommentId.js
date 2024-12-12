"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("notifications", "ReCommentId", {
      type: Sequelize.INTEGER,
      allowNull: true, // Optional: true로 설정하면 NULL 값을 허용
      references: {
        model: "recomments", // 연관된 테이블 이름
        key: "id", // 연관된 테이블의 컬럼 이름
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("notifications", "ReCommentId");
  },
};

//npx sequelize-cli db:migrate
//$env:NODE_ENV="production"; npx sequelize-cli db:migrate
