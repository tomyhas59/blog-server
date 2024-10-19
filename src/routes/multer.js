const multer = require("multer");
const path = require("path");

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, done) {
      done(
        null, //err가 있을 때 로직
        "uploads" //성공 시 저장 폴더
      );
    },
    filename(req, file, done) {
      //파일명.png
      const ext = path.extname(file.originalname); //확장자 이름만 변수 지정, (.png)가 바로
      const basename = path.basename(file.originalname, ext); // 확장자를 제외한 파일명
      done(null, basename + "_" + new Date().getTime() + ext); //우자1243.png
    }, //덮어씌우는 거 방지
  }),
  limits: { fileSize: 28 * 1024 * 1024 }, //20MB
});
module.exports = upload;
