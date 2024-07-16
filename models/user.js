const Sequelize = require("sequelize");

module.exports = class User extends Sequelize.Model {
  static init(sequelize) {
    return super.init(
      {
        //id는 기본 제공
        email: {
          type: Sequelize.STRING(30), //STRING, TEXT, BOOLEAN, INTEGER(정수), FLOAT(실수) , DATETIME
          allowNull: false, //필수인지 아닌지 false면 필수
          unique: true, //고유한 값
          comment: "이메일",
        },
        nickname: {
          type: Sequelize.STRING(100),
          allowNull: false, //필수인지 아닌지 false면 필수
          comment: "닉네임",
        },
        password: {
          type: Sequelize.STRING(100),
          allowNull: false, //필수인지 아닌지 false면 필수
          comment: "비밀번호",
        },
      },
      {
        modelName: "User",
        tableName: "users",
        timestamps: true, //updatedAt, createdAt 생성
        charset: "utf8",
        collate: "utf8_general_ci", //한글 저장
        sequelize,
      }
    );
  }
  static associate(db) {
    db.User.hasMany(db.Post, { foreignKey: "userIdx" });
    db.User.hasMany(db.Comment);
    db.User.belongsToMany(db.Post, {
      through: "Like", // 테이블 이름으로 생성, PostId 컬럼 생김
      as: "Liked" /* route에서 addLiked, getLiked, removeLiked 등의 매서드에 액세스 가능*/,
    });
    db.User.hasMany(db.ChatRoom, {
      foreignKey: "User1Id",
      as: "User1Rooms",
    });
    db.User.hasMany(db.ChatRoom, {
      foreignKey: "User2Id",
      as: "User2Rooms",
    });
    db.User.hasMany(db.ChatMessage);
  }
};
