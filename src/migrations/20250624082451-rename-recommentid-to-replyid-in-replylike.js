"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 컬럼 이름 변경
    await queryInterface.renameColumn("ReplyLike", "ReCommentId", "ReplyId");
  },

  down: async (queryInterface, Sequelize) => {
    // 롤백 시 원래대로 되돌림
    await queryInterface.renameColumn("ReplyLike", "ReplyId", "ReCommentId");
  },
};
