const Post = require("../models/post");
const User = require("../models/user");
const Comment = require("../models/comment");
const ReComment = require("../models/recomment");
const Image = require("../models/image");
const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");
const ChatRoom = require("../models/chatRoom");
const ChatMessage = require("../models/chatMessage");

module.exports = class PostService {
  static async imageUpload(req, res) {
    console.log(req.files);
    res.json(req.files.map((v) => v.filename));
  }

  static async imageRemove(req, res, next) {
    try {
      const filename = req.params.filename;
      const filePath = path.join(__dirname, "..", "uploads", filename);

      // 이미지 파일 삭제
      fs.unlinkSync(filePath);
      res.status(200).json({ filename: filename }); // reducer action.data.filename 전달
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  static async imageDelete(req, res, next) {
    try {
      const postId = req.params.postId;
      const filename = req.params.filename;

      const images = await Image.findAll({
        where: {
          PostId: postId,
          src: filename,
        },
      });

      for (const image of images) {
        const imagePaths = path.join(__dirname, "..", "uploads", image.src);

        try {
          fs.unlinkSync(imagePaths);
        } catch (error) {
          console.error("Error deleting image file:", error);
        }

        await image.destroy();
      }

      res.status(200).json({
        PostId: parseInt(postId, 10), //reducer의 action.data. 값
        filename: filename,
      });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      if (req.user.id) {
        const post = await Post.create({
          content: req.body.content,
          userIdx: /*post 모델에서 관계 설정한 foreignKey 컬럼명*/ req.user.id,
          //passport를 통해서 로그인하면 세션 데이터 해석 후 user 정보가 req.user에 담겨서 id값이 생김
        });

        if (req.body.image) {
          const imagePromises = Array.isArray(req.body.image)
            ? req.body.image.map((image) => Image.create({ src: image }))
            : [Image.create({ src: req.body.image })];

          const imageResults = await Promise.allSettled(imagePromises);

          const successfulImages = imageResults
            .filter((result) => result.status === "fulfilled")
            .map((result) => result.value);

          await post.addImages(successfulImages);
        }

        const fullPost = await Post.findOne({
          where: { id: post.id }, //게시글 쓰면 자동으로 id 생성
          include: [
            {
              model: Image,
            },
            {
              model: User, //게시글 작성자
              attributes: ["id", "email", "nickname"],
            },
            {
              model: User, //좋아요 누른 사람
              as: "Likers", //post.Likers.id 이런 식으로 불러옴
              attributes: ["id", "nickname"],
            },
            {
              model: Comment,
              include: [
                {
                  model: ReComment,
                  include: [{ model: User, attributes: ["id", "nickname"] }],
                  attributes: ["id", "content"],
                },
                {
                  model: User, //댓글 작성자
                  attributes: ["id", "nickname"],
                },
              ],
            },
          ],
        });
        res.status(200).json(fullPost);
      }
    } catch (err) {
      console.error(err);
      next(err); //status 500임
    }
  }
  //----------------------------------------------------------------------

  static async update(req, res, next) {
    try {
      const postId = req.params.postId;

      await Post.update(
        {
          content: req.body.content,
          //body 뒤의 content는 action.data의 key
        },
        {
          where: {
            id: postId,
            /*    userIdx: req.user.id, */
          },
        }
      );
      const post = await Post.findOne({
        where: { id: postId },
        include: [
          {
            model: Image,
          },
        ],
      });

      if (req.body.imagePaths) {
        const images = await Promise.all(
          req.body.imagePaths.map((filename) => Image.create({ src: filename }))
        );

        await post.addImages(images); //addImages는 Post 모델 관계 설정에서 나온 함수
      }

      //addImgaes 한 다음 다시 호출
      const updatePost = await Post.findOne({
        where: { id: post.id }, //게시글 쓰면 자동으로 id 생성
        include: [
          {
            model: Image,
          },
          {
            model: User, //게시글 작성자
            attributes: ["id", "email", "nickname"],
          },
          {
            model: User, //좋아요 누른 사람
            as: "Likers", //post.Likers.id 이런 식으로 불러옴
            attributes: ["id", "nickname"],
          },
          {
            model: Comment,
            include: [
              {
                model: ReComment,
                include: [{ model: User, attributes: ["id", "nickname"] }],
                attributes: ["id", "content"],
              },
              {
                model: User, //댓글 작성자
                attributes: ["id", "nickname"],
              },
            ],
          },
        ],
      });
      res.status(200).json({
        PostId: parseInt(postId),
        updatePost,
      });
    } catch (err) {
      console.log(err);
      next(err);
    }
  }
  //----------------------------------------------------------------------

  static async readAll(req, res, next) {
    try {
      const posts = await Post.findAll({
        limit: 10,
        include: [
          {
            model: User,
            include: [{ model: Image, attributes: ["src"] }],
            attributes: ["id", "email", "nickname"],
          },
          { model: Image },
          {
            model: User,
            as: "Likers",
            attributes: ["id", "nickname"],
          },
          {
            model: Comment,
            include: [
              {
                model: ReComment,
                include: [{ model: User, attributes: ["id", "nickname"] }],
                attributes: ["id", "content", "createdAt"],
              },
              {
                model: User, // 댓글 작성자
                attributes: ["id", "nickname"],
              },
            ],
            attributes: ["id", "content", "createdAt"],
          },
        ],
        order: [
          ["createdAt", "DESC"], // 게시글을 내림차순으로 정렬
          [Comment, "createdAt", "ASC"], // 댓글을 오름차순으로 정렬
          [Comment, ReComment, "createdAt", "ASC"], // 대댓글을 오름차순으로 정렬
        ],
      });
      res.status(200).json(posts);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  //----------------------------------------------------------------------

  static async getUserPosts(req, res, next) {
    try {
      const userId = req.query.userId;

      if (!userId) {
        return res
          .status(400)
          .json({ error: "UserId 쿼리 파라미터가 필요합니다" });
      }

      const posts = await Post.findAll({
        where: {
          userIdx: userId,
        },
        include: [
          {
            model: User,
            include: [{ model: Image, attributes: ["src"] }],
            attributes: ["id", "email", "nickname"],
          },
        ],
        order: [
          ["createdAt", "DESC"], // 게시글을 내림차순으로 정렬
        ],
      });
      res.status(200).json(posts);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  //----------------------------------------------------------------------

  static async getUserComments(req, res, next) {
    try {
      const userId = req.query.userId;

      if (!userId) {
        return res
          .status(400)
          .json({ error: "UserId 쿼리 파라미터가 필요합니다" });
      }

      const comments = await Comment.findAll({
        where: {
          UserId: userId,
        },
        include: [{ model: Post, attributes: ["id"] }],
        order: [
          ["createdAt", "DESC"], // 댓글을 내림차순으로 정렬
        ],
      });

      const reComments = await ReComment.findAll({
        where: {
          UserId: userId,
        },
        include: [{ model: Post, attributes: ["id"] }],
        order: [
          ["createdAt", "DESC"], // 댓글을 내림차순으로 정렬
        ],
      });

      const allComments = {
        comments: comments,
        reComments: reComments,
      };

      res.status(200).json(allComments);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  //----------------------------------------------------------------------

  static async search(req, res, next) {
    try {
      const searchText = req.query.query;
      const searchOption = req.query.option;
      const whereCondition = {};

      if (searchOption === "author") {
        whereCondition["$User.nickname$"] /*User 모델의 nickname 필드 참조 */ =
          {
            [Op.like]: `%${searchText}%`, //searchText가 포함된 모든 항목 검색
          };
      } else if (searchOption === "content") {
        whereCondition.content = {
          [Op.like]: `%${searchText}%`,
        };
      } else if (searchOption === "all") {
        whereCondition[Op.or] = [
          {
            content: {
              [Op.like]: `%${searchText}%`,
            },
          },
          {
            "$User.nickname$": {
              [Op.like]: `%${searchText}%`,
            },
          },
          {
            "$Comments.content$": {
              [Op.like]: `%${searchText}%`,
            },
          },
          {
            "$Comments.ReComments.content$": {
              [Op.like]: `%${searchText}%`,
            },
          },
        ];
      }

      const searchResults = await Post.findAll({
        where: whereCondition,
        include: [
          {
            model: User,
            include: [{ model: Image, attributes: ["src"] }],
            attributes: ["id", "email", "nickname"],
          },
          { model: Image },
          {
            model: User,
            as: "Likers",

            attributes: ["id", "nickname"],
          },
          {
            model: Comment,
            include: [
              {
                model: ReComment,
                include: [{ model: User, attributes: ["id", "nickname"] }],
                attributes: ["id", "content"],
              },
              {
                model: User, //댓글 작성자
                attributes: ["id", "nickname"],
              },
            ],
          },
        ],
        order: [["createdAt", "DESC"]],
      });
      if (searchResults.length === 0) {
        // 검색 결과가 없을 경우
        return res.status(404).json("검색 결과를 찾을 수 없습니다.");
      }

      res.status(200).json(searchResults);
    } catch (error) {
      console.log(error);
      next(error);
    }
  }

  //----------------------------------------------------------------------

  static async searchNickname(req, res, next) {
    try {
      const searchNickname = req.query.query;

      const searchResults = await Post.findAll({
        where: {
          "$User.nickname$": searchNickname,
        },
        include: [
          {
            model: User,
            include: [{ model: Image, attributes: ["src"] }],
            attributes: ["id", "email", "nickname"],
          },
          { model: Image },
          {
            model: User,
            as: "Likers",
            attributes: ["id", "nickname"],
          },
          {
            model: Comment,
            include: [
              {
                model: ReComment,
                include: [{ model: User, attributes: ["id", "nickname"] }],
                attributes: ["id", "content"],
              },
              {
                model: User, //댓글 작성자
                attributes: ["id", "nickname"],
              },
            ],
          },
        ],
        order: [["createdAt", "DESC"]],
      });
      if (searchResults.length === 0) {
        // 검색 결과가 없을 경우
        return res.status(404).json("작성한 게시글이 없습니다");
      }

      res.status(200).json(searchResults);
    } catch (error) {
      console.log(error);
      next(error);
    }
  }

  //----------------------------------------------------------------------

  static async delete(req, res, next) {
    try {
      const postId = req.params.postId;

      await Comment.destroy({
        where: {
          PostId: postId,
        },
      });

      await ReComment.destroy({
        where: {
          PostId: postId,
        },
      });

      // 이미지 파일 삭제 로직
      const images = await Image.findAll({
        where: {
          PostId: postId,
        },
      });

      images.forEach(async (image) => {
        const filename = image.src;
        const filePath = path.join(__dirname, "..", "uploads", filename);

        try {
          // 이미지 파일 삭제
          fs.unlinkSync(filePath);
          res.status(200);
        } catch (error) {
          console.error("Error deleting image:", error);
        }
      });

      // 이미지 삭제 후 포스트 삭제
      await Image.destroy({
        where: {
          PostId: postId,
        },
      });
      Post.destroy({
        where: { id: postId },
      });

      res.status(200).json({ PostId: parseInt(postId, 10) }); //saga의 result 응답데이터, reducer의 action.data.PostId
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  //----------------------------------------------------------------------
  static async commentCreate(req, res, next) {
    try {
      const post = await Post.findOne({
        where: { id: req.params.postId },
      });
      if (!post) {
        return res.status(403).send("존재하지 않는 게시글입니다");
      }
      const comment = await Comment.create({
        content: req.body.content,
        PostId: parseInt(req.params.postId, 10),
        UserId: req.user.id,
      });
      const fullComment = await Comment.findOne({
        where: { id: comment.id },
        include: [
          {
            model: User,
            attributes: ["id", "nickname"],
          },
          {
            model: Post,
            attributes: ["id"],
          },
          {
            model: ReComment,
            include: [{ model: User, attributes: ["id", "nickname"] }],
            attributes: ["id", "content"],
          },
        ],
      });
      res.status(201).json(fullComment);
    } catch (error) {
      console.log(error);
      next(error);
    }
  }

  //----------------------------------------------------------------------
  static async commentDelete(req, res, next) {
    try {
      const postId = req.params.postId;
      const commentId = req.params.commentId;

      await ReComment.destroy({
        where: {
          CommentId: commentId,
        },
      });

      await Comment.destroy({
        where: { id: commentId /*  UserId: req.user.id */ },
      });
      res.status(200).json({
        PostId: parseInt(postId, 10), //reducer의 action.data. 값
        CommentId: parseInt(commentId, 10),
      });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  //----------------------------------------------------------------------

  static async commentUpdate(req, res, next) {
    try {
      const postId = req.params.postId;
      const commentId = req.params.commentId;

      await Comment.update(
        {
          content: req.body.content,
        },
        {
          where: {
            id: commentId,
          },
        }
      );
      res.status(200).json({
        PostId: parseInt(postId, 10),
        CommentId: parseInt(commentId, 10),
        content: req.body.content,
      });
    } catch (err) {
      console.log(err);
      next(err);
    }
  }
  //----------------------------------------------------------------------
  static async ReCommentCreate(req, res, next) {
    try {
      const post = await Post.findOne({
        where: { id: req.params.postId },
      });
      if (!post) {
        return res.status(403).send("존재하지 않는 게시글입니다");
      }
      const comment = await Comment.findOne({
        where: { id: req.params.commentId },
      });
      if (!comment) {
        return res.status(403).send("존재하지 않는 댓글입니다");
      }
      const reComment = await ReComment.create({
        PostId: post.id,
        content: req.body.content,
        CommentId: parseInt(req.params.commentId, 10),
        UserId: req.user.id,
      });
      const fullReComment = await ReComment.findOne({
        where: { id: reComment.id },
        include: [
          {
            model: User,
            attributes: ["id", "nickname"],
          },
          {
            model: Comment,
            attributes: ["id", "content"],
          },
        ],
      });
      res.status(201).json(fullReComment);
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  //----------------------------------------------------------------------
  static async reCommentDelete(req, res, next) {
    try {
      const postId = req.params.postId;
      const commentId = req.params.commentId;
      const reCommentId = req.params.reCommentId;
      await ReComment.destroy({
        where: { id: reCommentId /*  UserId: req.user.id */ },
      });
      res.status(200).json({
        PostId: parseInt(postId, 10), //reducer의 action.data. 값
        CommentId: parseInt(commentId, 10),
        ReCommentId: parseInt(reCommentId, 10),
      });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  //----------------------------------------------------------------------

  static async reCommentUpdate(req, res, next) {
    try {
      const postId = req.params.postId;
      const commentId = req.params.commentId;
      const reCommentId = req.params.reCommentId;
      await ReComment.update(
        {
          content: req.body.content,
        },
        {
          where: {
            id: reCommentId,
          },
        }
      );
      res.status(200).json({
        PostId: parseInt(postId, 10),
        CommentId: parseInt(commentId, 10),
        ReCommentId: parseInt(reCommentId, 10),
        content: req.body.content,
      });
    } catch (err) {
      console.log(err);
      next(err);
    }
  }
  //-----------like----------------------------
  static async postLike(req, res, next) {
    try {
      const post = await Post.findOne({
        where: { id: req.params.postId },
      });
      if (!post) {
        return res.status(403).send("게시글이 존재하지 않습니다.");
      }
      await post.addLikers(req.user.id);
      res.json({
        PostId: post.id,
        UserId: req.user.id,
        nickname: req.user.nickname,
      });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async postUnLike(req, res, next) {
    try {
      const post = await Post.findOne({
        where: { id: req.params.postId },
      });
      if (!post) {
        return res.status(403).send("게시글이 존재하지 않습니다.");
      }
      await post.removeLikers(req.user.id);
      res.status(200).json({ PostId: post.id, UserId: req.user.id });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async getLikedPosts(req, res, next) {
    try {
      const userId = req.query.userId;

      if (!userId) {
        return res
          .status(400)
          .json({ error: "UserId 쿼리 파라미터가 필요합니다" });
      }

      const likedPosts = await Post.findAll({
        include: [
          {
            model: User,
            as: "Likers",
            where: { id: userId },
            attributes: ["id", "email", "nickname"],
          },
        ],
        attributes: ["id", "content", "createdAt"],
        order: [["createdAt", "DESC"]],
      });

      res.status(200).json(likedPosts);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  //chat----------------------------------------------
  static async createChatRoom(req, res, next) {
    const { user2Id } = req.body;
    const user1Id = req.user.id;

    try {
      const user1 = await User.findByPk(user1Id, { include: "User1Rooms" });
      const user2 = await User.findByPk(user2Id, { include: "User2Rooms" });

      if (!user1 || !user2) {
        return res.status(404).json({ message: "유저를 찾을 수 없습니다" });
      }
      //이미 있으면 기존 채팅방 불러오기
      const existingChatRoom = await ChatRoom.findOne({
        where: {
          [Op.or]: [
            { User1Id: user1Id, User2Id: user2Id },
            { User1Id: user2Id, User2Id: user1Id },
          ],
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
      });

      if (existingChatRoom) {
        if (existingChatRoom.User1Id === user1Id) {
          existingChatRoom.User1Join = true;
        } else {
          existingChatRoom.User2Join = true;
        }

        await existingChatRoom.save();
        return res.status(200).json(existingChatRoom);
      }
      //채팅방 새로 생성
      const chatRoom = await ChatRoom.create({
        User1Id: user1Id,
        User2Id: user2Id,
      });

      const fullChatRoom = await ChatRoom.findOne({
        where: {
          id: chatRoom.id,
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

      return res.status(201).json(fullChatRoom);
    } catch (error) {
      return res
        .status(500)
        .json({ message: "채팅 방을 생성하는 중에 오류가 발생했습니다." });
    }
  }

  //get Chat-------------------------------------
  static async getChatMessage(req, res, next) {
    try {
      const { roomId } = req.query;

      if (!roomId) {
        return res.status(404).json({ message: "roomId not found" });
      }

      // 채팅 메시지 가져오기
      const messages = await ChatMessage.findAll({
        where: {
          ChatRoomId: roomId,
        },
        order: [["createdAt", "ASC"]],
        include: [
          {
            model: User,
          },
        ],
      });

      res.status(200).json(messages);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  //find chat room---------------------------------
  static async findUserChatRooms(req, res, next) {
    try {
      const { userId } = req.query;

      const chatRooms = await ChatRoom.findAll({
        where: {
          [Op.or]: [
            {
              User1Id: userId,
              User1Join: true,
            },
            {
              User2Id: userId,
              User2Join: true,
            },
          ],
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

      const chatRoomsWithUnRead = await Promise.all(
        chatRooms.map(async (chatRoom) => {
          const unReadMessage = await ChatMessage.findAll({
            where: {
              ChatRoomId: chatRoom.id,
              isRead: false,
            },
          });

          return {
            ...chatRoom.toJSON(),
            UnReadMessages: unReadMessage,
          };
        })
      );

      res.status(200).json(chatRoomsWithUnRead);
    } catch (error) {
      console.error("Error fetching user chat rooms:", error);
      throw error;
    }
  }
  //read chat message---------------------------------
  static async readChatMessges(req, res, next) {
    const { messageId } = req.params;

    try {
      const message = await ChatMessage.findByPk(messageId);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      message.isRead = true;
      await message.save();

      return res.json({ message: "Message marked as read" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
};
