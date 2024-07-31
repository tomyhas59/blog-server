const socketIO = require("socket.io");
const ChatRoom = require("./models/chatRoom");
const ChatMessage = require("./models/chatMessage");
const User = require("./models/user");
const { Op } = require("sequelize");

const roomViewers = new Map(); // 채팅방에 접속한 유저 목록

module.exports = (server) => {
  const io = socketIO(server, {
    cors: {
      origin:
        process.env.NODE_ENV === "production"
          ? "https://tomyhasblog.vercel.app"
          : "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

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
          io.to(roomId).emit("outRoom", room);
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

    socket.on("deletedMessage", async (messageId, roomId, currentMessage) => {
      await ChatMessage.update(
        { content: `${currentMessage} deletedMessage` },
        { where: { id: messageId } }
      );
    });

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
};
