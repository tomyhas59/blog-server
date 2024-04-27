// const http = require("http");
// const express = require("express");
// const cors = require("cors");
// const app = express();
// app.use(cors()); // Add this line to enable CORS for all routes in your Express app.

// //소켓 서버 생성---------------------------
// const server = http.createServer(app);
// const io = require("socket.io")(server, {
//   cors: {
//     origin: "http://localhost:3000", // Replace with the origin (URL) of your frontend application.
//     methods: ["GET", "POST"], // allowed HTTP methods
//     credentials: true, // Enable credentials (cookies, auth headers, etc.).
//   },
// });

// io.on("connection", (socket) => {
//   console.log("유저 입장");

//   //해당 방에 입장
//   //joinRoom을 통해서 서버 안에서도 방 생성 가능
//   socket.on("joinRoom", (roomId, username) => {
//     console.log(roomId);
//     console.log(`${username}님 접속`);
//     socket.join(roomId);

//     //해당 방 전체에게 emit (소켓 메시지를 보냄)
//     socket.broadcast.to(roomId).emit(
//       /*"key" , {data}*/
//       "user-connected",
//       {
//         username: username,
//         roomId: roomId,
//         socketId: socket.id,
//       }
//     );
//   });
//   //emit = 소켓 서버와 클라이언트 서버 전달책
//   //방을 나갔다는 메시지 전달
//   socket.on("disconnect", () => {
//     socket.broadcast.to(roomId).emit("user-disconnected", username);
//     socket.leave(roomId);
//     console.log("User disconnected.");
//   });

//   //대화방의 단체 채팅
//   socket.on("roomchat", (message) => {
//     socket.broadcast.to(roomId).emit("user-roomchat", {
//       username: message.username,
//       message: message.message,
//     });
//   });

//   //1:1 채팅, 귓속말
//   socket.on("chat", (message) => {
//     io.to(message.targetSocketId).emit("user-chat", {
//       from: message.useName,
//       message: message.message,
//     });
//   });
// });

// const port = 3001;
// server.listen(port, () => {
//   console.log(`소켓 서버${port}번으로 가동 중.`);
// });

const http = require("http");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors()); // Add this line to enable CORS for all routes in your Express app

const server = http.createServer(app);

const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:3000", // Replace with the origin (URL) of your frontend application
    methods: ["GET", "POST"], // Allowed HTTP methods
    credentials: true, // Enable credentials (cookies, authorization headers, etc.)
  },
});

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("sendMessage", (message) => {
    console.log("Received message:", message);
    io.emit("receiveMessage", message);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

const port = 3001;
server.listen(port, () => {
  console.log(`Socket server running on port ${port}`);
});
