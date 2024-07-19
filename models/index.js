const Sequelize = require("sequelize");
const post = require("./post");
const user = require("./user");
const comment = require("./comment");
const recomment = require("./recomment");
const image = require("./image");
const chat = require("./chat");
const chatMessage = require("./chatMessage");
const chatRoom = require("./chatRoom");

const env = process.env.NODE_ENV || "development";
const config = require("../config/config");
const dbconfig = config[env];
const db = {};

const sequelize = new Sequelize(
  dbconfig.database,
  dbconfig.username,
  dbconfig.password,
  dbconfig
);

db.User = user;
db.Post = post;
db.Image = image;
db.Comment = comment;
db.ReComment = recomment;
db.Chat = chat;
db.ChatMessage = chatMessage;
db.ChatRoom = chatRoom;

Object.keys(db).forEach((modelName) => {
  db[modelName].init(sequelize);
});
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;

//npx sequelize-cli migration:generate --name create

// await queryInterface.createTable("테이블명", 컬럼명: {type: Sequelize.TEXT, ....})
// await queryInterface.dropTable('테이블명')
// await queryInterface.addColumn("테이블명", "추가하는 컬럼명",  {type: Sequelize.TEXT, ....})
// await queryInterface.removeColumn("테이블명", "제거하는 컬럼 명")
// await queryInterface.renameColumn("테이블명", "컬럼 이름 변경 전" , "컬럼 이름 변경 후" )
// await queryInterface.changeColumn("테이블명", "컬럼명",  {type: Sequelize.TEXT, ....})

//npx sequelize db:migrate
//npx sequelize db:migrate:undo
