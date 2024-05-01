const Sequelize = require("sequelize");

module.exports = class Post extends Sequelize.Model {
  static init(sequelize) {
    return super.init(
      {
        content: {
          type: Sequelize.TEXT,
          allowNull: false,
          comment: "포스트",
        },
      },
      {
        modelName: "Post",
        tableName: "posts",
        charset: "utf8mb4",
        collate: "utf8mb4_general_ci", //한글, 이모티콘 저장
        timestamps: true, //updateAt, createAt 생성
        sequelize,
      }
    );
  }
  static associate(db) {
    db.Post.belongsTo(db.User, { foreignKey: "userIdx" } /*컬럼명 */);
    db.Post.hasMany(db.Comment); //hasMany 관계로 인해 s가 붙어서 post.Comments 이런 식으로 제공
    db.Post.hasMany(db.Image); //as로 별칭 지정 안 하면 addImages 이런 식으로 해당 modelName의 복수형으로 액세스 가능
    db.Post.belongsToMany(db.User, {
      through: "Like", // Like 라는 테이블 생성, UserId 컬럼 생김
      as: "Likers" /* route에서 addLikers, getLikers, removeLikers 등의 매서드에 액세스 가능*/,
    });
  }
};
