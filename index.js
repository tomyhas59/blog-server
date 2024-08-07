const postRouter = require("./routes/post");
const userRouter = require("./routes/user");
const express = require("express");
const app = express();
const morgan = require("morgan"); //middleware
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser"); //middleware
const db = require("./models");
const dotenv = require("dotenv");
const http = require("http");
const fs = require("fs");
const setupSocketIO = require("./socket");

// Middleware-------------------------------
//프론트와 백엔드의 도메인 일치시키기---------------
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? "https://tomyhasblog.vercel.app"
        : "http://localhost:3000",
    credentials: true, //쿠키 보내는 코드, 프론트의 saga/index에서 axios.defaults.withCredentials = true 해줘야 쿠키 받음
  })
);

app.use(cookieParser());

// uploads 폴더 생성
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// image 저장 경로 설정----------------------------
app.use("/", /*baseURL*/ express.static(path.join(__dirname, "uploads")));
app.use(
  morgan("dev"), //로그를 찍어줌 ,종류 dev(개발용), combined(배포용), common, short, tiny
  express.json(), //json req.body 데이터 읽는 것 허용
  express.urlencoded({ extended: false }) //url에 있는 정보를 express 내에 있는 해석툴로 읽을 것이냐
  // extended: false (nodeJS에 내장된 qureystring 모듈로 해석)
  // extended: true (추가로 설치하여 외부 해석툴 qs로 해석)
);
//session------------------------------------
/* app.use(
  session({
    secret: "process.env.SESSION_SECRET", //암호키 이름
    resave: false, //세션이 값이 똑같으면 다시 저장 안 함
    saveUninitialized: false, //req 메시지가 들어왔을 때 session에 아무런 작업이 이뤄지지 않을 때 상황
    //보통은 false, 만약 true 시 아무 내용이 없는 session 저장될 수 있음
    proxy: process.env.NODE_ENV === "production",
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 5 * 60000,
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    },
  })
); */
//passport----위치는 session 아래로----------------------------------
/* app.use(passport.initialize());
app.use(passport.session()); */
//sequelize-----------------------------------
dotenv.config();
db.sequelize
  .sync()
  .then(() => {
    console.log("db 연결 성공");
  })
  .catch(console.error);
app.use("/user", userRouter);
app.use("/post", postRouter);

const serverInstance = http.createServer(app);

setupSocketIO(serverInstance);

const port = process.env.NODE_ENV === "production" ? 8000 : 3075;
serverInstance.listen(port, () => {
  console.log(`server running on port ${port}`);
});
