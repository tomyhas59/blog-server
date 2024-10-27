import { Server } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { Op } from "sequelize";
import { ChatRoom } from "./models/chatRoom";
import { User } from "./models/user";
import { ChatMessage } from "./models/chatMessage";

interface UserInfo {
  id: number;
  nickname: string;
}

interface MessageData {
  roomId: number;
  userId: number;
  content: string;
}

interface RoomViewersMap {
  [roomId: number]: Set<number>;
}

const roomViewers: RoomViewersMap = {}; // 채팅방에 접속한 유저 목록

export default (server: Server) => {
  const io = new SocketIOServer(server, {
    cors: {
      origin:
        process.env.NODE_ENV === "production"
          ? "https://tomyhasblog.vercel.app"
          : "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket: Socket) => {
    socket.on("loginUser", (userInfo: UserInfo) => {
      console.log("채팅방 로그인", userInfo);
    });

    socket.on("createRoom", async (roomId: number, joinRoomUser: UserInfo) => {
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

      if (messageCount > 0) {
        const systemMessage = await ChatMessage.create({
          content: `${joinRoomUser.nickname}님이 들어왔습니다. systemMessage`,
          UserId: joinRoomUser.id,
          ChatRoomId: roomId,
          isRead: true,
        });

        io.to(roomId.toString()).emit("systemMessage", systemMessage);
      }

      io.emit("newRoom", fullChatRoom);
    });

    socket.on("joinRoom", async (roomId: number, me: UserInfo) => {
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

      if (!roomViewers[roomId]) {
        roomViewers[roomId] = new Set();
      }
      roomViewers[roomId].add(me.id);

      socket.join(roomId.toString());
      io.emit("resetRead", roomId);
      io.emit("joinRoom");
    });

    socket.on("leaveRoom", (roomId: number, me: UserInfo) => {
      console.log(`${roomId}번 방 나감`, me.nickname);
      if (roomViewers[roomId]) {
        roomViewers[roomId].delete(me.id);
        if (roomViewers[roomId].size === 0) {
          delete roomViewers[roomId];
        }
      }

      socket.leave(roomId.toString());
    });

    socket.on("outRoom", async (roomId: number, leaveRoomUser: UserInfo) => {
      try {
        const room = await ChatRoom.findByPk(roomId);

        if (room) {
          if (room.User1Id === leaveRoomUser.id) {
            room.User1Join = false;
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

          if (roomViewers[roomId]) {
            roomViewers[roomId].delete(leaveRoomUser.id);
            if (roomViewers[roomId].size === 0) {
              delete roomViewers[roomId];
            }
          }
          io.to(roomId.toString()).emit("outRoom", room);
          io.to(roomId.toString()).emit("systemMessage", systemMessage);
          io.emit("updateUserRoomList");
        }
      } catch (err) {
        console.error(err);
      }
      socket.leave(roomId.toString());
    });

    socket.on(
      "sendMessage",
      async (messageData: MessageData, selectedUserId: number) => {
        const { roomId, userId, content } = messageData;

        const isRead =
          roomViewers[roomId] && roomViewers[roomId].has(selectedUserId);

        const chatMessage = await ChatMessage.create({
          content,
          UserId: userId,
          ChatRoomId: roomId,
          isRead,
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

        io.to(roomId.toString()).emit("receiveMessage", fullChatMessage);
        io.emit("unReadMessages", { unReadMessages, roomId });
      }
    );

    socket.on(
      "deletedMessage",
      async (messageId: number, roomId: number, currentMessage: string) => {
        await ChatMessage.update(
          { content: `${currentMessage} deletedMessage` },
          { where: { id: messageId } }
        );
      }
    );

    socket.on("logoutUser", (userId: number) => {
      for (const roomId in roomViewers) {
        roomViewers[roomId].delete(userId);
        if (roomViewers[roomId].size === 0) {
          delete roomViewers[roomId];
          socket.leave(roomId.toString());
        }
      }
    });

    socket.on("disconnect", () => {
      console.log("disconnect");
    });
  });
};
