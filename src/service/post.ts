import { Request, Response, NextFunction, CookieOptions } from "express";
import { Post } from "../models/post";
import { User } from "../models/user";
import { Comment } from "../models/comment";
import { Reply } from "../models/reply";
import { Image } from "../models/image";
import fs from "fs";
import path from "path";
import { literal, Op } from "sequelize";
import { ChatRoom } from "../models/chatRoom";
import { ChatMessage } from "../models/chatMessage";
import { Notification } from "../models/notification";
import { Hashtag } from "../models/hashtag";

interface File {
  filename: string;
}

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
        model: User,
        as: "Likers",
        attributes: ["id", "nickname"],
      },
      {
        model: Reply,
        include: [
          {
            model: User,
            include: [{ model: Image, attributes: ["src"] }],
            attributes: ["id", "nickname"],
          },
          {
            model: User,
            as: "Likers",
            attributes: ["id", "nickname"],
          },
        ],
        attributes: ["id", "content", "createdAt"],
      },
    ],
    attributes: ["id", "content", "createdAt"],
  },
  {
    model: Hashtag,
    attributes: ["id", "name"],
    through: { attributes: [] },
  },
];

export default class PostService {
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

  //----------------------------------------------------------------------

  static async getPosts(req: Request, res: Response, next: NextFunction) {
    const { page = 1, limit = 10, sortBy = "recent" } = req.query;

    try {
      const offset = Math.max(0, (Number(page) - 1) * Number(limit)); // offset이 음수일 경우 0으로 설정
      // 기본 정렬 조건: 최신순
      let order: any = [
        ["createdAt", "DESC"], // 최신순 기본값
        [Comment, "createdAt", "ASC"],
        [Comment, Reply, "createdAt", "ASC"],
      ];

      const isPostgres = process.env.NODE_ENV === "production";

      // 인기순
      if (sortBy === "popular") {
        const likeTable = isPostgres ? '"Like"' : "`like`"; // PostgreSQL은 큰따옴표, MySQL은 백틱
        const PostId = isPostgres ? '"PostId"' : "`PostId`";
        const postIdField = isPostgres ? '"Post"."id"' : "`Post`.`id`"; // Post.id에 대한 처리

        order = [
          [
            literal(
              `(SELECT COUNT(*) FROM ${likeTable} WHERE ${likeTable}.${PostId} = ${postIdField})`
            ),
            "DESC", // 좋아요 수 기준 내림차순
          ],
          ["createdAt", "DESC"], // 좋아요 수가 같을 경우 최신순
          [Comment, "createdAt", "ASC"],
          [Comment, Reply, "createdAt", "ASC"],
        ];
      }
      //댓글순
      if (sortBy === "comment") {
        const commentsTable = isPostgres ? '"comments"' : "`comments`"; // PostgreSQL은 큰따옴표, MySQL은 백틱
        const PostId = isPostgres ? '"PostId"' : "`PostId`";
        const postIdField = isPostgres ? '"Post"."id"' : "`Post`.`id`"; // Post.id에 대한 처리

        order = [
          [
            literal(
              `(SELECT COUNT(*) FROM ${commentsTable} WHERE ${commentsTable}.${PostId} = ${postIdField})`
            ),
            "DESC",
          ],
          ["createdAt", "DESC"],
          [Comment, "createdAt", "ASC"],
          [Comment, Reply, "createdAt", "ASC"],
        ];
      }

      //조회순
      if (sortBy === "view") {
        order = [
          ["viewCount", "DESC"],
          [Comment, "createdAt", "ASC"],
          [Comment, Reply, "createdAt", "ASC"],
        ];
      }

      // 데이터 조회
      const posts = await Post.findAll({
        include: getCommonInclude(),
        order,
        limit: Number(limit),
        offset: offset,
      });

      // 전체 포스트 수 카운트
      const totalPosts = await Post.count();

      // 응답 반환
      res.status(200).json({
        posts,
        totalPosts,
      });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  //--------------------------------------------------------------------

  static async getPost(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const postId = Number(req.params.postId);
      const viewedPosts: number[] = JSON.parse(req.cookies.viewedPosts || "[]");

      if (viewedPosts.includes(postId)) {
        console.log("이미 조회한 포스트입니다.");
        const post = await Post.findByPk(postId, {
          include: getCommonInclude(),
        });
        console.log("------------------", post?.viewCount);
        res.status(200).json(post);
        return;
      }

      const post = await Post.findByPk(postId, {
        include: getCommonInclude(),
      });

      const cookieOptions: CookieOptions = {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 만료 시간 1일
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // "None", "Lax", "Strict" 중 하나로 설정
      };

      if (post) {
        await post.increment("viewCount", { by: 1 });

        viewedPosts.push(postId);
        res.cookie("viewedPosts", JSON.stringify(viewedPosts), cookieOptions);
      } else {
        console.log("포스트를 찾을 수 없습니다.");
      }

      const updatedPost = await Post.findByPk(postId, {
        include: getCommonInclude(),
      });

      res.status(200).json(updatedPost);
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
      const { userId } = req.query;

      if (!userId) {
        res.status(400).json({ error: "UserId 쿼리 파라미터가 필요합니다" });
        return;
      }

      // userId를 string으로 강제 변환
      const validUserId = req.query.userId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const offset = (page - 1) * limit;

      const { rows: posts, count } = await Post.findAndCountAll({
        where: { userIdx: validUserId },
        include: [
          {
            model: User,
            include: [{ model: Image, attributes: ["src"] }],
            attributes: ["id", "nickname"],
          },
          { model: Notification, attributes: ["id", "message", "isRead"] },
        ],
        order: [["createdAt", "DESC"]],
        limit: limit,
        offset,
        distinct: true, // 중복된 결과를 제거해서 정확한 count 반환
      });

      res.status(200).json({
        posts,
        hasMore: offset + posts.length < count,
      });
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
      const type = req.query.type;

      if (!userId) {
        res.status(400).json({ error: "UserId 쿼리 파라미터가 필요합니다" });
        return;
      }

      // userId를 string으로 강제 변환
      const validUserId = req.query.userId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const offset = (page - 1) * limit;

      if (type === "comment") {
        const { rows: comments, count: commentsCount } =
          await Comment.findAndCountAll({
            where: {
              UserId: validUserId,
            },
            include: [{ model: Post, attributes: ["id"] }],
            order: [
              ["createdAt", "DESC"], // 댓글을 내림차순으로 정렬
            ],
            limit: limit,
            offset,
            distinct: true,
          });

        res
          .status(200)
          .json({ items: comments, hasMore: page * limit < commentsCount });
      } else {
        const { rows: replies, count: repliesCount } =
          await Reply.findAndCountAll({
            where: {
              UserId: validUserId,
            },
            include: [{ model: Post, attributes: ["id"] }],
            order: [
              ["createdAt", "DESC"], // 댓글을 내림차순으로 정렬
            ],
            limit: limit,
            offset,
            distinct: true,
          });

        res
          .status(200)
          .json({ items: replies, hasMore: page * limit < repliesCount });
      }
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  //---------------------------------------------------------------
  static async getHashtagPosts(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const hashtagName = req.params.hashtagName;

    try {
      const hashtag = await Hashtag.findOne({
        where: { name: hashtagName },
      });

      if (!hashtag) {
        res.json({ hashtagPosts: [], hashtagTotal: 0 });
        return;
      }
      const hashtagPosts = await hashtag.getPosts({
        include: getCommonInclude(),
        order: [["createdAt", "DESC"]],
      });

      res.json({ hashtagPosts, hashtagTotal: hashtagPosts.length });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "서버 오류" });
    }
  }

  //----------------------------------------------------------------------
  static async getPostComments(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { page = 1, limit = 10 } = req.query;
    const postId = Number(req.query.postId);

    if (isNaN(postId) || postId <= 0) {
      res.status(400).json({ error: "postId가 없습니다" });
      return;
    }

    try {
      const offset = Math.max(0, (Number(page) - 1) * Number(limit)); // offset이 음수일 경우 0으로 설정
      const comments = await Comment.findAll({
        where: { PostId: postId },
        include: [
          {
            model: User, // 댓글 작성자
            include: [{ model: Image, attributes: ["src"] }],
            attributes: ["id", "nickname"],
          },
          {
            model: User,
            as: "Likers",
            attributes: ["id", "nickname"],
          },
          {
            model: Reply,
            include: [
              {
                model: User,
                include: [{ model: Image, attributes: ["src"] }],
                attributes: ["id", "nickname"],
              },
              {
                model: User,
                as: "Likers",
                attributes: ["id", "nickname"],
              },
            ],
            attributes: ["id", "content", "createdAt"],
          },
        ],
        limit: Number(limit),
        order: [["createdAt", "ASC"]],
        offset: offset,
      });

      const commentsCount = await Comment.count({ where: { PostId: postId } });
      const repliesCount = await Reply.count({
        where: { PostId: postId },
      });

      const totalComments = commentsCount + repliesCount;

      //톱3 댓글
      const isPostgres = process.env.NODE_ENV === "production";

      const commentLikeTable = isPostgres ? '"CommentLike"' : "`commentlike`";
      const CommentId = isPostgres ? '"CommentId"' : "`CommentId`";
      const commentIdField = isPostgres ? '"Comment"."id"' : "`Comment`.`id`";

      const top3Comments = await Comment.findAll({
        where: { PostId: postId },
        include: [
          {
            model: User, // 댓글 작성자
            include: [{ model: Image, attributes: ["src"] }],
            attributes: ["id", "nickname"],
          },
          {
            model: User,
            as: "Likers",
            attributes: ["id", "nickname"],
          },
          {
            model: Reply,
            include: [
              {
                model: User,
                include: [{ model: Image, attributes: ["src"] }],
                attributes: ["id", "nickname"],
              },
              {
                model: User,
                as: "Likers",
                attributes: ["id", "nickname"],
              },
            ],
            attributes: ["id", "content", "createdAt"],
          },
        ],
        limit: 3,
        order: [
          [
            literal(
              `(SELECT COUNT(*) FROM ${commentLikeTable} WHERE ${commentLikeTable}.${CommentId} = ${commentIdField})`
            ),
            "DESC", // 좋아요 수 기준 내림차순
          ],
          ["createdAt", "DESC"], // 좋아요 수가 같을 경우 최신순
        ],
      });

      res
        .status(200)
        .json({ comments, commentsCount, totalComments, top3Comments });
    } catch (err) {
      console.error(err);
    }
  }
  //---------------------------------------------------------------------
  static async getCommentPage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const commentId = Number(req.query.commentId);
      const postId = Number(req.query.postId);
      const limit = Number(req.query.limit) || 10;

      //해당 댓글의 createdAt 가져오기
      const target = await Comment.findOne({
        where: { id: commentId },
        attributes: ["createdAt"],
      });

      if (!target) {
        res.status(404).json({ error: "댓글을 찾을 수 없습니다." });
        return;
      }

      //해당 댓글보다 먼저 쓴 댓글 개수
      const olderCount = await Comment.count({
        where: {
          PostId: postId,
          createdAt: {
            [Op.lt]: target.createdAt,
          },
        },
      });

      const page = Math.floor(olderCount / limit) + 1;
      res.json({ page });
      return;
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "서버 오류" });
    }
  }
  //---------------------------------------------------------------------
  static async search(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const postId = Number(req.query.postId);
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const searchText = req.query.searchText as string;
      const searchOption = req.query.searchOption as string;
      const offset = Math.max(0, (Number(page) - 1) * Number(limit)); // offset이 음수일 경우 0으로 설정
      const category = req.query.category;
      const commentOrReplyId = Number(req.query.commentOrReplyId);

      // 댓글과 대댓글에서 PostId를 가져오는 함수
      const fetchPostIdsFromComments = async (searchText: string) => {
        try {
          const commentPostIds = await Comment.findAll({
            where: { content: { [Op.like]: `%${searchText}%` } },
            attributes: ["PostId"],
          }).then((comments) => comments.map((comment) => comment.PostId));

          const replyPostIds = await Reply.findAll({
            where: { content: { [Op.like]: `%${searchText}%` } },
            attributes: ["PostId"],
          }).then((replies) => replies.map((reply) => reply.PostId));

          return [...new Set([...commentPostIds, ...replyPostIds])]; // 중복 제거
        } catch (err) {
          console.error("fetchPostIdsFromComments:", err);
          return [];
        }
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
              title: { [Op.like]: `%${searchText}%` },
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
      let searchedPosts = await Post.findAll({
        where: whereCondition,
        include: getCommonInclude(),
        order: [["createdAt", "DESC"]],
      });

      const totalSearchedPosts = searchedPosts.length;
      searchedPosts = searchedPosts.slice(offset, offset + Number(limit));

      if (searchedPosts.length === 0) {
        res.status(404).json(null);
        return;
      }

      let postNum;
      let commentNum = -1;

      const allPosts = await Post.findAll({
        order: [["createdAt", "DESC"]],
      });

      if (postId) {
        const allComments = await Comment.findAll({
          where: { PostId: postId },
          include: [{ model: Reply }],
          order: [["createdAt", "ASC"]],
        });

        postNum = allPosts.findIndex((post) => post.id === postId) + 1;

        if (category === "comment") {
          commentNum =
            allComments.findIndex(
              (comment) => comment.id === commentOrReplyId
            ) + 1;
        } else if (category === "reply") {
          commentNum =
            allComments.findIndex((comment) =>
              comment.Replies.some((reply) => reply.id === commentOrReplyId)
            ) + 1;
        }
      }

      res.status(200).json({
        searchedPosts,
        totalSearchedPosts,
        searchOption,
        postNum,
        commentNum,
      });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  //-------------------------------------------------------------

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as User;
      const files = req.files as Express.Multer.File[];
      const { title, content, hashtags } = req.body;

      let tags = hashtags
        .split(/\s+/)
        .map((tag: string) => tag.trim().replace(/^#/, ""))
        .filter((tag: string) => tag.length > 0);

      tags = [...new Set(tags)];

      if (user.id) {
        const post = await Post.create({
          title,
          content,
          userIdx: user.id,
          viewCount: 0,
        });

        // 이미지 저장
        if (files && files.length > 0) {
          const imagePromises = files.map((file) =>
            Image.create({ src: file.filename })
          );

          const imageResults = await Promise.allSettled(imagePromises);

          const successfulImages = imageResults
            .filter((result) => result.status === "fulfilled")
            .map((result) => result.value);

          await post.addImages(successfulImages);
        }
        // 해시태그 저장 및 연결
        if (tags.length > 0) {
          const tagInstances = await Promise.all(
            tags.map((name: string) =>
              Hashtag.findOrCreate({ where: { name } })
            )
          );

          // findOrCreate 반환값은 [instance, created] 이라서 instance만 꺼냄
          const hashtagModels = tagInstances.map(([tag]) => tag);

          await post.addHashtags(hashtagModels);
        }
        const fullPost = await Post.findOne({
          where: { id: post.id }, //게시글 쓰면 자동으로 id 생성
          include: getCommonInclude(),
        });
        res.status(200).json(fullPost);
      }
    } catch (err) {
      console.error(err);
      next(err); //status 500임
    }
  }

  //------------------------------------------------------------------------
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, content, postId, hashtags } = req.body;
      const files = req.files as File[];

      await Post.update(
        {
          title,
          content,
        },
        {
          where: {
            id: parseInt(postId),
            /*    userIdx: user.id, */
          },
        }
      );

      const post = await Post.findOne({
        where: { id: parseInt(postId) },
        include: [
          {
            model: Image,
          },
        ],
      });

      if (hashtags !== undefined) {
        let tags = hashtags
          .split(/\s+/)
          .map((tag: string) => tag.trim().replace(/^#/, ""))
          .filter((tag: string) => tag.length > 0);

        tags = [...new Set(tags)];

        if (tags.length > 0) {
          const tagInstances = await Promise.all(
            tags.map((name: string) =>
              Hashtag.findOrCreate({ where: { name } })
            )
          );
          const hashtagModels = tagInstances.map(([tag]) => tag);

          // 기존 연결 갱신
          await post?.setHashtags(hashtagModels);
        } else {
          await post?.setHashtags([]);
        }
      }

      const newImagePaths = files.map((file) => file.filename);
      if (newImagePaths) {
        const images = await Promise.all(
          newImagePaths.map((filename: string) =>
            Image.create({ src: filename })
          )
        );

        await post?.addImages(images); //addImages는 Post 모델 관계 설정에서 나온 함수
      }

      const updatedPost = await Post.findOne({
        where: { id: post?.id }, //게시글 쓰면 자동으로 id 생성
        include: getCommonInclude(),
      });
      res.status(200).json({
        PostId: parseInt(postId),
        updatedPost,
      });
    } catch (err) {
      console.log(err);
      next(err);
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

      await Reply.destroy({
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
        include: {
          model: User,
          attributes: ["nickname"],
        },
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
        const message = `${existingUser.nickname}님이 ${post.User.nickname}님의 게시글에 댓글을 남겼습니다.`;

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
            model: Reply,
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

      await Reply.destroy({
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
  static async replyCreate(
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
        include: { model: User, attributes: ["nickname"] },
      });
      if (!post) {
        res.status(403).send("존재하지 않는 게시글입니다");
        return;
      }

      const reply = await Reply.create({
        PostId: post.id,
        content: req.body.content,
        CommentId: parseInt(req.params.commentId, 10),
        UserId: user.id,
      });

      if (existingUser && post.userIdx !== existingUser.id) {
        const message = `${existingUser.nickname}님이 ${post.User.nickname}님의 게시글에 댓글을 남겼습니다.`;

        await Notification.create({
          UserId: Number(post.userIdx),
          PostId: Number(post.id),
          ReplyId: Number(reply.id),
          type: "SYSTEM",
          message: message,
          isRead: false,
        });
      }

      const fullReply = await Reply.findOne({
        where: { id: reply.id },
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
      res.status(201).json(fullReply);
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  //----------------------------------------------------------------------
  static async replyDelete(req: Request, res: Response, next: NextFunction) {
    try {
      const postId = req.params.postId;
      const commentId = req.params.commentId;
      const replyId = req.params.replyId;
      await Reply.destroy({
        where: { id: replyId /*  UserId: user.id */ },
      });

      await Notification.destroy({
        where: {
          ReplyId: replyId,
        },
      });

      res.status(200).json({
        PostId: parseInt(postId, 10), //reducer의 action.data. 값
        CommentId: parseInt(commentId, 10),
        ReplyId: parseInt(replyId, 10),
      });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  //----------------------------------------------------------------------

  static async replyUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const postId = req.params.postId;
      const commentId = req.params.commentId;
      const replyId = req.params.replyId;
      await Reply.update(
        {
          content: req.body.content,
        },
        {
          where: {
            id: replyId,
          },
        }
      );
      res.status(200).json({
        PostId: parseInt(postId, 10),
        CommentId: parseInt(commentId, 10),
        ReplyId: parseInt(replyId, 10),
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

      const exitingUser = await User.findByPk(user.id);

      const post = await Post.findOne({
        where: { id: req.params.postId },
      });
      if (!post) {
        res.status(403).send("게시글이 존재하지 않습니다.");
        return;
      }

      await post.addLikers(user.id);
      res.json({
        UserId: user.id,
        nickname: exitingUser?.nickname,
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
  static async commentLike(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = req.user as User;

      const exitingUser = await User.findByPk(user.id);

      const comment = await Comment.findOne({
        where: { id: req.params.commentId },
      });
      if (!comment) {
        res.status(403).send("게시글이 존재하지 않습니다.");
        return;
      }

      await comment.addLikers(user.id);
      res.json({
        UserId: user.id,
        CommentId: comment.id,
        nickname: exitingUser?.nickname,
      });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async commentUnLike(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = req.user as User;
      const comment = await Comment.findOne({
        where: { id: req.params.commentId },
      });
      if (!comment) {
        res.status(403).send("게시글이 존재하지 않습니다.");
        return;
      }
      await comment.removeLikers(user.id);
      res.status(200).json({ CommentId: comment.id, UserId: user.id });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async replyLike(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = req.user as User;
      const commentId = Number(req.params.commentId);

      const exitingUser = await User.findByPk(user.id);

      const reply = await Reply.findOne({
        where: { id: req.params.replyId },
      });
      if (!reply) {
        res.status(403).send("게시글이 존재하지 않습니다.");
        return;
      }

      await reply.addLikers(user.id);
      res.json({
        CommentId: commentId,
        ReplyId: reply.id,
        UserId: user.id,
        nickname: exitingUser?.nickname,
      });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async replyUnLike(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = req.user as User;
      const commentId = Number(req.params.commentId);
      const reply = await Reply.findOne({
        where: { id: req.params.replyId },
      });
      if (!reply) {
        res.status(403).send("게시글이 존재하지 않습니다.");
        return;
      }
      await reply.removeLikers(user.id);
      res.status(200).json({
        CommentId: commentId,
        ReplyId: reply.id,
        UserId: user.id,
      });
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
      const { userId } = req.query;

      if (!userId) {
        res.status(400).json({ error: "UserId 쿼리 파라미터가 필요합니다" });
        return;
      }
      // userId를 string으로 강제 변환
      const validUserId = req.query.userId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const offset = (page - 1) * limit;

      const { rows: likedPosts, count } = await Post.findAndCountAll({
        include: [
          {
            model: User,
            as: "Likers",
            where: { id: validUserId },
            attributes: ["id", "email", "nickname"],
          },
        ],
        attributes: ["id", "title", "createdAt"],
        order: [["createdAt", "DESC"]],
        limit: limit,
        offset,
        distinct: true, // 중복된 결과를 제거해서 정확한 count 반환
      });

      res
        .status(200)
        .json({ likedPosts, hasMore: offset + likedPosts.length < count });
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
  static async readChatMessages(
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
