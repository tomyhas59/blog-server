import { Server } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { Op } from "sequelize";
import { ChatRoom } from "./models/chatRoom";
import { User } from "./models/user";
import { ChatMessage } from "./models/chatMessage";
import { Notification } from "./models/notification";

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

  const handleSystemMessage = async (
    roomId: number,
    userId: number,
    content: string
  ) => {
    const message = await ChatMessage.create({
      content,
      UserId: userId,
      ChatRoomId: roomId,
      isRead: true,
    });
    io.to(roomId.toString()).emit("systemMessage", message);
  };

  const handleRoomViewerUpdate = (
    roomId: number,
    userId: number,
    isJoining: boolean
  ) => {
    if (!roomViewers[roomId]) roomViewers[roomId] = new Set();
    if (isJoining) {
      roomViewers[roomId].add(userId);
    } else {
      roomViewers[roomId].delete(userId);
      if (roomViewers[roomId].size === 0) delete roomViewers[roomId];
    }
  };

  io.on("connection", (socket: Socket) => {
    socket.on("loginUser", (userInfo: UserInfo) => {
      console.log("채팅방 로그인", userInfo);
    });

    socket.on("createRoom", async (roomId: number, joinRoomUser: UserInfo) => {
      console.log("채팅방 생성");

      const fullChatRoom = await ChatRoom.findOne({
        where: { id: roomId },
        include: [
          { model: User, as: "User1", attributes: ["id", "nickname"] },
          { model: User, as: "User2", attributes: ["id", "nickname"] },
        ],
        attributes: ["id", "User1Join", "User2Join"],
      });

      if (!fullChatRoom) return;

      const messageCount = await ChatMessage.count({
        where: { ChatRoomId: roomId },
      });

      if (messageCount > 0) {
        await handleSystemMessage(
          roomId,
          joinRoomUser.id,
          `${joinRoomUser.nickname}님이 들어왔습니다. systemMessage`
        );
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
            UserId: { [Op.ne]: me?.id }, //ne: not equal, 현재 사용자가 아닌 다른 사용자가 보낸 메시지
            isRead: false,
          },
        }
      );

      handleRoomViewerUpdate(roomId, me.id, true);

      socket.join(roomId.toString());
      io.emit("resetRead", roomId);
      io.emit("joinRoom");
    });

    socket.on("leaveRoom", (roomId: number, me: UserInfo) => {
      console.log(`${roomId}번 방 나감`, me.nickname);
      handleRoomViewerUpdate(roomId, me.id, false);
      socket.leave(roomId.toString());
    });

    socket.on("outRoom", async (roomId: number, leaveRoomUser: UserInfo) => {
      try {
        const room = await ChatRoom.findByPk(roomId);
        if (!room) return;

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
          await handleSystemMessage(
            roomId,
            leaveRoomUser.id,
            `${leaveRoomUser.nickname}님이 나갔습니다. systemMessage`
          );
          handleRoomViewerUpdate(roomId, leaveRoomUser.id, false);
          io.to(roomId.toString()).emit("outRoom", room);

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
          where: { ChatRoomId: roomId, isRead: false },
          include: { model: User, attributes: ["id", "nickname"] },
        });

        console.log(unReadMessages);

        const fullChatMessage = await ChatMessage.findOne({
          where: { id: chatMessage.id },
          include: { model: User, attributes: ["id", "nickname"] },
        });

        io.to(roomId.toString()).emit("receiveMessage", fullChatMessage);
        io.emit("unReadMessages", { unReadMessages, roomId });
      }
    );

    socket.on(
      "deletedMessage",
      async (messageId: number, currentMessage: string) => {
        await ChatMessage.update(
          { content: `${currentMessage} deletedMessage` },
          { where: { id: messageId } }
        );
      }
    );

    socket.on("followNotiRead", async (userId: number) => {
      await Notification.update(
        {
          isRead: true,
        },
        {
          where: { UserId: userId, type: "FOLLOW", isRead: false },
        }
      );
      io.emit("updateNotification");
    });

    socket.on("logoutUser", (userId: number) => {
      for (const roomId in roomViewers) {
        handleRoomViewerUpdate(Number(roomId), userId, false);
        socket.leave(roomId.toString());
      }
    });

    socket.on("disconnect", () => {
      console.log("disconnect");
    });
  });
};
