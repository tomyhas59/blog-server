"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("recomments", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: "리코멘트",
      },
      UserId: {
        // 댓글 작성자인 User와의 관계를 위한 외래 키
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      PostId: {
        // 댓글 작성자인 Post와의 관계를 위한 외래 키
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "posts",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      CommentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Comments", // db.Comment 테이블과 연결됨
          key: "id",
        },
        onUpdate: "CASCADE", //참조하는 레코드가 업데이트될 때 해당 레코드와 연결된 모든 레코드도 업데이트
        onDelete: "CASCADE", //참조하는 레코드 삭제 시 해당 모든 레코드 삭제
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
    await queryInterface.dropTable("ReComments");
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
