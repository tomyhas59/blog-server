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
const socketIO = require("socket.io");
const passport = require("passport");
const session = require("express-session");
const passportConfig = require("./passport");

dotenv.config();
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
// image 저장 경로 설정----------------------------
app.use(
  "/",
  /*localhost:3075/와 같다*/ express.static(path.join(__dirname, "uploads"))
);
app.use(
  morgan("dev"), //로그를 찍어줌 ,종류 dev(개발용), combined(배포용), common, short, tiny
  express.json(), //json req.body 데이터 읽는 것 허용
  express.urlencoded({ extended: false }) //url에 있는 정보를 express 내에 있는 해석툴로 읽을 것이냐
  // extended: false (nodeJS에 내장된 qureystring 모듈로 해석)
  // extended: true (추가로 설치하여 외부 해석툴 qs로 해석)
);

// 모든 응답에 'Access-Control-Allow-Credentials' 헤더 추가
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

//session------------------------------------
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    proxy: process.env.NODE_ENV === "production",
    saveUninitialized: false,
    cookie: {
      domain: ".koyeb.app",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 5 * 60000,
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    },
  })
);

//passport----위치는 session 아래로----------------------------------
passportConfig();
app.use(passport.initialize());
app.use(passport.session());
//sequelize-----------------------------------

db.sequelize
  .sync()
  .then(() => {
    console.log("db 연결 성공");
  })
  .catch(console.error);
app.use("/user", userRouter);
app.use("/post", postRouter);
const serverInstance = http.createServer(app);
// Socket
const io = socketIO(serverInstance, {
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? "https://tomyhasblog.vercel.app"
        : "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
const connectedUsers = new Map();
io.on("connection", (socket) => {
  socket.on("loginUser", (userInfo) => {
    console.log("Received user info:", userInfo);
    // 유저 정보를 connectedUsers에 등록
    connectedUsers.set(userInfo.id, userInfo.nickname);
    // 유저 리스트를 클라이언트로 전달
    const userList = Array.from(connectedUsers).map(([id, nickname]) => ({
      id,
      nickname,
    }));
    io.emit("updateUserList", userList);
  });
  socket.on("sendMessage", (message) => {
    io.emit("receiveMessage", message);
  });
  // 로그아웃 시 유저 제거
  socket.on("logoutUser", (userId) => {
    console.log("----", userId);
    connectedUsers.delete(userId);
    // 유저 리스트를 클라이언트로 전달
    const userList = Array.from(connectedUsers).map(([id, nickname]) => ({
      id,
      nickname,
    }));
    io.emit("updateUserList", userList);
  });
  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});
const port = process.env.NODE_ENV === "production" ? 8000 : 3075;
serverInstance.listen(port, () => {
  console.log(`server running on port ${port}`);
});
