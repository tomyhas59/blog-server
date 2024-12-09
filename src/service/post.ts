import { Request, Response, NextFunction } from "express";
import { Post } from "../models/post";
import { User } from "../models/user";
import { Comment } from "../models/comment";
import { ReComment } from "../models/recomment";
import { Image } from "../models/image";
import fs from "fs";
import path from "path";
import { Op } from "sequelize";
import { ChatRoom } from "../models/chatRoom";
import { ChatMessage } from "../models/chatMessage";
import { Notification } from "../models/notification";

interface File {
  filename: string;
}

export default class PostService {
  static async imageUpload(req: Request, res: Response) {
    const files = req.files as File[];
    console.log(files);
    res.json(files?.map((file) => file.filename));
  }

  static async imageRemove(req: Request, res: Response, next: NextFunction) {
    try {
      const filename = req.params.filename;
      const filePath = path.join(__dirname, "../../uploads", filename);

      // 이미지 파일 삭제
      fs.unlinkSync(filePath);
      res.status(200).json({ filename: filename }); // reducer action.data.filename 전달
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  static async imageDelete(req: Request, res: Response, next: NextFunction) {
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
        const imagePaths = path.join(__dirname, "../../uploads", image.src);

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

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as User;

      if (user.id) {
        const post = await Post.create({
          title: req.body.title,
          content: req.body.content,
          userIdx: /*post 모델에서 관계 설정한 foreignKey 컬럼명*/ user.id,
          //passport를 통해서 로그인하면 세션 데이터 해석 후 user 정보가 req.user에 담겨서 id값이 생김
        });

        if (req.body.image) {
          const imagePromises = Array.isArray(req.body.image)
            ? req.body.image.map((image: any) => Image.create({ src: image }))
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

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const postId = req.params.postId;

      await Post.update(
        {
          content: req.body.content,
        },
        {
          where: {
            id: postId,
            /*    userIdx: user.id, */
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
          req.body.imagePaths.map((filename: string) =>
            Image.create({ src: filename })
          )
        );

        await post?.addImages(images); //addImages는 Post 모델 관계 설정에서 나온 함수
      }

      //addImgaes 한 다음 다시 호출
      const updatePost = await Post.findOne({
        where: { id: post?.id }, //게시글 쓰면 자동으로 id 생성
        include: [
          {
            model: Image,
          },
          {
            model: User, //게시글 작성자
            include: [{ model: Image, attributes: ["src"] }],
            attributes: ["id", "nickname"],
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
                include: [
                  {
                    model: User,
                    include: [{ model: Image, attributes: ["src"] }],
                    attributes: ["id", "nickname"],
                  },
                ],
                attributes: ["id", "content"],
              },
              {
                model: User, //댓글 작성자
                include: [{ model: Image, attributes: ["src"] }],
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

  static async readAll(req: Request, res: Response, next: NextFunction) {
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
                include: [
                  {
                    model: User,
                    include: [{ model: Image, attributes: ["src"] }],
                    attributes: ["id", "nickname"],
                  },
                ],
                attributes: ["id", "content", "createdAt"],
              },
              {
                model: User, // 댓글 작성자
                include: [{ model: Image, attributes: ["src"] }],
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
  static async getUserPosts(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.query.userId;

      if (!userId) {
        res.status(400).json({ error: "UserId 쿼리 파라미터가 필요합니다" });
        return;
      }

      // userId를 string으로 강제 변환
      const validUserId = Array.isArray(userId)
        ? userId[0]
        : (userId as string);

      const posts = await Post.findAll({
        where: {
          userIdx: validUserId, // userIdx에 올바른 형식의 userId 전달
        },
        include: [
          {
            model: User,
            include: [{ model: Image, attributes: ["src"] }],
            attributes: ["id", "nickname"],
          },
          { model: Notification, attributes: ["id", "message", "isRead"] },
        ],
        order: [["createdAt", "DESC"]], // 게시글을 내림차순으로 정렬
      });

      res.status(200).json(posts);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  //----------------------------------------------------------------------

  static async getUserComments(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.query.userId;

      if (!userId) {
        res.status(400).json({ error: "UserId 쿼리 파라미터가 필요합니다" });
        return;
      }
      const validUserId = Array.isArray(userId)
        ? Number(userId[0])
        : Number(userId);

      const comments = await Comment.findAll({
        where: {
          UserId: validUserId,
        },
        include: [{ model: Post, attributes: ["id"] }],
        order: [
          ["createdAt", "DESC"], // 댓글을 내림차순으로 정렬
        ],
      });

      const reComments = await ReComment.findAll({
        where: {
          UserId: validUserId,
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

  static async search(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const postId = req.query.postId;
      const searchText = req.query.query as string;
      const searchOption = req.query.searchOption as string;

      console.log(postId, searchText, searchOption);
      // 공통 include 옵션
      const getCommonInclude = () => [
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
              model: User, // 댓글 작성자
              include: [{ model: Image, attributes: ["src"] }],
              attributes: ["id", "nickname"],
            },
            {
              model: ReComment,
              include: [
                {
                  model: User,
                  include: [{ model: Image, attributes: ["src"] }],
                  attributes: ["id", "nickname"],
                },
              ],
              attributes: ["id", "content"],
            },
          ],
          attributes: ["id", "content"],
        },
      ];

      // 댓글과 대댓글에서 PostId를 가져오는 함수
      const fetchPostIdsFromComments = async (searchText: string) => {
        const commentPostIds = await Comment.findAll({
          where: { content: { [Op.like]: `%${searchText}%` } },
          attributes: ["PostId"],
        }).then((comments) => comments.map((comment) => comment.PostId));

        const reCommentPostIds = await ReComment.findAll({
          where: { content: { [Op.like]: `%${searchText}%` } },
          attributes: ["PostId"],
        }).then((reComments) =>
          reComments.map((reComment) => reComment.PostId)
        );

        return [...new Set([...commentPostIds, ...reCommentPostIds])]; // 중복 제거
      };

      // 댓글과 대댓글에서 검색된 PostId 가져오기
      const postIdsFromComments = await fetchPostIdsFromComments(searchText);

      // 검색 조건 생성
      let whereCondition: any;

      if (searchOption === "author") {
        whereCondition = {
          "$User.nickname$": { [Op.like]: `%${searchText}%` }, // 작성자 검색
        };
      } else if (searchOption === "title") {
        whereCondition = {
          id: postId,
        };
      } else if (searchOption === "comment") {
        whereCondition = {
          id: postId,
        };
      } else if (searchOption === "all") {
        whereCondition = {
          [Op.or]: [
            {
              "$User.nickname$": { [Op.like]: `%${searchText}%` },
            },
            {
              content: { [Op.like]: `%${searchText}%` },
            },
            {
              id: { [Op.in]: postIdsFromComments },
            },
          ],
        };
      } else {
        res.status(400).json({ error: "잘못된 searchOption 입니다." });
        return;
      }

      // 게시글 검색
      const searchResults = await Post.findAll({
        where: whereCondition,
        include: getCommonInclude(),
        order: [["createdAt", "DESC"]],
      });

      if (searchResults.length === 0) {
        res.status(404).json("검색 결과를 찾을 수 없습니다.");
        return;
      }

      res.status(200).json(searchResults);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  //----------------------------------------------------------------------

  static async delete(req: Request, res: Response, next: NextFunction) {
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
        const filePath = path.join(__dirname, "../../uploads", filename);

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
  static async commentCreate(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = req.user as User;
      const existingUser = await User.findByPk(user.id, {
        attributes: ["id", "email", "nickname"],
      });

      const postId = req.params.postId;

      const post = await Post.findOne({
        where: { id: postId },
      });
      if (!post) {
        res.status(403).send("존재하지 않는 게시글입니다");
        return;
      }
      const comment = await Comment.create({
        content: req.body.content,
        PostId: parseInt(postId, 10),
        UserId: user.id,
      });

      if (existingUser && post.userIdx !== existingUser.id) {
        const message = `${existingUser.nickname}님이 당신의 게시글에 댓글을 남겼습니다.`;

        await Notification.create({
          UserId: Number(post.userIdx),
          PostId: Number(post.id),
          CommentId: Number(comment.id),
          type: "SYSTEM",
          message: message,
          isRead: false,
        });
      }

      const fullComment = await Comment.findOne({
        where: { id: comment.id },
        include: [
          {
            model: User,
            include: [{ model: Image, attributes: ["src"] }],
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
  static async commentDelete(req: Request, res: Response, next: NextFunction) {
    try {
      const postId = req.params.postId;
      const commentId = req.params.commentId;

      await ReComment.destroy({
        where: {
          CommentId: commentId,
        },
      });

      await Comment.destroy({
        where: { id: commentId /*  UserId: user.id */ },
      });

      await Notification.destroy({
        where: {
          CommentId: commentId,
        },
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

  static async commentUpdate(req: Request, res: Response, next: NextFunction) {
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
  static async ReCommentCreate(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = req.user as User;
      const existingUser = await User.findByPk(user.id, {
        attributes: ["id", "email", "nickname"],
      });

      const post = await Post.findOne({
        where: { id: req.params.postId },
      });
      if (!post) {
        res.status(403).send("존재하지 않는 게시글입니다");
        return;
      }

      const reComment = await ReComment.create({
        PostId: post.id,
        content: req.body.content,
        CommentId: parseInt(req.params.commentId, 10),
        UserId: user.id,
      });

      if (existingUser && post.userIdx !== existingUser.id) {
        const message = `${existingUser.nickname}님이 당신의 게시글에 댓글을 남겼습니다.`;

        await Notification.create({
          UserId: Number(post.userIdx),
          PostId: Number(post.id),
          ReCommentId: Number(reComment.id),
          type: "SYSTEM",
          message: message,
          isRead: false,
        });
      }

      const fullReComment = await ReComment.findOne({
        where: { id: reComment.id },
        include: [
          {
            model: User,
            include: [{ model: Image, attributes: ["src"] }],
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
  static async reCommentDelete(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const postId = req.params.postId;
      const commentId = req.params.commentId;
      const reCommentId = req.params.reCommentId;
      await ReComment.destroy({
        where: { id: reCommentId /*  UserId: user.id */ },
      });

      await Notification.destroy({
        where: {
          ReCommentId: commentId,
        },
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

  static async reCommentUpdate(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
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
  static async postLike(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = req.user as User;
      const post = await Post.findOne({
        where: { id: req.params.postId },
      });
      if (!post) {
        res.status(403).send("게시글이 존재하지 않습니다.");
        return;
      }
      await post.addLikers(user.id);
      res.json({
        PostId: post.id,
        UserId: user.id,
        nickname: user.nickname,
      });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async postUnLike(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = req.user as User;
      const post = await Post.findOne({
        where: { id: req.params.postId },
      });
      if (!post) {
        res.status(403).send("게시글이 존재하지 않습니다.");
        return;
      }
      await post.removeLikers(user.id);
      res.status(200).json({ PostId: post.id, UserId: user.id });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async getLikedPosts(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.query.userId;

      if (!userId) {
        res.status(400).json({ error: "UserId 쿼리 파라미터가 필요합니다" });
        return;
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
        attributes: ["id", "title", "createdAt"],
        order: [["createdAt", "DESC"]],
      });

      res.status(200).json(likedPosts);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  //chat----------------------------------------------
  static async createChatRoom(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const user = req.user as User;

    const { user2Id } = req.body;
    const user1Id = user.id;

    try {
      const user1 = await User.findByPk(user1Id, { include: "User1Rooms" });
      const user2 = await User.findByPk(user2Id, { include: "User2Rooms" });

      if (!user1 || !user2) {
        res.status(404).json({ message: "유저를 찾을 수 없습니다" });
        return;
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
        res.status(200).json(existingChatRoom);
        return;
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

      res.status(201).json(fullChatRoom);
      return;
    } catch (error) {
      res
        .status(500)
        .json({ message: "채팅 방을 생성하는 중에 오류가 발생했습니다." });
      return;
    }
  }

  //get Chat-------------------------------------
  static async getChatMessage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { roomId } = req.query;

      if (!roomId || Array.isArray(roomId)) {
        res.status(404).json({ message: "roomId not found" });
        return;
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
  static async findUserChatRooms(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.query;

      if (!userId || Array.isArray(userId)) {
        res.status(400).json({ message: "Invalid userId" });
        return;
      }

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
  static async readChatMessges(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { messageId } = req.params;

    try {
      const message = await ChatMessage.findByPk(messageId);
      if (!message) {
        res.status(404).json({ error: "Message not found" });
        return;
      }

      message.isRead = true;
      await message.save();

      res.json({ message: "Message marked as read" });
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
  }
}
