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
const fs = require("fs");
const ChatRoom = require("./models/chatRoom");
const ChatMessage = require("./models/chatMessage");
const User = require("./models/user");
const { Sequelize } = require("sequelize");
const { Op } = require("sequelize");

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

const roomViewers = new Map(); // 채팅방에 접속한 유저 목록

io.on("connection", (socket) => {
  socket.on("loginUser", (userInfo) => {
    console.log("채팅방 로그인", userInfo);
  });

  socket.on("createRoom", async (roomId, joinRoomUser) => {
    console.log("채팅방 생성");

    const fullChatRoom = await ChatRoom.findOne({
      where: {
        id: roomId,
      },
      include: [
        {
          model: User,
          as: "User1",
          attributes: ["id", "nickname"],
        },
        {
          model: User,
          as: "User2",
          attributes: ["id", "nickname"],
        },
      ],
      attributes: ["id", "User1Join", "User2Join"],
    });

    const messageCount = await ChatMessage.count({
      where: { ChatRoomId: roomId },
    });
    //첫 생성 방은 메시지 미송신
    if (messageCount > 0) {
      const systemMessage = await ChatMessage.create({
        content: `${joinRoomUser.nickname}님이 들어왔습니다. systemMessage`,
        UserId: joinRoomUser.id,
        ChatRoomId: roomId,
        isRead: true,
      });

      io.to(roomId).emit("systemMessage", systemMessage);
    }

    io.emit("newRoom", fullChatRoom);
  });

  socket.on("joinRoom", async (roomId, me) => {
    console.log(`${roomId}번 방 입장`, me?.nickname);

    await ChatMessage.update(
      { isRead: true },
      {
        where: {
          ChatRoomId: roomId,
          UserId: { [Op.ne]: me?.id },
          isRead: false,
        },
      }
    );

    if (!roomViewers.has(roomId)) {
      roomViewers.set(roomId, new Set());
    }
    roomViewers.get(roomId).add(me?.id);

    socket.join(roomId);
    socket.to(roomId).emit("joinRoom");
    socket.emit("resetRead", roomId);
  });

  socket.on("leaveRoom", async (roomId, me) => {
    console.log(`${roomId}번 방 나감`, me.nickname);
    if (roomViewers.has(roomId)) {
      roomViewers.get(roomId).delete(me.id);
      if (roomViewers.get(roomId).size === 0) {
        roomViewers.delete(roomId);
      }
    }

    socket.leave(roomId);
  });

  socket.on("outRoom", async (roomId, leaveRoomUser) => {
    try {
      const room = await ChatRoom.findByPk(roomId);

      if (room) {
        if (room.User1Id === leaveRoomUser.id) {
          room.User1Join = false;
          // 유저가 두 명 모두 나간 경우 방 삭제
          if (!room.User2Join) {
            await ChatMessage.destroy({ where: { ChatRoomId: room.id } });
            await room.destroy();
            io.emit("updateUserRoomList");
            return;
          } else {
            await room.save();
          }
        } else if (room.User2Id === leaveRoomUser.id) {
          room.User2Join = false;
          // 유저가 두 명 모두 나간 경우 방 삭제
          if (!room.User1Join) {
            await ChatMessage.destroy({ where: { ChatRoomId: room.id } });
            await room.destroy();
            io.emit("updateUserRoomList");
            return;
          } else {
            await room.save();
          }
        }

        const systemMessage = await ChatMessage.create({
          content: `${leaveRoomUser.nickname}님이 나갔습니다. systemMessage`,
          UserId: leaveRoomUser.id,
          ChatRoomId: roomId,
          isRead: true,
        });

        if (roomViewers.has(roomId)) {
          roomViewers.get(roomId).delete(leaveRoomUser.id);
          if (roomViewers.get(roomId).size === 0) {
            roomViewers.delete(roomId);
          }
        }
        io.to(roomId).emit("outRoom");
        io.to(roomId).emit("systemMessage", systemMessage);
        io.emit("updateUserRoomList");
      }
    } catch (err) {
      console.error(err);
    }
    socket.leave(roomId);
  });

  socket.on("sendMessage", async (messageData, selectedUserId) => {
    const { roomId, userId, content } = messageData;

    const isRead =
      roomViewers.has(roomId) && roomViewers.get(roomId).has(selectedUserId);

    const chatMessage = await ChatMessage.create({
      content,
      UserId: userId,
      ChatRoomId: roomId,
      isRead: isRead,
    });

    const unReadMessages = await ChatMessage.findAll({
      where: {
        ChatRoomId: roomId,
        isRead: false,
      },
      include: {
        model: User,
        attributes: ["id", "nickname"],
      },
    });

    console.log(unReadMessages);

    const fullChatMessage = await ChatMessage.findOne({
      where: { id: chatMessage.id },
      include: {
        model: User,
        attributes: ["id", "nickname"],
      },
    });

    io.to(roomId).emit("receiveMessage", fullChatMessage);
    io.emit("unReadMessages", { unReadMessages, roomId });
  });

  // 로그아웃 시 유저 제거
  socket.on("logoutUser", (userId) => {
    for (const [roomId, viewers] of roomViewers.entries()) {
      viewers.delete(userId);
      if (viewers.size === 0) {
        roomViewers.delete(roomId);
        socket.leave(roomId);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("disconnect");
  });
});

const port = process.env.NODE_ENV === "production" ? 8000 : 3075;
serverInstance.listen(port, () => {
  console.log(`server running on port ${port}`);
});
