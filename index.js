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
  socket.on("createRoom", (newRoom) => {
    console.log("채팅방 생성");
    io.emit("newRoom", newRoom);
  });

  socket.on("joinRoom", (roomId, nickname) => {
    console.log("채팅방 조인");
    socket.join(roomId);
  });

  socket.on("leaveRoom", (roomId, nickname) => {
    console.log("채팅방 아웃");

    socket.leave(roomId);
  });

  const updateUserList = () => {
    const userList = Array.from(connectedUsers).map(([id, userInfo]) => ({
      id,
      nickname: userInfo.nickname,
    }));
    io.emit("updateUserList", userList);
  };

  socket.on("loginUser", (userInfo) => {
    console.log("채팅방 로그인", userInfo);
    // 유저 정보를 connectedUsers에 등록
    if (connectedUsers.has(userInfo.id)) {
      const existingSocketId = connectedUsers.get(userInfo.id).socketId;
      if (existingSocketId !== socket.id) {
        // 기존 연결 끊기
        io.sockets.sockets.get(existingSocketId)?.disconnect();
      }
    }
    // 유저 정보를 connectedUsers에 등록
    connectedUsers.set(userInfo.id, {
      nickname: userInfo.nickname,
      socketId: socket.id,
    });

    // 유저 리스트를 클라이언트로 전달
    updateUserList();
  });

  socket.on("sendMessage", (messageData) => {
    io.to(messageData.roomId).emit("receiveMessage", messageData);
  });

  // 로그아웃 시 유저 제거
  socket.on("logoutUser", (userId) => {
    connectedUsers.delete(userId);
    // 유저 리스트를 클라이언트로 전달
    updateUserList();
  });

  socket.on("disconnect", () => {
    // connectedUsers에서 해당 유저를 찾아 제거
    const disconnectedUser = [...connectedUsers.entries()].find(
      ([id, userInfo]) => userInfo.socketId === socket.id
    );

    if (disconnectedUser) {
      connectedUsers.delete(disconnectedUser[0]);
      updateUserList();
    }
  });
});

const port = process.env.NODE_ENV === "production" ? 8000 : 3075;
serverInstance.listen(port, () => {
  console.log(`server running on port ${port}`);
});
