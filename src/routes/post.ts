import express from "express";
import { isLoggedIn } from "./middlewares";
import upload from "./multer";
import PostService from "../service/post";

const router = express.Router();

// 모든 게시글 조회
router.get("/posts", PostService.getPosts);

//게시글 상세 조회
router.get("/posts/:postId", PostService.getPost);

// 옵션별 게시글 검색
router.get("/search", PostService.search);

// 사용자의 게시글 조회
router.get("/", PostService.getUserPosts);

// 게시글 댓글 조회
router.get("/comment", PostService.getPostComments);

// 사용자의 댓글 조회
router.get("/user/comment", isLoggedIn, PostService.getUserComments);

// 게시글 작성
router.post("/", isLoggedIn, upload.array("image"), PostService.create);

// 게시글 수정
router.put("/update", isLoggedIn, upload.array("image"), PostService.update);

// 게시글 삭제
router.delete("/:postId", isLoggedIn, PostService.delete);

// 특정 게시글의 이미지 삭제
router.delete("/:postId/images/:filename", isLoggedIn, PostService.imageDelete);

// 댓글 생성
router.post("/:postId/comment", isLoggedIn, PostService.commentCreate);

// 댓글 수정
router.put(
  "/:postId/comment/:commentId",
  isLoggedIn,
  PostService.commentUpdate
);
//해당 댓글의 페이지
router.get("/getCommentPage", PostService.getCommentPage);

// 댓글 삭제
router.delete(
  "/:postId/comment/:commentId",
  isLoggedIn,
  PostService.commentDelete
);

// 대댓글 생성
router.post(
  "/:postId/comment/:commentId/reply",
  isLoggedIn,
  PostService.replyCreate
);

// 대댓글 수정
router.put(
  "/:postId/comment/:commentId/reply/:replyId",
  isLoggedIn,
  PostService.replyUpdate
);

// 대댓글 삭제
router.delete(
  "/:postId/comment/:commentId/reply/:replyId",
  isLoggedIn,
  PostService.replyDelete
);

//좋아요
router.patch("/:postId/like", isLoggedIn, PostService.postLike);
router.patch("/:commentId/commentLike", isLoggedIn, PostService.commentLike);
router.patch(
  "/:commentId/:replyId/replyLike",
  isLoggedIn,
  PostService.replyLike
);

//좋아요 취소
router.delete("/:postId/like", isLoggedIn, PostService.postUnLike);
router.delete("/:commentId/commentLike", isLoggedIn, PostService.commentUnLike);
router.delete(
  "/:commentId/:replyId/replyLike",
  isLoggedIn,
  PostService.replyUnLike
);

// 좋아요 한 게시글 조회
router.get("/likers", isLoggedIn, PostService.getLikedPosts);

// 채팅방 생성
router.post("/chatRoom", isLoggedIn, PostService.createChatRoom);

// 사용자의 채팅방 조회
router.get("/findChat", isLoggedIn, PostService.findUserChatRooms);

// 채팅 메시지 조회
router.get("/getChat", isLoggedIn, PostService.getChatMessage);

// 메시지 읽음 처리
router.patch(
  "/chatMessages/:messageId/read",
  isLoggedIn,
  PostService.readChatMessages
);

// 쿼리 예시 주석
// "https://Localhost:3000/post?idx=3000" => req.query.idx = 3000;
// "https://Localhost:3000/post/35" => req.params.postId = 35;
// "https://Localhost:3000/post?page=1";
// "https://Localhost:3000/post?lastId=32&limit=10" => 32번부터 10개 요청;
// "https://Localhost:3000/post?search=우자&sub=id";

export default router;
