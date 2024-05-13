"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("images", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      src: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: "이미지",
      },
      PostId: {
        //Post와의 관계를 위한 외래 키
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "posts",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("now"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("now"),
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("Images");
  },
};

//npx sequelize-cli migration:generate --name create-recomments

// await queryInterface.createTable("테이블명", 컬럼명: {type: Sequelize.TEXT, ....})
// await queryInterface.dropTable('테이블명')
// await queryInterface.addColumn("테이블명", "추가하는 컬럼명",  {type: Sequelize.TEXT, ....})
// await queryInterface.removeColumn("테이블명", "제거하는 컬럼 명")
// await queryInterface.renameColumn("테이블명", "컬럼 이름 변경 전" , "컬럼 이름 변경 후" )
// await queryInterface.changeColumn("테이블명", "컬럼명",  {type: Sequelize.TEXT, ....})

//npx sequelize db:migrate
//npx sequelize db:migrate:undo
