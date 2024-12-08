"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("notifications", "CommentId", {
      type: Sequelize.INTEGER,
      allowNull: true, // Optional: true로 설정하면 NULL 값을 허용
      references: {
        model: "comments", // 연관된 테이블 이름
        key: "id", // 연관된 테이블의 컬럼 이름
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL", // Post 삭제 시 Notification의 PostId를 NULL로 설정
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("notifications", "CommentId");
  },
};

//npx sequelize-cli db:migrate
