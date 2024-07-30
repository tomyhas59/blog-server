const Sequelize = require("sequelize");

module.exports = class Image extends Sequelize.Model {
  static init(sequelize) {
    return super.init(
      {
        src: {
          type: Sequelize.STRING(200),
          allowNull: false,
          comment: "이미지",
        },
        PostId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: "posts",
            key: "id",
          },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        UserId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: "users",
            key: "id",
          },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
      },
      {
        modelName: "Image",
        tableName: "images",
        charset: "utf8",
        collate: "utf8_general_ci", //한글  저장
        sequelize,
      }
    );
  }
  static associate(db) {
    db.Image.belongsTo(db.Post);
    db.Image.belongsTo(db.User);
  }
};
